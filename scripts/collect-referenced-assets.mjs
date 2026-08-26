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
//
// Usage:
//   node scripts/collect-referenced-assets.mjs          # print list
//   import { collectReferencedAssets } from "./collect-referenced-assets.mjs"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// Directories included wholesale (dynamic refs / world-referenced art).
const WHOLESALE_DIRS = ["assets/ui", "assets/tokens/party", "assets/portraits/party"];

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

  const prefixed = /modules\/blooming-rot-2\/(assets\/[A-Za-z0-9_\-./%]+?\.[A-Za-z0-9]{2,4})/g;
  const bare = /(?<![/\w])(assets\/[A-Za-z0-9_\-./%]+?\.[A-Za-z0-9]{2,4})/g;

  for (const file of scanFiles) {
    if (!fs.existsSync(file)) continue;
    const txt = fs.readFileSync(file, "utf8");
    for (const m of txt.matchAll(prefixed)) refs.add(decodeURIComponent(m[1]));
    for (const m of txt.matchAll(bare)) {
      // Skip refs that belong to another module (modules/<other>/assets/...).
      const ctx = txt.slice(Math.max(0, m.index - 60), m.index);
      if (/modules\/[A-Za-z0-9_-]+\/$/.test(ctx)) continue;
      refs.add(decodeURIComponent(m[1]));
    }
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

  // Drop anything under dev-only dirs, and verify existence.
  const out = [];
  const missing = [];
  for (const rel of [...refs].sort()) {
    if (rel.startsWith("assets/_raw/") || rel.startsWith("assets/_reference/")) continue;
    if (fs.existsSync(path.join(ROOT, rel))) out.push(rel);
    else missing.push(rel);
  }
  return { referenced: out, missing };
}

// CLI entry point.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { referenced, missing } = collectReferencedAssets();
  for (const p of referenced) console.log(p);
  if (missing.length) {
    console.error(`\nWARNING — ${missing.length} referenced asset(s) missing on disk:`);
    for (const p of missing) console.error("  " + p);
    process.exitCode = 1;
  }
  console.error(`\n${referenced.length} referenced assets.`);
}
