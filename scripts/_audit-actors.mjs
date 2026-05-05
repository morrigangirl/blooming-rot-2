#!/usr/bin/env node
// Audit BR2 actor source JSONs for mechanical issues.
// Read-only — produces a report of things to fix.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PHASES = [
  "phase-1-actors", "phase-2-actors", "phase-3-actors",
  "phase-4-actors", "phase-5-actors"
];

const issues = [];

for (const phase of PHASES) {
  const dir = path.join(ROOT, "packs", "_source", phase);
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) continue;
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const tag = `${phase}/${j.name}`;

    // ---- top-level checks ----
    if (j.type !== "npc") issues.push(`${tag}: actor.type is "${j.type}", expected "npc"`);

    const a = j.system?.attributes || {};
    const ab = j.system?.abilities || {};

    // ---- weapon proficient/equipped ----
    for (const item of j.items || []) {
      if (item.type === "weapon") {
        // MM features-pack "weapons" (spell-attack-as-weapon items like Arcane
        // Burst on NPC casters) don't carry an `equipped` field by design.
        // They're always-available attack actions, not gear.
        const fromMMFeatures =
          (item.flags?.core?.sourceId || "").startsWith("Compendium.dnd-monster-manual.features.") ||
          (item._stats?.compendiumSource || "").startsWith("Compendium.dnd-monster-manual.features.");
        if (!fromMMFeatures && item.system?.equipped !== true) {
          issues.push(`${tag}: weapon "${item.name}" not equipped (system.equipped = ${item.system?.equipped})`);
        }
        // proficient: null (inherit), 0 (no), 1 (yes), 2 (expertise)
        // For NPCs, want proficient: 1 unless deliberate
        if (item.system?.proficient === 0) {
          issues.push(`${tag}: weapon "${item.name}" marked NOT proficient`);
        }
      }
      if (item.type === "equipment") {
        // Armor specifically
        const armorType = item.system?.type?.value;
        if (["light", "medium", "heavy"].includes(armorType) && item.system?.equipped !== true) {
          issues.push(`${tag}: armor "${item.name}" not equipped`);
        }
        if (armorType === "shield" && item.system?.equipped !== true) {
          issues.push(`${tag}: shield "${item.name}" not equipped`);
        }
      }
      if (item.type === "spell") {
        // For warlocks, preparation.mode should be "pact"
        const prep = item.system?.preparation?.mode;
        if (j.name.includes("Trina") && prep && prep !== "pact" && prep !== "atwill" && item.system?.level > 0) {
          issues.push(`${tag}: spell "${item.name}" preparation.mode is "${prep}" (expected "pact" for warlock leveled spells)`);
        }
      }
    }

    // ---- spellcasting setup for casters ----
    if (j.name.includes("Trina") || j.name.includes("Aldea")) {
      // Trina: warlock pact slots (2 slots at level 5)
      const sp = j.system?.spells || {};
      if (j.name.includes("Trina")) {
        if (!sp.pact || sp.pact.value === 0 || sp.pact.max === 0) {
          issues.push(`${tag}: Trina has no pact slots configured (system.spells.pact)`);
        }
      }
    }

    // ---- duplicate items (post-link) ----
    const itemSig = new Map();
    for (const item of j.items || []) {
      const sig = item._stats?.compendiumSource || `${item.type}::${item.name}`;
      if (sig.startsWith("Compendium")) {
        if (itemSig.has(sig)) {
          // dupes are sometimes legit (e.g. two daggers) — only flag if same _id
        }
        itemSig.set(sig, (itemSig.get(sig) || 0) + 1);
      }
    }

    // ---- multiattack/parry presence vs. NPC role ----
    const hasMultiattack = (j.items || []).some(i => i.name === "Multiattack");
    const hasParry = (j.items || []).some(i => i.name === "Parry");
    if (j.name.includes("Quill") || j.name.includes("Marshal Thale")) {
      if (!hasMultiattack) issues.push(`${tag}: should have Multiattack feature`);
      if (!hasParry) issues.push(`${tag}: should have Parry reaction`);
    }
  }
}

console.log("=".repeat(70));
console.log(`Audit complete: ${issues.length} issues`);
console.log("=".repeat(70));
for (const i of issues) console.log("  •", i);
