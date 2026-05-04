#!/usr/bin/env node
// Blooming Rot 2 — release builder
//
// Produces two artifacts in dist/ for a GitHub release:
//   1. module.json  — the manifest, with `download` rewritten to point at the
//                     specific version's zip URL (so Foundry installs the
//                     correct version when this manifest is used).
//   2. module.zip   — a slimmed module archive Foundry can install directly.
//                     Contains everything the runtime needs: module.json,
//                     packs/ (compiled LevelDB), assets/ (excluding _raw),
//                     README.md.
//                     Excludes: source JSONs (packs/_source/), scripts/,
//                     node_modules/, .git/, .gitignore, package.json, etc.
//
// Usage:
//   node scripts/build-release.mjs           # uses version from module.json
//   node scripts/build-release.mjs 0.6.0     # explicit version override
//
// The release-attached module.json's `download` URL points to:
//   https://github.com/<owner>/<repo>/releases/download/v<version>/module.zip
//
// The repo-root module.json's `manifest` URL stays pointing to:
//   https://github.com/<owner>/<repo>/releases/latest/download/module.json
// so Foundry can check for updates against the latest release.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DIST = path.join(ROOT, "dist");

// Read the module manifest.
const manifestPath = path.join(ROOT, "module.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Resolve version: argv override > manifest version.
const version = process.argv[2] || manifest.version;
if (!version) {
  console.error("No version found in module.json and no override given.");
  process.exit(1);
}

// Repo coordinates from manifest.url.
const repoMatch = manifest.url?.match(/github\.com\/([^/]+)\/([^/]+)/);
if (!repoMatch) {
  console.error("Cannot parse owner/repo from module.json `url` field.");
  process.exit(1);
}
const [, owner, repo] = repoMatch;

console.log(`Building release artifacts for ${manifest.id} v${version}`);
console.log(`  GitHub: ${owner}/${repo}`);
console.log(`  Output: ${DIST}/`);

// Clean dist/ and recreate.
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// === Step 1: write the release manifest ===
const releaseManifest = { ...manifest };
releaseManifest.version = version;
releaseManifest.download = `https://github.com/${owner}/${repo}/releases/download/v${version}/module.zip`;
// `manifest` URL stays as latest-release link (Foundry checks this for updates).
fs.writeFileSync(
  path.join(DIST, "module.json"),
  JSON.stringify(releaseManifest, null, 2) + "\n"
);
console.log(`  ✓ dist/module.json  (download → v${version}/module.zip)`);

// === Step 2: build the module.zip ===
// Items to include in the zip (relative to repo root):
//   module.json (the release-version one we just wrote)
//   packs/        (compiled LevelDB; excludes packs/_source which is dev-only)
//   assets/       (excluding _raw which is dev-only)
//   README.md
//
// The release zip is what Foundry actually installs. It must NOT contain
// the source JSON, scripts, node_modules, or .git/.

const stagingDir = path.join(DIST, "_staging");
fs.mkdirSync(stagingDir, { recursive: true });

// Copy module.json (the release version)
fs.copyFileSync(
  path.join(DIST, "module.json"),
  path.join(stagingDir, "module.json")
);

// Copy packs/ but EXCLUDE packs/_source/
const packsSrc = path.join(ROOT, "packs");
const packsDst = path.join(stagingDir, "packs");
copyDirFiltered(packsSrc, packsDst, (relPath) => !relPath.startsWith("_source"));

// Copy assets/ but EXCLUDE assets/_raw/
const assetsSrc = path.join(ROOT, "assets");
const assetsDst = path.join(stagingDir, "assets");
copyDirFiltered(assetsSrc, assetsDst, (relPath) => !relPath.startsWith("_raw"));

// Copy README.md
fs.copyFileSync(path.join(ROOT, "README.md"), path.join(stagingDir, "README.md"));

// Optional: copy LICENSE if it exists
const licensePath = path.join(ROOT, "LICENSE");
if (fs.existsSync(licensePath)) {
  fs.copyFileSync(licensePath, path.join(stagingDir, "LICENSE"));
}

// Zip the staging dir.
const zipPath = path.join(DIST, "module.zip");
// Use the system `zip` so the archive is a clean Foundry-readable zip.
// We zip from inside _staging so paths inside the archive start with the
// module's contents (module.json at the archive root), which is what Foundry
// expects when a user installs from a manifest URL.
execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: stagingDir });
console.log(`  ✓ dist/module.zip   (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(1)} MB)`);

// Clean up staging.
fs.rmSync(stagingDir, { recursive: true, force: true });

// === Step 3: print release-creation hints ===
console.log("");
console.log("Release artifacts ready in dist/.");
console.log("");
console.log("Next steps:");
console.log(`  1. git tag v${version} && git push --tags`);
console.log(`  2. gh release create v${version} dist/module.json dist/module.zip \\`);
console.log(`       --title "Blooming Rot 2 v${version}" \\`);
console.log(`       --notes-file <release-notes.md>`);
console.log("");
console.log("Or with auto-generated notes:");
console.log(`  gh release create v${version} dist/module.json dist/module.zip --generate-notes`);
console.log("");
console.log("Foundry install URL (paste into Foundry's Install Module field):");
console.log(`  https://github.com/${owner}/${repo}/releases/latest/download/module.json`);

// === helpers ===

function copyDirFiltered(src, dst, filterFn = () => true, relPath = "") {
  const stat = fs.statSync(src);
  if (!stat.isDirectory()) {
    fs.copyFileSync(src, dst);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const subSrc = path.join(src, entry);
    const subDst = path.join(dst, entry);
    const subRel = relPath ? `${relPath}/${entry}` : entry;
    if (!filterFn(subRel)) continue;
    copyDirFiltered(subSrc, subDst, filterFn, subRel);
  }
}
