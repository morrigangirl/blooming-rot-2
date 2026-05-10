#!/usr/bin/env node
// Aerdy Commercial-Court Network — actor generator.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MM_ACTORS = "/tmp/br2-source-extract/dnd-monster-manual/actors";

function loadTemplate(name) {
  for (const f of fs.readdirSync(MM_ACTORS)) {
    const j = JSON.parse(fs.readFileSync(path.join(MM_ACTORS, f), "utf8"));
    if (j.name === name) return j;
  }
  throw new Error(`MM template not found: ${name}`);
}

const TEMPLATES = {
  noble: loadTemplate("Noble"),
  apprentice: loadTemplate("Mage Apprentice"),
};

function makeId(prefix, key) {
  const h = crypto.createHash("sha1").update(key).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

function buildActor({ name, archetype, bio }) {
  const tpl = TEMPLATES[archetype];
  const _id = makeId("BR2AN", `aerdy-network|${name}`);
  const actor = JSON.parse(JSON.stringify(tpl));
  const mmUuid = `Compendium.dnd-monster-manual.actors.Actor.${tpl._id}`;
  actor._id = _id;
  actor._key = `!actors!${_id}`;
  actor.name = name;
  actor.folder = null;
  actor.sort = 0;
  actor.ownership = { default: 0 };
  if (!actor.system.details) actor.system.details = {};
  actor.system.details.biography = { value: bio, public: "" };
  actor._stats = {
    ...(actor._stats || {}),
    compendiumSource: mmUuid,
    duplicateSource: null,
    coreVersion: "13.351",
    systemId: "dnd5e",
    systemVersion: "5.3.0"
  };
  actor.flags = {
    ...(actor.flags || {}),
    core: { ...((actor.flags && actor.flags.core) || {}), sourceId: mmUuid },
    "blooming-rot-2": { kind: "named-npc", archetype, faction: "aerdy-network" }
  };
  if (Array.isArray(actor.items)) {
    actor.items = actor.items.map((item, idx) => {
      const itemId = makeId("BR2I", `${name}|${idx}|${item.name || "item"}`);
      return { ...item, _id: itemId, _key: `!actors.items!${_id}.${itemId}` };
    });
  }
  if (Array.isArray(actor.effects)) {
    actor.effects = actor.effects.map((eff, idx) => {
      const effId = makeId("BR2E", `${name}|${idx}|${eff.name || "eff"}`);
      return { ...eff, _id: effId, _key: `!actors.effects!${_id}.${effId}` };
    });
  }
  if (actor.prototypeToken) actor.prototypeToken.name = name;
  return actor;
}

const NPCS = [
  {
    name: "Mistress Lyra Vellanen",
    archetype: "noble",
    bio: "<h2>Mistress Lyra Vellanen — Aerdy Commercial-Court Advocate</h2><p><em>Senior advocate, Rel Astra. Coordinator of the Aerdy Commercial-Court Network. Late fifties.</em></p><h3>Quick read</h3><ul><li>Tall, thin, deliberate. Charcoal advocate's coat, white linen, gold-and-jet commercial-court pin.</li><li>Polite, slightly chilly. Listens more than she speaks.</li></ul><h3>Motive</h3><p>Stop the route-account practice quietly, through formal court filings that look like ordinary commercial disputes but cumulatively dismantle the conspiracy's surface front.</p><h3>What she offers the party</h3><ul><li>Aerdy court filings against implicated firms.</li><li>Document interpretation (commercial forms, seals).</li><li>A safe house in Rel Astra (one use).</li><li>A formal witness-protection slip (one only, for Phase 6/7).</li><li>Introductions to Pretor Tess and Magister Drask.</li></ul><h3>What she will not do</h3><ul><li>Help the party descend.</li><li>Endanger the Network's cover.</li><li>Speak ill of Caelith.</li></ul><p><em>Stat: Noble (CR 1/8), effective CR 1 for social/research scenes.</em></p>"
  },
  {
    name: "Pretor Halvard Tess",
    archetype: "noble",
    bio: "<h2>Pretor Halvard Tess — Retired Customs, Hardby Arbitrator</h2><p><em>The Network's quiet money. Sixty-two.</em></p><h3>Quick read</h3><ul><li>Heavy shoulders, soft face. Greying beard. A cane he doesn't strictly need.</li><li>Dark green wool coat, gold watch-chain. Retired imperial customs pin.</li><li>Warmer than Lyra. Trusts more carefully than he likes.</li></ul><h3>Motive</h3><p>Retired after declining to certify three suspicious shipments. Funds the Network out of pension. Believes the route-account practice has poisoned the commercial-law tradition he served.</p><h3>What he offers</h3><ul><li>Quiet absorption of the party's Greyhawk-area expenses.</li><li>Hardby contacts (every senior firm partner).</li><li>Customs intelligence, old shipping manifests.</li></ul><h3>His vulnerability</h3><p>His son, Halvard Tess the Younger, is a journeyman commercial-court clerk in Greyhawk City. He will eventually tell the party.</p><p><em>Stat: Noble (CR 1/8).</em></p>"
  },
  {
    name: "Senior Magister Olen Drask",
    archetype: "apprentice",
    bio: "<h2>Senior Magister Olen Drask — Network Scholar</h2><p><em>Aerdy College of Commercial Law, Rel Astra. Late seventies.</em></p><h3>Quick read</h3><ul><li>Small, slight, upright. Bald with white fringe. Cold blue eyes.</li><li>Academic gown when teaching, advocate's coat otherwise.</li></ul><h3>Motive</h3><p>Assembling a scholarly monograph for 580 CY publication. The publication is his weapon. Believes properly timed academic work can prevent the practice from returning for a century.</p><h3>What he offers</h3><ul><li>Historical context for any commercial-court document.</li><li>His copy of the Class VII glossary (with three pages Iren's copy is missing).</li><li>Access to the College's restricted archive.</li></ul><h3>Useful line</h3><blockquote><p>\"Stopping the practice now is a service to the present. Documenting it after is a service to the future. We are not the same. We are also not opponents.\"</p></blockquote><p><em>Stat: Mage Apprentice (CR 2). Combat is a misuse of him.</em></p>"
  }
];

console.log(`Generating ${NPCS.length} Aerdy Network actors...`);
const outDir = path.join(ROOT, "packs", "_source", "aerdy-network");
fs.mkdirSync(outDir, { recursive: true });
for (const npc of NPCS) {
  const a = buildActor(npc);
  const fname = npc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fs.writeFileSync(path.join(outDir, `actor-${fname}.json`), JSON.stringify(a, null, 2) + "\n");
}
console.log(`✓ Wrote ${NPCS.length} actor JSONs.`);
