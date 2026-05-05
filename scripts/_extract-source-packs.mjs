#!/usr/bin/env node
// Read-only utility: extract installed PHB/DMG/MM Item-type compendium
// packs into a temp JSON tree we can then index.
//
// Output: /tmp/br2-source-extract/<moduleId>/<packName>/*.json
//
// The packs are read straight from the user's local Foundry data dir
// (/Volumes/Creative/FoundryVTT/Data/modules/...). Nothing in those
// packs is modified.

import fs from "node:fs";
import path from "node:path";
import { extractPack } from "@foundryvtt/foundryvtt-cli";

const FOUNDRY_DATA = "/Volumes/Creative/FoundryVTT/Data";
const OUT = "/tmp/br2-source-extract";

// Only Item-type packs that could plausibly contain something a BR2 actor
// has on it. We deliberately skip Actor packs, JournalEntry packs, RollTable
// packs, and Scene packs.
const SOURCES = [
  { module: "dnd-players-handbook", pack: "equipment" },   // weapons, armor, gear
  { module: "dnd-players-handbook", pack: "spells" },      // all spells
  { module: "dnd-players-handbook", pack: "feats" },       // feat-type items
  { module: "dnd-players-handbook", pack: "classes" },     // class features (Cunning Action, Sneak Attack, etc.)
  { module: "dnd-players-handbook", pack: "origins" },     // species/background features
  { module: "dnd-dungeon-masters-guide", pack: "equipment" }, // magic items
  { module: "dnd-dungeon-masters-guide", pack: "features" },  // DMG features
  { module: "dnd-dungeon-masters-guide", pack: "bastions" },
  { module: "dnd-monster-manual", pack: "features" },      // NPC features (Multiattack, Parry, etc.)
  // NPC actor stat blocks — used as templates when generating BR2 named-NPC actors
  { module: "dnd-monster-manual", pack: "actors" },
  { module: "dnd-players-handbook", pack: "actors" },
  { module: "dnd-dungeon-masters-guide", pack: "actors" }
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let totalDocs = 0;
for (const { module, pack } of SOURCES) {
  const src = path.join(FOUNDRY_DATA, "modules", module, "packs", pack);
  const dst = path.join(OUT, module, pack);
  if (!fs.existsSync(src)) {
    console.warn(`MISSING: ${src}`);
    continue;
  }
  fs.mkdirSync(dst, { recursive: true });
  await extractPack(src, dst, { yaml: false, log: false });
  const count = fs.readdirSync(dst).filter(f => f.endsWith(".json")).length;
  totalDocs += count;
  console.log(`  ${module}/${pack}: ${count} docs`);
}
console.log(`\nTotal: ${totalDocs} documents extracted to ${OUT}`);
