#!/usr/bin/env node
// Blooming Rot 2 — referenced-asset collector
//
// Scans everything that ships (packs/_source/**.json → compiled packs,
// module.json, README.md) for asset paths belonging to THIS module, and
// returns the set of assets/ paths the release zip must contain.
//
// Handles:
//   - "modules/blooming-rot-2/assets/..." absolute refs
//   - bare "assets/..." refs (ignoring other modules' paths)
//   - URL-encoded paths (%20 etc.)
//   - dynamic template refs: the pressure-clock macro builds
//     `${MOD_PATH}/pressure-clock-phase2-${state}.png` at runtime, so all
//     of assets/ui/ is included wholesale
//   - world-referenced keep-list: assets/tokens/party/, assets/portraits/party/
//     are used by the live world's PC actors (not by module content) and must
//     keep shipping so module updates never blank the players' tokens
//   - previously released refs: any asset that a past release's content
//     referenced (every v* tag) keeps shipping while it is still on disk.
//     Journals, actors and scenes imported into a world keep their image paths
//     after the module updates, so retiring an image from module content must
//     never delete it from installs. (v1.9.1 dropped maps/fallow-ford.png when
//     the Fallow Ford map was replaced, and world copies of that journal page
//     lost their image.)
//
// Usage:
//   node scripts/collect-referenced-assets.mjs          # print list
//   import { collectReferencedAssets } from "./collect-referenced-assets.mjs"

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// Directories included wholesale (dynamic refs / world-referenced art).
const WHOLESALE_DIRS = ["assets/ui", "assets/tokens/party", "assets/portraits/party"];

const PREFIXED = /modules\/blooming-rot-2\/(assets\/[A-Za-z0-9_\-./%]+?\.[A-Za-z0-9]{2,4})/g;
const BARE = /(?<![/\w])(assets\/[A-Za-z0-9_\-./%]+?\.[A-Za-z0-9]{2,4})/g;

// Add this module's asset paths found in `txt` to `refs`. Current files and
// released history both go through here, so they follow exactly the same rules.
function scanText(txt, refs) {
  for (const m of txt.matchAll(PREFIXED)) refs.add(decodeURIComponent(m[1]));
  for (const m of txt.matchAll(BARE)) {
    // Skip refs that belong to another module (modules/<other>/assets/...).
    const ctx = txt.slice(Math.max(0, m.index - 60), m.index);
    if (/modules\/[A-Za-z0-9_-]+\/$/.test(ctx)) continue;
    refs.add(decodeURIComponent(m[1]));
  }
}

// Every asset path any released version (v* tag) referenced in its shipping
// content: one `git grep` for the lines that mention assets/ across all tags,
// then the same scanner as current files. Without git (e.g. building from an
// export) this warns and returns nothing.
function previouslyReleasedRefs() {
  let tags;
  try {
    tags = execFileSync("git", ["--no-optional-locks", "tag", "-l", "v*"], { cwd: ROOT, encoding: "utf8" })
      .split("\n").filter(Boolean);
  } catch {
    console.warn("collect-referenced-assets: git unavailable; assets from earlier releases are not being kept");
    return [];
  }
  if (!tags.length) return [];
  let out;
  try {
    out = execFileSync("git", ["--no-optional-locks", "grep", "-h", "-I", "-F", "assets/",
      ...tags, "--", "packs/_source", "module.json", "README.md"],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
  } catch (err) {
    if (err.status === 1) return [];   // git grep exits 1 when nothing matches
    throw err;
  }
  const refs = new Set();
  for (const line of out.split("\n")) if (line) scanText(line, refs);
  return [...refs];
}

export function collectReferencedAssets() {
  const refs = new Set();

  // Gather scan files: all source JSONs + module.json + README.
  const scanFiles = ["module.json", "README.md"].map((f) => path.join(ROOT, f));
  const srcRoot = path.join(ROOT, "packs", "_source");
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json")) scanFiles.push(p);
    }
  })(srcRoot);

  for (const file of scanFiles) {
    if (!fs.existsSync(file)) continue;
    scanText(fs.readFileSync(file, "utf8"), refs);
  }

  // Wholesale dirs.
  for (const rel of WHOLESALE_DIRS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name !== ".DS_Store")
          refs.add(path.relative(ROOT, p).split(path.sep).join("/"));
      }
    })(abs);
  }

  // Assets earlier releases referenced. Kept while they exist on disk; one that
  // has since been deleted from the repo can't ship and isn't an error here.
  const retained = [];
  for (const rel of previouslyReleasedRefs()) {
    if (refs.has(rel) || rel.startsWith("assets/_raw/") || rel.startsWith("assets/_reference/")) continue;
    if (fs.existsSync(path.join(ROOT, rel))) { refs.add(rel); retained.push(rel); }
  }

  // Drop anything under dev-only dirs, and verify existence.
  const out = [];
  const missing = [];
  for (const rel of [...refs].sort()) {
    if (rel.startsWith("assets/_raw/") || rel.startsWith("assets/_reference/")) continue;
    if (fs.existsSync(path.join(ROOT, rel))) out.push(rel);
    else missing.push(rel);
  }
  return { referenced: out, missing, retained: retained.sort() };
}

// CLI entry point.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { referenced, missing, retained } = collectReferencedAssets();
  for (const p of referenced) console.log(p);
  if (missing.length) {
    console.error(`\nWARNING — ${missing.length} referenced asset(s) missing on disk:`);
    for (const p of missing) console.error("  " + p);
    process.exitCode = 1;
  }
  console.error(`\n${referenced.length} referenced assets` + (retained.length ? `, ${retained.length} of them kept only because an earlier release used them:` : "."));
  for (const p of retained) console.error("  " + p);
}
