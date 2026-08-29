// Normalise actor senses to the dnd5e 5.3+ schema.
//
// dnd5e 5.3 moved the sense ranges into a nested object:
//
//   before: system.attributes.senses = { darkvision, blindsight, tremorsense, truesight, units, special }
//   after:  system.attributes.senses = { ranges: { darkvision, blindsight, tremorsense, truesight }, units, special }
//
// Reading the old path still works but logs
//   'senses.darkvision has moved to "senses.ranges.darkvision". Deprecated since Version DnD5e 5.3'
// on every actor load, and the shim is slated for removal in dnd5e 6.1.
//
// The generator scripts clone their stat blocks from the Monster Manual module's
// source JSON, so whatever schema THAT module ships is what a freshly generated
// actor inherits. Run this after any actor regeneration.
//
// Idempotent: actors already on the new shape are left byte-identical.
//
//   node scripts/migrate-senses-schema.mjs [--dry]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE = path.join(ROOT, "packs", "_source");
const RANGE_KEYS = ["darkvision", "blindsight", "tremorsense", "truesight"];
const DRY = process.argv.includes("--dry");

function actorFiles() {
  const out = [];
  for (const dir of fs.readdirSync(SOURCE)) {
    if (!dir.includes("actors")) continue;
    const full = path.join(SOURCE, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith(".json")) out.push(path.join(full, f));
    }
  }
  return out.sort();
}

let migrated = 0, already = 0, skipped = 0, unitsFixed = 0;

for (const file of actorFiles()) {
  const raw = fs.readFileSync(file, "utf8");
  let doc;
  try { doc = JSON.parse(raw); } catch { skipped++; continue; }
  const senses = doc?.system?.attributes?.senses;
  if (!senses || typeof senses !== "object") { skipped++; continue; }

  let changed = false;

  if (!("ranges" in senses)) {
    const ranges = {};
    for (const k of RANGE_KEYS) {
      if (k in senses) { ranges[k] = senses[k]; delete senses[k]; }
    }
    // ranges first, then whatever else the old block carried (units, special)
    doc.system.attributes.senses = { ranges, ...senses };
    changed = true;
    migrated++;
  } else {
    already++;
  }

  // A stored range with no units renders without one. Only touch actors that
  // actually have a sense; leave the empty ones alone.
  const s = doc.system.attributes.senses;
  const hasRange = Object.values(s.ranges ?? {}).some(v => (v ?? 0) > 0);
  if (hasRange && !s.units) { s.units = "ft"; changed = true; unitsFixed++; }

  if (changed && !DRY) {
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  }
}

console.log(
  `${DRY ? "[dry] " : ""}senses schema: ${migrated} migrated, ${already} already on 5.3 shape, ` +
  `${unitsFixed} units set to ft, ${skipped} skipped (not actors).`
);
