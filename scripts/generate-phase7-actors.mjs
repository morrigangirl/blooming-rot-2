#!/usr/bin/env node
// Phase 7 NPC actor generator.
//
// Creates Dalmor Vetch (new for Phase 7) and any minor mooks the phase
// needs as drop-in tokens (route-cleanser agents, record-burner, hired
// tough, silent scout). All use MM 2024 archetypes as templates.

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
  commoner: loadTemplate("Commoner"),
  spy: loadTemplate("Spy"),
  scout: loadTemplate("Scout"),
  thug: loadTemplate("Tough"),
  apprentice: loadTemplate("Mage Apprentice"),
  veteran: loadTemplate("Warrior Veteran"),
};

function makeId(prefix, key) {
  const h = crypto.createHash("sha1").update(key).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

function buildActor({ name, archetype, bio }) {
  const tpl = TEMPLATES[archetype];
  if (!tpl) throw new Error(`Unknown archetype: ${archetype}`);
  const _id = makeId("BR2P7A", `phase7|${name}`);
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
    "blooming-rot-2": { kind: "named-npc", archetype, phase: "7" }
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
    name: "Dalmor Vetch",
    archetype: "commoner",
    bio: "<h2>Dalmor Vetch — Retired Surveyor</h2><p><em>The Guild of Miners & Jewelers' living memory of stairs. New for Phase 7.</em></p><h3>Quick read</h3><ul><li>Late sixties. Short, sturdy. Missing the ring and little fingers of his right hand &mdash; lost in a winch accident in 552 CY.</li><li>Working wool, plain leather, heavy walking-stick. A silver Guild surveyor's pin sewn flat into his coat lining.</li><li>Blunt, suspicious, hates clean maps.</li></ul><h3>Motive</h3><p>Wants to be paid and not dragged into Guild politics. Spent forty years surveying for the Guild and retired with a grievance: he believes old records of unprofitable stairs have been quietly destroyed by clients he doesn't know.</p><h3>Tell</h3><p>When someone says \"road,\" Vetch <strong>taps his cane on the floor</strong>, once, with finality.</p><h3>Fear</h3><p>That the Guild figures out who he's been talking to and stops paying his pension.</p><h3>Leverage</h3><p>20 gp opens his front door. 50 gp opens his back room. Tellan Verth is a free introduction. Bringing Guild authority to his door makes him cordial, useless, and unreachable for a week.</p><h3>What he knows</h3><ul><li>The Cairn Hills hold at least three old mining stairs the Guild stopped letting people survey in the 540s.</li><li>The Tarnsmere Spur ends at Tarnsmere Toll. Beyond, the Spur becomes a footpath, then a cairn line, then the Seven-Cut Cairn.</li><li>The seven cuts are a <em>permission mark</em>, not a count. The black hill is a sealed-entrance convention.</li><li>Someone has been removing Spur-related records from the Guild archive over the last three weeks.</li></ul><h3>Useful lines</h3><ul><li>\"A road is what merchants call it when they can charge toll. Miners call it a stair when the earth charges first.\"</li><li>\"Roads end. Stairs continue.\"</li><li>\"The seventh cut tells you which kind you've found.\"</li><li>\"You came to me. That means you already know not to trust the Guild map. I respect that.\"</li></ul><p><em>Stat block: Commoner (CR 0) with proficiencies in Investigation, History, Survival; expertise in cartography and mining terminology.</em></p>"
  },
  {
    name: "Yorth Pell (Guild underclerk)",
    archetype: "commoner",
    bio: "<h2>Yorth Pell — Guild Underclerk</h2><p><em>No relation to the Loftwick Pell. Phase 7 antagonist-of-circumstance.</em></p><p>Mid-twenties, ambitious, underpaid. Has been making copies of obsolete claim records for an unfamiliar client over the past three weeks. He does not know who the client is &mdash; the requests came by note, the payment was in merchant chits.</p><p>Will admit to the copying under Persuasion 16 or Intimidation 18. He is not malicious. He is paying off a debt.</p><p><em>Stat block: Commoner (CR 0).</em></p>"
  },
  {
    name: "Route-Cleanser Agent",
    archetype: "spy",
    bio: "<h2>Route-Cleanser Agent</h2><p><em>Drop-in token. Used at the False Stair (Node 6), the road-side waymark encounter (Node 7 option C), and the cistern climax retrieval (Clock 2 segment 4 extraction).</em></p><p>Lean, quiet, dressed for not being noticed. Wears a working-mason's apron with a small mallet and chisel set. Carries one or two poison-tipped darts in addition to a short blade.</p><p>Goals: deface waymarks, destroy or substitute documents, retrieve prisoners. <strong>Never fights to the death.</strong> Disengages if any party member is captured or any trap fires.</p><p><em>Stat block: Spy (CR 1) with one prepared dose of poison.</em></p>"
  },
  {
    name: "Hired Greyhawk Tough",
    archetype: "thug",
    bio: "<h2>Hired Greyhawk Tough</h2><p><em>Local muscle hired by the route-cleansers for the False Stair ambush and the cistern extraction.</em></p><p>Foreign Quarter or Old Walls native. Paid daily. No loyalty to whoever hired them; will run if their employer runs.</p><p><em>Stat block: Tough/Thug analog (CR 1/2).</em></p>"
  },
  {
    name: "Record-Burner",
    archetype: "apprentice",
    bio: "<h2>Record-Burner</h2><p><em>An arcane operative used in the prisoner extraction attempt (Phase 7 Clock 2 segment 4). Knows utility magic for opening locked doors, burning documents to ash before identification, and silencing a prisoner's voice for the duration of the extraction.</em></p><p>Wears no obvious occult markers. Could pass as a junior advocate or a Guild scrivener. Will flee, not fight, if the operation is discovered.</p><p><em>Stat block: Mage Apprentice (CR 2) with prepared cantrips and a single 1st-level slot (typically used for silence, sleep, or alarm).</em></p>"
  },
  {
    name: "Silent Scout",
    archetype: "scout",
    bio: "<h2>Silent Scout</h2><p><em>Used at Node 7 (field reconnaissance) and as the lead element of the Clock 2 extraction.</em></p><p>Equipped with poison needle, climbing tools, lockpicks, and a thin grappling line. Their job is to enter quietly, mark a target, and leave before anyone wakes.</p><p><em>Stat block: Scout (CR 1/2) with poison needle and silent step.</em></p>"
  }
];

console.log(`Generating ${NPCS.length} Phase 7 actor JSONs...`);
const outDir = path.join(ROOT, "packs", "_source", "phase-7-actors");
fs.mkdirSync(outDir, { recursive: true });
for (const npc of NPCS) {
  const a = buildActor(npc);
  const fname = npc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fs.writeFileSync(path.join(outDir, `actor-${fname}.json`), JSON.stringify(a, null, 2) + "\n");
}
console.log(`✓ Wrote ${NPCS.length} actor JSONs to ${path.relative(ROOT, outDir)}/`);
