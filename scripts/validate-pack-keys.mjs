// Verify (and optionally repair) the `_key` on every document and embedded
// document in packs/_source.
//
// Foundry's LevelDB packs key every record by its full path, e.g.
//   !actors!<actorId>
//   !actors.items!<actorId>.<itemId>
//   !actors.items.effects!<actorId>.<itemId>.<effectId>
//   !journal.pages!<journalId>.<pageId>
//   !scenes.walls!<sceneId>.<wallId>
//
// If an embedded record's key names a parent that isn't in the pack, the
// compiled pack still builds but cannot be extracted (extractPack throws
// LEVEL_NOT_FOUND) and the embedded document does not attach in Foundry.
// This is easy to introduce when a generator clones a stat block from another
// module and rewrites the actor and item ids but not the effect keys.
//
//   node scripts/validate-pack-keys.mjs          # report only
//   node scripts/validate-pack-keys.mjs --fix    # rewrite bad keys in place

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE = path.join(ROOT, "packs", "_source");
const FIX = process.argv.includes("--fix");

// primary collection -> the document's own key prefix
const PRIMARY = [
  ["actors", d => "prototypeToken" in d],
  ["journal", d => Array.isArray(d.pages)],
  ["scenes", d => "grid" in d && "walls" in d],
  ["macros", d => "command" in d && "type" in d],
  ["items", d => "system" in d && "type" in d && !("prototypeToken" in d)],
  ["folders", d => d._key?.startsWith("!folders!")],
];

// embedded arrays on a primary document: field -> key segment
const EMBEDS = {
  actors: { items: "items", effects: "effects" },
  journal: { pages: "pages" },
  scenes: {
    walls: "walls", lights: "lights", notes: "notes", tokens: "tokens", tiles: "tiles",
    sounds: "sounds", drawings: "drawings", templates: "templates", regions: "regions",
  },
  items: { effects: "effects" },
};

function collectionOf(doc) {
  for (const [name, test] of PRIMARY) { try { if (test(doc)) return name; } catch { /* ignore */ } }
  return null;
}

const problems = [];
let checked = 0, fixed = 0;

for (const packDir of fs.readdirSync(SOURCE).sort()) {
  const full = path.join(SOURCE, packDir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const file of fs.readdirSync(full).sort()) {
    if (!file.endsWith(".json")) continue;
    const fp = path.join(full, file);
    let doc;
    try { doc = JSON.parse(fs.readFileSync(fp, "utf8")); } catch { continue; }
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) continue;
    const coll = collectionOf(doc);
    if (!coll) continue;
    const id = doc._id;
    let dirty = false;

    const expect = (obj, want, what) => {
      checked++;
      if (obj._key === want) return;
      problems.push({ pack: packDir, file, what, got: obj._key, want });
      if (FIX) { obj._key = want; dirty = true; fixed++; }
    };

    expect(doc, `!${coll}!${id}`, "document");

    for (const [field, seg] of Object.entries(EMBEDS[coll] ?? {})) {
      for (const child of doc[field] ?? []) {
        expect(child, `!${coll}.${seg}!${id}.${child._id}`, `${field}/${child.name ?? child._id}`);
        // one more level: item effects on an actor
        if (coll === "actors" && field === "items") {
          for (const gc of child.effects ?? []) {
            expect(gc, `!${coll}.items.effects!${id}.${child._id}.${gc._id}`,
              `${field}/${child.name ?? child._id}/effects/${gc.name ?? gc._id}`);
          }
        }
      }
    }

    if (dirty) fs.writeFileSync(fp, JSON.stringify(doc, null, 2) + "\n");
  }
}

console.log(`_key check: ${checked} keys checked, ${problems.length} bad${FIX ? `, ${fixed} repaired` : ""}.`);
for (const p of problems) console.log(`  ${p.pack}/${p.file}  ${p.what}\n     got  ${p.got}\n     want ${p.want}`);
if (!FIX && problems.length) { console.log("\nRe-run with --fix to repair."); process.exitCode = 1; }
