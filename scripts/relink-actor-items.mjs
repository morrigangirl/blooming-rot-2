#!/usr/bin/env node
// Blooming Rot 2 — build-time item relinker.
//
// Reads the extracted PHB / DMG / MM JSON in /tmp/br2-source-extract/
// (created by scripts/_extract-source-packs.mjs), and walks every BR2
// actor source JSON. For each item that name-matches a real PHB/DMG/MM
// item, replaces the bundled stub with the real document data while
// preserving the actor's existing item _id and _key.
//
// Items without a name match (custom Yeomanry gear, BR2 NPC features,
// regional coats, signet rings, etc.) are kept verbatim.
//
// Usage:
//   node scripts/relink-actor-items.mjs --dry-run   (default: only report)
//   node scripts/relink-actor-items.mjs --apply     (write changes)
//
// PHB descriptions ship empty (Foundry resolves them at runtime via
// content references), so copying the full item is fine — we are not
// redistributing prose text.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_ROOT = "/tmp/br2-source-extract";
const ACTOR_PHASES = [
  "phase-1-actors",
  "phase-2-actors",
  "phase-3-actors",
  "phase-4-actors",
  "phase-5-actors"
];

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// === Source pack registry ===
//
// Each entry maps to the extract dir built by _extract-source-packs.mjs.
// The `compendiumName` is the LIVE pack name in the user's world, used
// to construct the Compendium UUID we put in flags.core.sourceId and
// _stats.compendiumSource.

const SOURCES = [
  { module: "dnd-players-handbook", pack: "equipment" },
  { module: "dnd-players-handbook", pack: "spells" },
  { module: "dnd-players-handbook", pack: "feats" },
  { module: "dnd-players-handbook", pack: "classes" },
  { module: "dnd-players-handbook", pack: "origins" },
  { module: "dnd-dungeon-masters-guide", pack: "equipment" },
  { module: "dnd-dungeon-masters-guide", pack: "features" },
  { module: "dnd-dungeon-masters-guide", pack: "bastions" },
  { module: "dnd-monster-manual", pack: "features" }
];

// Priority order for tie-breaking when the same name appears in multiple packs.
const PACK_PRIORITY_ORDER = [
  "dnd-players-handbook/equipment",
  "dnd-players-handbook/spells",
  "dnd-players-handbook/classes",
  "dnd-players-handbook/feats",
  "dnd-players-handbook/origins",
  "dnd-monster-manual/features",
  "dnd-dungeon-masters-guide/equipment",
  "dnd-dungeon-masters-guide/features",
  "dnd-dungeon-masters-guide/bastions"
];

// === Name normalization ===

function normalize(s) {
  if (!s) return "";
  let n = String(s).toLowerCase();
  // Iteratively strip parentheticals (handles nested cases like "Sneak Attack (4d6 (14))")
  let prev;
  do {
    prev = n;
    n = n.replace(/\s*\([^()]*\)\s*/g, " ");
  } while (n !== prev);
  return n
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Aliases applied AFTER normalize on the BR2 item side.
// Maps "what BR2 calls it (normalized)" → "what PHB calls it (normalized)".
const NAME_ALIASES = new Map([
  // Crossbow ammunition
  ["crossbow bolts", "bolts"],
  // Eldritch Invocation prefix — BR2 stores them as "Eldritch Invocation: X"
  ["eldritch invocation agonizing blast", "agonizing blast"],
  ["eldritch invocation devil s sight", "devil s sight"],
  ["eldritch invocation mask of many faces", "mask of many faces"],
  ["eldritch invocation misty visions", "misty visions"],
  // Trina's combined feat name → drop spell suffix to match PHB's class feature
  ["mystic arcanum 5th level hold monster", "mystic arcanum"]
]);

function aliasNormalize(s) {
  const n = normalize(s);
  return NAME_ALIASES.get(n) ?? n;
}

// === Build the source index ===

console.log("Building PHB/DMG/MM source index...");

const nameIndex = new Map(); // normalized-name -> [{ moduleId, packName, doc }]

for (const { module, pack } of SOURCES) {
  const dir = path.join(SOURCE_ROOT, module, pack);
  if (!fs.existsSync(dir)) {
    console.warn(`  missing: ${dir}`);
    continue;
  }
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const key = normalize(doc.name);
    if (!key) continue;
    if (!nameIndex.has(key)) nameIndex.set(key, []);
    nameIndex.get(key).push({
      moduleId: module,
      packName: pack,
      doc
    });
    count++;
  }
  console.log(`  ${module}/${pack}: ${count} entries`);
}

console.log(`Index: ${nameIndex.size} unique normalized names\n`);

// === Match function ===

function priority(moduleId, packName) {
  const key = `${moduleId}/${packName}`;
  const i = PACK_PRIORITY_ORDER.indexOf(key);
  return i < 0 ? 99 : i;
}

