#!/usr/bin/env node
// Blooming Rot 2 — generator for the relink macro JSON.
//
// Emits:
//   packs/_source/module-macros/macro-relink-to-phb.json
//
// The macro inside that JSON is the runtime utility:
//   "Relink BR2 Actors to PHB/DMG/MM"
//
// We keep the JS body in this file as a template literal so we can edit
// it normally (no \n / \" escaping nightmare), and let JSON.stringify
// handle the encoding when we serialize the Macro document.
//
// Re-run this any time you tweak the macro source:
//   node scripts/build-macro-pack.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT_DIR = path.join(ROOT, "packs", "_source", "module-macros");
const OUT_FILE = path.join(OUT_DIR, "macro-relink-to-phb.json");

// Stable IDs so re-runs are idempotent.
const MACRO_ID = "BR2MacroRelink01";

const MACRO_NAME = "Relink BR2 Actors to PHB/DMG/MM";
const MACRO_IMG = "icons/svg/dice-target.svg";

// === The macro script body ===
//
// Runs inside the user's Foundry world. Walks each BR2 actor pack, finds
// each item's real PHB/DMG/MM 2024 counterpart by NAME, and replaces the
// bundled stub with the real document — proper icons, weapon masteries,
// official rules text. Items without a match (custom BR2 gear, NPC
// features) stay exactly as shipped.
//
// Idempotent. GM-only. Reports a chat summary whispered to the runner.

