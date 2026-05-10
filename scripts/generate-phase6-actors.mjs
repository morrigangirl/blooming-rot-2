#!/usr/bin/env node
// Phase 6 NPC actor generator.
//
// Creates the NEW Phase 6 actors using MM 2024 archetypes as templates,
// the same way generate-named-npc-actors.mjs handles the others. Lives
// as a separate script because the Phase 6 NPCs (Korre, Kethren, the
// Brass Crow staff, the Kestrel & Reed senior clerk, Korre's two
// agents) need richer Phase-6-specific biographies than the bulk
// generator produced for the Phase 1-5 named NPCs.
//
// Re-run safely; IDs are deterministic.

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
  spy: loadTemplate("Spy"),
  banditCaptain: loadTemplate("Bandit Captain"),
  thug: loadTemplate("Tough"),
  scout: loadTemplate("Scout"),
  mage: loadTemplate("Mage"),
  apprentice: loadTemplate("Mage Apprentice"),
  commoner: loadTemplate("Commoner"),
  priestAcolyte: loadTemplate("Priest Acolyte"),
  veteran: loadTemplate("Warrior Veteran")
};

function makeId(prefix, key) {
  const h = crypto.createHash("sha1").update(key).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

function buildActor({ name, archetype, bio }) {
  const tpl = TEMPLATES[archetype];
  if (!tpl) throw new Error(`Unknown archetype: ${archetype}`);
  const _id = makeId("BR2P6A", `phase6|${name}`);
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
    "blooming-rot-2": { kind: "named-npc", archetype, phase: "6" }
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
    name: "Veyra Korre",
    archetype: "spy",
    bio: "<h2>Veyra Korre — V. Korre, Greyhawk Handler</h2><p><em>Surface operator. Not mastermind. Treat as Spy (CR 1) with Bandit Captain tactical features (Parry reaction, Cunning Action) for an effective CR 4-5 in the cistern.</em></p><p>Late thirties or early forties — she has worked at making her age unreadable. Medium frame, contained, hands always free. Dresses to be three different women in the same week.</p><p><strong>Veyra Korre is itself an alias.</strong> Her birth name is not the campaign's payoff and the GM should not pursue it.</p><h3>Motive</h3><p>To run her correspondence-handling business for three more years and retire to a small Aerdy port town. She has been disciplined about not asking what is in the packets.</p><h3>Tell</h3><p>When she is about to lie, she touches her left wrist with her right thumb. Insight DC 16.</p><h3>Leverage</h3><p>Threat of formal exposure to her Aerdy correspondents; promise of safe passage out of the trade; concrete evidence that her client is using her without telling her. Bribery in coin does not work.</p><h3>What she knows</h3><ul><li>Haskur arrived from an eastern financial route.</li><li>He is being transferred to a route called the Seventh Stair.</li><li>The younger man (\"the courier\") is the route's courier, not Haskur's subordinate.</li><li>\"E.\" is not someone she has met. Instructions arrive through sealed packets with nonstandard wax.</li><li>The phrase \"clean hands drown first\" came in one of the packets. She does not know its origin.</li></ul><h3>What she does not know</h3><p>E.'s identity. The final destination beyond the Seventh Stair. The deeper organization. The full purpose of Blooming Rot.</p><h3>Behaviour if cornered</h3><p>Burns records before fighting. Runs before being captured. Has rehearsed her exit from every room she rents. Can be captured by excellent play.</p>"
  },
  {
    name: "Kethren Ilvath",
    archetype: "scout",
    bio: "<h2>Kethren Ilvath — The Younger Man</h2><p><em>Working alias. Deep-route courier. Species not confirmed; do not call him drow, do not say Underdark, do not overexplain.</em></p><p><em>Stat: scout / monk-assassin analog, CR 5. HP 58, AC 16, Speed 35 ft / climb 30 ft. Multiattack: poison needle + short blade. Reaction: Defensive Step. Bonus actions: Disengage, Hide, Vanish (3/day in dim light).</em></p><p>Young adult. Slight, balanced, unhurried. Unfamiliar grey-and-bone clothing — soft greys, off-whites, paler than chalk and warmer than stone. Cut is unfamiliar. No emblems.</p><h3>Behavioural cues</h3><ul><li>Walks broad streets with tiny corrections, as if used to narrower footing.</li><li>Watches reflective surfaces and door lintels, not people.</li><li>Steps over puddles where the reflection would show his face.</li><li>Sits with his back to a corner that lets him watch the door's reflection in a window across the room.</li><li>Closes a door behind himself by the upper edge.</li><li>Hesitates fractionally before stepping into direct sunlight.</li></ul><h3>Operational role</h3><p>Gives instructions to Haskur. Korre handles paperwork; Kethren handles routes.</p><h3>What he knows</h3><p>The next transfer phrase. The route marker \"Seventh Stair.\" That Haskur is not trusted. That V. Korre is disposable. That \"the hand\" writes through intermediaries.</p><h3>What he will not say</h3><p>E.'s name. The deep organization's name. The final destination. Why Blooming Rot began.</p><h3>If captured</h3><p>Does not monologue. Short, literal answers. More afraid of being returned than of being killed. Insight DC 16: he is afraid of recall, not of Haskur or Korre or Greyhawk.</p>"
  },
  {
    name: "Aerel Mossen",
    archetype: "spy",
    bio: "<h2>Aerel Mossen — Brass Crow Proprietor</h2><p>Fifties. Half-Aerdy by maternal line. Runs the Brass Crow counting-house with two clerks and a runner.</p><p><em>Not conspiracy-aligned. Fee-driven. Compromised by the simple math of V. Korre's monthly retainer.</em></p><h3>What he knows</h3><p>That H. V. Andren is one of three names that arrive with foreign-correspondent payments per month. Does not know who pays. Does not ask.</p><h3>Leverage</h3><p>Legal threat (he has minor declaration irregularities the City Watch could find), promise of replacement custom, or simple reassurance that the party is not the Watch.</p><h3>Behaviour under pressure</h3><p>Tells the truth more readily than expected, because the lies he keeps for paying clients do not require him to lie about himself.</p>"
  },
  {
    name: "Wenna Roost",
    archetype: "commoner",
    bio: "<h2>Wenna Roost — Brass Crow Desk Clerk</h2><p>Twenty-three. Aerdi-Yeomanry mixed background. First proper job; first proper rooms of her own.</p><h3>What she knows</h3><p>The registry by heart. The lintel-check signal — a marked client touches a small notch on the lintel before being admitted to the consultation room.</p><h3>Tell</h3><p>Straightens the inkwell when she is afraid.</p><h3>Leverage</h3><p>Kindness. Wenna has not been treated kindly in this job. The party can earn a clear answer with one polite afternoon.</p><h3>Risk</h3><p>If questioned visibly, the proprietor dismisses her by the next morning. If the party does not protect her, she vanishes from Greyhawk by the end of the phase.</p>"
  },
  {
    name: "Tassel",
    archetype: "scout",
    bio: "<h2>Tassel — Brass Crow Runner</h2><p>Nineteen. Half-Suel city-born. Quick, quiet, professionally invisible.</p><h3>Role</h3><p>Handles foreign-correspondent packets. Was the listener at the Hand of Coals if the party did not catch him.</p><h3>What he knows</h3><p>His routes. He carries packets, not contents. He has noticed that the \"Andren\" packets pay double.</p><h3>Behaviour under pressure</h3><p>Runs. Tassel is fast, unarmed, and not paid enough to die for the Brass Crow. Surrenders if cornered without violence.</p>"
  },
  {
    name: "Doras Kemmel",
    archetype: "spy",
    bio: "<h2>Doras Kemmel — Senior Clerk, Kestrel &amp; Reed</h2><p>Forties. Hardby-born, Greyhawk-resident for a decade. Runs the day-to-day at Kestrel &amp; Reed; the owner is in Hardby.</p><h3>What he knows</h3><p>That some of his clients are dangerous. He does not know who or how. He has been keeping his head down for two years, and he is tired.</p><h3>Tell</h3><p>Overcorrects when discussing the firm's compliance — cites regulations no clerk would normally cite.</p><h3>Leverage</h3><p>Protection. Doras has a wife and three children in the Garden Quarter. <strong>If offered formal protection — Caelith's seal, an Aerdy advocate's witness slip, or Halask if Vector D — he turns.</strong></p><h3>Behaviour under pressure</h3><p>Shaking, but cooperative. Does not lie well; the conspiracy has been getting away with using him because no one has bothered to ask carefully.</p>"
  },
  {
    name: "Mell",
    archetype: "spy",
    bio: "<h2>Mell — Korre Agent</h2><p>One of V. Korre's two paid agents. Handles intimidation and lock work. Loyalty: low (paid weekly). Will flee if Korre flees. Will not fight to the death.</p><p><em>Stat: Spy (CR 1).</em></p>"
  },
  {
    name: "Saern",
    archetype: "thug",
    bio: "<h2>Saern — Korre Agent</h2><p>One of V. Korre's two paid agents. Handles forgery, lock work, and packet-burning. <strong>In the cistern climax, Saern's combat priority is the brazier — he will move directly there and start burning the packet within two rounds.</strong></p><p><em>Stat: Tough / Thug analog (CR 1/2).</em></p>"
  },
  {
    name: "Captain Jarn Heshet",
    archetype: "veteran",
    bio: "<h2>Captain Jarn Heshet — Greyhawk City Watch (Foreign Quarter precinct)</h2><p>Appears only on Heat Clock 3 or higher. Routine inquiries become formal questioning at clock 4. Detention becomes possible at clock 5.</p><p>Not corrupt. Not friendly. He has dealt with Yeomanry visitors before and is not impressed.</p><h3>Leverage</h3><p>A sealed introduction from Caelith carries weight if produced privately. Public production produces the opposite effect.</p><p><em>Stat: Warrior Veteran (CR 3).</em></p>"
  }
];

console.log(`Generating ${NPCS.length} Phase 6 actor JSONs...`);
const outDir = path.join(ROOT, "packs", "_source", "phase-6-actors");
fs.mkdirSync(outDir, { recursive: true });
let written = 0;
for (const npc of NPCS) {
  const a = buildActor(npc);
  const fname = npc.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outPath = path.join(outDir, `actor-${fname}.json`);
  fs.writeFileSync(outPath, JSON.stringify(a, null, 2) + "\n");
  written++;
}
console.log(`✓ Wrote ${written} actor JSONs to ${path.relative(ROOT, outDir)}/`);