function matchItem(item) {
  const want = aliasNormalize(item.name);
  if (!want) return null;
  const candidates = nameIndex.get(want) ?? [];
  if (candidates.length === 0) return null;
  // Prefer same item type (weapon→weapon, spell→spell, feat→feat, equipment→equipment)
  const sameType = candidates.filter(c => c.doc.type === item.type);
  const pool = sameType.length ? sameType : candidates;
  // Tiebreak by pack priority
  const ranked = [...pool].sort(
    (a, b) => priority(a.moduleId, a.packName) - priority(b.moduleId, b.packName)
  );
  return ranked[0];
}

// === Walk BR2 actors ===

const report = {
  totalItems: 0,
  matched: 0,
  skipped: 0,
  matchedDetails: [],
  skippedDetails: [],
  ambiguous: []
};

const actorWrites = []; // [{ path, json }]

for (const phase of ACTOR_PHASES) {
  const dir = path.join(ROOT, "packs", "_source", phase);
  if (!fs.existsSync(dir)) continue;

  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(dir, file);
    const actor = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (!actor.items || actor.items.length === 0) continue;

    const newItems = [];
    for (const item of actor.items) {
      report.totalItems++;
      const match = matchItem(item);
      if (!match) {
        report.skipped++;
        report.skippedDetails.push(`${phase}/${actor.name}: ${item.type} "${item.name}"`);
        newItems.push(item);
        continue;
      }

      // Build the new item: real PHB doc, but with the actor's _id and _key.
      const realDoc = match.doc;
      const realUuid = `Compendium.${match.moduleId}.${match.packName}.Item.${realDoc._id}`;

      const newItem = {
        // Order matches what the existing actor JSONs use for diff-friendliness
        _key: item._key,
        _id: item._id,
        name: realDoc.name,
        type: realDoc.type,
        img: realDoc.img,
        system: realDoc.system,
        effects: realDoc.effects ?? [],
        folder: item.folder ?? realDoc.folder ?? null,
        sort: item.sort ?? 0,
        ownership: item.ownership ?? { default: 0 },
        flags: {
          ...(realDoc.flags ?? {}),
          core: {
            ...((realDoc.flags && realDoc.flags.core) || {}),
            sourceId: realUuid
          }
        },
        _stats: {
          ...(realDoc._stats ?? {}),
          compendiumSource: realUuid,
          duplicateSource: null,
          coreVersion: "13.351",
          systemId: "dnd5e",
          systemVersion: "5.3.0"
        }
      };

      // Quantity preservation: if BR2 had a quantity (e.g. 10 bolts, 20 bolts),
      // keep it on the new item.
      if (item.system && typeof item.system.quantity === "number" &&
          newItem.system && typeof newItem.system.quantity === "number") {
        newItem.system = { ...newItem.system, quantity: item.system.quantity };
      }

      // Equipped state: if BR2 marked the item as equipped, preserve that.
      if (item.system?.equipped !== undefined &&
          newItem.system && "equipped" in newItem.system) {
        newItem.system = { ...newItem.system, equipped: item.system.equipped };
      }

      // Spell prep: if BR2 had a prepared/known state for spells, preserve it.
      if (item.type === "spell" && item.system?.preparation && newItem.system) {
        newItem.system = { ...newItem.system, preparation: item.system.preparation };
      }

      newItems.push(newItem);
      report.matched++;
      report.matchedDetails.push(
        `${phase}/${actor.name}: "${item.name}" → ${match.moduleId}/${match.packName} "${realDoc.name}" [${realDoc._id}]`
      );
    }

    if (newItems.some((it, i) => it !== actor.items[i])) {
      actorWrites.push({ path: filePath, json: { ...actor, items: newItems } });
    }
  }
}

// === Report ===

console.log("=".repeat(70));
console.log(`Total items: ${report.totalItems}`);
console.log(`  Matched:   ${report.matched}`);
console.log(`  Skipped:   ${report.skipped}`);
console.log(`Files to update: ${actorWrites.length}`);
console.log("=".repeat(70));

if (VERBOSE || !APPLY) {
  console.log("\n--- MATCHED ---");
  for (const m of report.matchedDetails) console.log("  ✓", m);
  console.log("\n--- SKIPPED (kept as BR2 stubs) ---");
  for (const s of report.skippedDetails) console.log("  -", s);
}

// === Write changes ===

if (APPLY) {
  console.log("\nWriting actor source JSONs...");
  for (const { path: p, json } of actorWrites) {
    fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n");
    if (VERBOSE) console.log(`  wrote ${path.relative(ROOT, p)}`);
  }
  console.log(`\n✓ Wrote ${actorWrites.length} actor JSONs.`);
} else {
  console.log("\n(dry run — pass --apply to write changes)");
}