const COMMAND = `(async () => {
  if (!game.user.isGM) {
    ui.notifications.warn("Blooming Rot 2 relink: GM only.");
    return;
  }

  const SOURCE_PACK_PREFIXES = [
    "dnd-players-handbook",
    "dnd-dungeon-masters-guide",
    "dnd-monster-manual"
  ];

  const TARGET_PACK_IDS = [
    "blooming-rot-2.phase-1-actors",
    "blooming-rot-2.phase-2-actors",
    "blooming-rot-2.phase-3-actors",
    "blooming-rot-2.phase-4-actors",
    "blooming-rot-2.phase-5-actors"
  ];

  const PACK_PRIORITY = [
    "dnd-players-handbook",
    "dnd-dungeon-masters-guide",
    "dnd-monster-manual"
  ];

  // Collect Item-type source packs from any installed PHB/DMG/MM module.
  const sourcePacks = game.packs.filter(p =>
    SOURCE_PACK_PREFIXES.some(prefix => p.collection.startsWith(prefix)) &&
    p.documentName === "Item"
  );

  if (sourcePacks.length === 0) {
    ChatMessage.create({
      content: \`<h3>Blooming Rot 2 — Relink</h3>
        <p><strong>No source modules found.</strong></p>
        <p>This macro requires the official D&amp;D 2024 modules:</p>
        <ul>
          <li>Player's Handbook (<code>dnd-players-handbook</code>)</li>
          <li>Dungeon Master's Guide (<code>dnd-dungeon-masters-guide</code>)</li>
          <li>Monster Manual (<code>dnd-monster-manual</code>)</li>
        </ul>
        <p>Install at least one and re-run.</p>\`,
      whisper: [game.user.id]
    });
    return;
  }

  ui.notifications.info(\`BR2 relink: indexing \${sourcePacks.length} source pack(s)...\`);

  // ---- name normalization ----
  const normalize = (s) => String(s ?? "")
    .toLowerCase()
    .replace(/\\s*\\(.*?\\)\\s*/g, " ")  // drop parentheticals like "(10)"
    .replace(/[^a-z0-9 ]+/g, " ")         // strip punctuation
    .replace(/\\s+/g, " ")
    .trim();

  // ---- build name -> [matches] index ----
  const nameIndex = new Map();
  for (const pack of sourcePacks) {
    let index;
    try {
      index = await pack.getIndex({ fields: ["type", "img"] });
    } catch (err) {
      console.warn("BR2 relink: failed to index", pack.collection, err);
      continue;
    }
    for (const entry of index) {
      const key = normalize(entry.name);
      if (!key) continue;
      if (!nameIndex.has(key)) nameIndex.set(key, []);
      nameIndex.get(key).push({
        uuid: \`Compendium.\${pack.collection}.Item.\${entry._id}\`,
        type: entry.type,
        packId: pack.collection,
        img: entry.img,
        name: entry.name
      });
    }
  }

  // ---- pick best candidate: prefer matching item type, then PHB > DMG > MM ----
  const pickBestMatch = (item, candidates) => {
    if (!candidates || candidates.length === 0) return null;
    const sameType = candidates.filter(c => c.type === item.type);
    const pool = sameType.length ? sameType : candidates;
    const ranked = [...pool].sort((a, b) => {
      const ai = PACK_PRIORITY.findIndex(p => a.packId.startsWith(p));
      const bi = PACK_PRIORITY.findIndex(p => b.packId.startsWith(p));
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    return ranked[0];
  };

  // ---- walk BR2 actor packs, relink ----
  const stats = {
    actors: 0,
    linked: 0,
    skipped: 0,
    missing: [],
    errors: []
  };

  for (const packId of TARGET_PACK_IDS) {
    const pack = game.packs.get(packId);
    if (!pack) {
      console.warn("BR2 relink: target pack not found:", packId);
      continue;
    }
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });
    try {
      const actors = await pack.getDocuments();
      for (const actor of actors) {
        stats.actors++;
        const updates = [];
        for (const item of actor.items) {
          const candidates = nameIndex.get(normalize(item.name)) ?? [];
          const best = pickBestMatch(item, candidates);
          if (!best) {
            stats.skipped++;
            stats.missing.push(\`\${actor.name}: \${item.name}\`);
            continue;
          }
          let sourceDoc;
          try {
            sourceDoc = await fromUuid(best.uuid);
          } catch (err) {
            console.warn("BR2 relink: failed to load", best.uuid, err);
            stats.errors.push(\`\${actor.name}: \${item.name} (load failed)\`);
            continue;
          }
          if (!sourceDoc) {
            stats.errors.push(\`\${actor.name}: \${item.name} (not found)\`);
            continue;
          }
          const sourceData = sourceDoc.toObject();
          delete sourceData._id;
          const merged = foundry.utils.mergeObject(
            sourceData,
            {
              _id: item.id,
              flags: foundry.utils.mergeObject(
                sourceData.flags ?? {},
                { core: { sourceId: best.uuid } },
                { inplace: false }
              )
            },
            { inplace: false }
          );
          updates.push(merged);
          stats.linked++;
        }
        if (updates.length) {
          try {
            await actor.updateEmbeddedDocuments("Item", updates);
          } catch (err) {
            console.error("BR2 relink: update failed for", actor.name, err);
            stats.errors.push(\`\${actor.name}: bulk update failed\`);
          }
        }
      }
    } finally {
      if (wasLocked) await pack.configure({ locked: true });
    }
  }

  // ---- whispered chat report ----
  const skippedHtml = stats.missing.length
    ? \`<details><summary>Skipped (\${stats.missing.length}) — likely custom BR2 items, kept as-is</summary><ul>\${stats.missing.map(m => \`<li>\${m}</li>\`).join("")}</ul></details>\`
    : "";
  const errorHtml = stats.errors.length
    ? \`<details><summary>Errors (\${stats.errors.length})</summary><ul>\${stats.errors.map(m => \`<li>\${m}</li>\`).join("")}</ul></details>\`
    : "";
  ChatMessage.create({
    content: \`<h3>Blooming Rot 2 — Relink Complete</h3>
      <p><strong>\${stats.actors}</strong> actors processed.</p>
      <p><strong>\${stats.linked}</strong> items linked to PHB/DMG/MM.</p>
      <p><strong>\${stats.skipped}</strong> items skipped (no PHB/DMG/MM match).</p>
      \${skippedHtml}
      \${errorHtml}
      <p><em>Idempotent — re-running is safe.</em></p>\`,
    whisper: [game.user.id]
  });
  ui.notifications.info(\`BR2 relink: \${stats.linked} linked, \${stats.skipped} skipped, \${stats.errors.length} errors.\`);
})();
`;

// === Build the Macro document JSON ===

const macroDoc = {
  _key: `!macros!${MACRO_ID}`,
  _id: MACRO_ID,
  name: MACRO_NAME,
  type: "script",
  author: null,
  img: MACRO_IMG,
  scope: "global",
  command: COMMAND,
  folder: null,
  sort: 0,
  ownership: { default: 0 },
  flags: {
    "blooming-rot-2": {
      kind: "utility-macro",
      purpose: "relink-actors-to-phb-dmg-mm"
    }
  },
  _stats: {
    compendiumSource: null,
    duplicateSource: null,
    exportSource: null,
    coreVersion: "13.351",
    systemId: "dnd5e",
    systemVersion: "5.3.0",
    createdTime: null,
    modifiedTime: null,
    lastModifiedBy: null
  }
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(macroDoc, null, 2) + "\n");
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${MACRO_NAME})`);
