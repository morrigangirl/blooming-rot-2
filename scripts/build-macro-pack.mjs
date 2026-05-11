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
// Runs inside the user's Foundry world. Walks the world's imported BR2
// actors (game.actors), finds each item's real PHB/DMG/MM 2024 counterpart
// by NAME, and replaces the bundled stub with the real document — proper
// icons, weapon masteries, official rules text. Items without a match
// (custom BR2 gear, NPC features) stay exactly as shipped.
//
// IMPORTANT: This operates on actors IMPORTED INTO THE WORLD, not on the
// compendium packs themselves. Foundry does not permit persistent
// modification of a module's shipped compendium packs, so the workflow is:
//
//   1. Import the BR2 actors you want into the world (drag from compendium,
//      or right-click compendium → Import All Content).
//   2. Run this macro. It relinks the world-imported actors' items.
//   3. Drag those actors to the table as needed.
//
// Re-run this any time you import new BR2 actors. Idempotent. GM-only.

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

  const PACK_PRIORITY = [
    "dnd-players-handbook",
    "dnd-dungeon-masters-guide",
    "dnd-monster-manual"
  ];

  // ---- guard 1: source modules installed? ----
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

  // ---- guard 2: find BR2 actors imported into the world ----
  //
  // A world actor is "from BR2" if either:
  //   - its core.sourceId flag points at a Compendium.blooming-rot-2.* pack
  //   - or its blooming-rot-2 flag block is present
  //   - or (fallback) it came in via Import All Content and we can detect
  //     the original compendium via _stats.compendiumSource.
  //
  // This catches actors imported by drag, by "Import All Content", and by
  // any folder organisation the user has applied afterward.
  const isBR2Actor = (a) => {
    const sid = a?.flags?.core?.sourceId;
    if (sid && typeof sid === "string" && sid.includes("blooming-rot-2.")) return true;
    if (a?.flags?.["blooming-rot-2"]) return true;
    const cs = a?._stats?.compendiumSource;
    if (cs && typeof cs === "string" && cs.includes("blooming-rot-2.")) return true;
    return false;
  };

  const br2Actors = game.actors.filter(isBR2Actor);

  if (br2Actors.length === 0) {
    ChatMessage.create({
      content: \`<h3>Blooming Rot 2 — Relink</h3>
        <p><strong>No imported BR2 actors found in this world.</strong></p>
        <p>Foundry does not permit persistent modification of a module's compendium packs,
        so this macro relinks <em>world-imported</em> actors. To use it:</p>
        <ol>
          <li>Open the Compendium tab, expand each <strong>Blooming Rot 2 &mdash; Phase N &mdash; NPCs</strong> pack.</li>
          <li>Right-click the pack &rarr; <strong>Import All Content</strong> into a folder (e.g. "BR2 &mdash; Phase 1").</li>
          <li>(Or drag individual actors as you need them.)</li>
          <li>Re-run this macro.</li>
        </ol>
        <p><em>This macro can be run as many times as you like; it skips already-linked items and reports new ones.</em></p>\`,
      whisper: [game.user.id]
    });
    return;
  }

  ui.notifications.info(\`BR2 relink: \${br2Actors.length} BR2 actor(s) in world; indexing \${sourcePacks.length} source pack(s)...\`);

  // ---- name normalization ----
  const normalize = (s) => String(s ?? "")
    .toLowerCase()
    .replace(/\\s*\\(.*?\\)\\s*/g, " ")  // drop parentheticals like "(10)"
    .replace(/[^a-z0-9 ]+/g, " ")         // strip punctuation
    .replace(/\\s+/g, " ")
    .trim();

  // ---- build name -> [matches] index from PHB/DMG/MM ----
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

  // ---- check if an item is already linked to PHB/DMG/MM ----
  const isAlreadyLinked = (item) => {
    const sid = item?.flags?.core?.sourceId
      ?? item?._stats?.compendiumSource
      ?? item?._source?.flags?.core?.sourceId;
    if (!sid || typeof sid !== "string") return false;
    return SOURCE_PACK_PREFIXES.some(p => sid.includes(\`Compendium.\${p}\`));
  };

  // ---- walk world actors, relink ----
  const stats = {
    actors: br2Actors.length,
    actorsTouched: 0,
    linked: 0,
    alreadyLinked: 0,
    skipped: 0,
    missing: [],
    errors: []
  };

  for (const actor of br2Actors) {
    const updates = [];
    for (const item of actor.items) {
      if (isAlreadyLinked(item)) {
        stats.alreadyLinked++;
        continue;
      }
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
        stats.actorsTouched++;
      } catch (err) {
        console.error("BR2 relink: update failed for", actor.name, err);
        stats.errors.push(\`\${actor.name}: bulk update failed\`);
      }
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
      <p><strong>\${stats.actors}</strong> BR2 actors found in the world (<strong>\${stats.actorsTouched}</strong> modified).</p>
      <p><strong>\${stats.linked}</strong> items newly linked to PHB/DMG/MM.</p>
      <p><strong>\${stats.alreadyLinked}</strong> items already linked (skipped).</p>
      <p><strong>\${stats.skipped}</strong> items with no PHB/DMG/MM match (kept as-is — likely custom BR2 gear or unique NPC features).</p>
      \${skippedHtml}
      \${errorHtml}
      <p><em>Idempotent — re-run after importing more actors.</em></p>\`,
    whisper: [game.user.id]
  });
  ui.notifications.info(\`BR2 relink: \${stats.linked} newly linked, \${stats.alreadyLinked} already linked, \${stats.skipped} no match, \${stats.errors.length} errors.\`);
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
