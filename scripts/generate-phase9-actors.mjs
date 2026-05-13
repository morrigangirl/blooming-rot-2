#!/usr/bin/env node
// Phase 9 NPC actor generator.
//
// Creates four new drop-in actors for Phase 9:
//   - Route Warden Savax (Bandit Captain template, CR 5)
//   - Silent Courier (Scout Captain template, CR 3)
//   - Tally Sentinel (Animated Armor template, CR 4)
//   - Merrit Osk, the Unclaimed Witness (Commoner template, CR 0)
//
// Returning enemies (Route-Cleaner, Silent Scout, Hired Tough,
// Route-Cleaner Lead, Stone-Witness) are already in Phase 7 and Phase 8
// actor packs and reused via drop-in.

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
  banditCaptain: loadTemplate("Bandit Captain"),
  scoutCaptain: loadTemplate("Scout Captain"),
  animatedArmor: loadTemplate("Animated Armor"),
  commoner: loadTemplate("Commoner"),
};

function makeId(prefix, key) {
  const h = crypto.createHash("sha1").update(key).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

function buildActor({ name, archetype, bio }) {
  const tpl = TEMPLATES[archetype];
  if (!tpl) throw new Error(`Unknown archetype: ${archetype}`);
  const _id = makeId("BR2P9A", `phase9|${name}`);
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
    "blooming-rot-2": { kind: "named-npc", archetype, phase: "9" }
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
    name: "Route Warden Savax",
    archetype: "banditCaptain",
    bio: "<h2>Route Warden Savax</h2><p><em>Warden of Witness Station Seven, the First Under-Road Waystation. New for Phase 9. Career procedural administrator.</em></p><h3>Quick read</h3><ul><li>Indeterminate age &mdash; could be early forties, could be late sixties. Skin that has not seen sun in long enough that surface ageing markers do not apply.</li><li>Pale or shadowed features. Eyes that avoid the direct light of a torch.</li><li>Careful diction. Gloves &mdash; thin, dark leather, well-fitted. Always worn.</li><li>Silence around the feet. Walks without making sound.</li><li>Discomfort at open flame.</li></ul><p><strong>GM note:</strong> Do not confirm Savax's species in player-facing text. The physical details are deliberately ambiguous. Phase 9 player-facing language constraint: no naming of deep factions or species.</p><h3>Motive</h3><p>Keep the waystation operational. Process all transit cleanly. Avoid creating procedural irregularities that would draw attention from the deeper authority. <em>His career is the procedure.</em> Not personally invested in the Blooming Rot conspiracy; he administers transits without judgment of their purpose.</p><h3>Tell</h3><p>When Savax is genuinely uncertain about a procedural decision, he removes one glove, flexes the hand briefly, then replaces the glove. <em>This is the only physical sign that he is operating outside his comfort zone.</em></p><h3>Useful lines</h3><ul><li>\"Names are for surfaces.\"</li><li>\"If you are not witnessed, you are cargo.\"</li><li>\"You have descended without category.\"</li><li>\"Correction is still available.\"</li><li>\"I am the warden here. I am not the authority. I have been instructed.\"</li></ul><h3>Stat block</h3><p><strong>Bandit Captain (CR 2 base, adjusted to CR 5)</strong>:</p><ul><li>HP 75 (10d8 + 30). AC 16 (studded leather + route brace).</li><li>Multiattack: short-sword + dagger; or, in command mode, foregoes attack to issue a command.</li><li><strong>Procedural Command.</strong> Once per turn, when a route-cleaner or Silent Courier within 30 ft. takes Disengage or Dodge, that ally may also move up to 10 ft. as a reaction.</li><li><strong>Route Cant.</strong> Spoken commands in route shorthand; Insight DC 17 catches the gist.</li><li>Skills: Investigation +6, Insight +6, Persuasion +5, Deception +5, History +6, Arcana +4.</li><li>Saving throws: Wis +5, Int +5.</li><li>Equipment: route lock-pin, Warden Instruction Strip, bone fingerstamp matching his warden authority mark.</li></ul><h3>If captured alive</h3><p>Negotiates. Wants the party to leave the waystation intact and to allow him to file the day's events in a way that does not implicate him personally. Will trade information about Haskur's transfer, Kethren's authority, the next waystation, and Korre's channel closure for safe passage. Will not discuss the deeper authority.</p>"
  },
  {
    name: "Silent Courier",
    archetype: "scoutCaptain",
    bio: "<h2>Silent Courier</h2><p><em>A subordinate route courier. Generic drop-in for Phase 9 transit encounters. Distinct from the Phase 7 Silent Scout (which is a Cairn Hills surface-side scout).</em></p><h3>Quick read</h3><ul><li>Indeterminate age, hard to tell. Lean. Always at full attention.</li><li>Grey-and-bone clothing, similar to Kethren but with simpler braid and no fingerstamp.</li><li>Smoked-quartz route-mask hanging at the belt. Reinforced boots.</li><li>Small writing case with brass clasps at the hip, containing route notes and (possibly) one sealed dispatch.</li></ul><h3>Motive</h3><p>Get past the waystation and on to wherever they are going. Does not work for Korre directly &mdash; works for the route's dispatch system. Engages the party only if directly threatened, and even then prefers to disengage.</p><h3>Tell</h3><p>Reaches for the route-mask at their belt when about to flee &mdash; checking it is still there before bolting.</p><h3>Useful lines</h3><ul><li>(usually silent)</li><li>\"Channel.\"</li><li>\"Authorised passage.\"</li><li>\"Escort declared.\"</li><li>\"If you do not let me go, the route will recall me. I will tell you anything you want if you do not let them recall me.\"</li></ul><h3>Stat block</h3><p><strong>Scout Captain (CR 3 base, adjusted)</strong>:</p><ul><li>HP 58 (9d8 + 18). AC 14.</li><li>Multiattack: short-sword + hand crossbow.</li><li>Speed 35 ft. Disengage as bonus action.</li><li><strong>Evasive.</strong> Dexterity-save effects for half damage take no damage on success.</li><li><strong>Route-Mask.</strong> Ignores difficult terrain from smoke/dust/low light; darkvision 60 ft. while worn.</li><li>Skills: Stealth +7, Survival +5, Perception +6.</li><li>Equipment: short-sword, hand crossbow with 20 bolts, route-mask, writing case (route notes + 1 sealed dispatch).</li></ul><h3>Capture value</h3><p>A captured Silent Courier is a major Phase 9 intelligence prize. The sealed dispatch in their writing case tells the party where the courier was going and roughly what category of business they were carrying. Reading: Investigation DC 14, History DC 16 for full translation.</p>"
  },
  {
    name: "Tally Sentinel",
    archetype: "animatedArmor",
    bio: "<h2>Tally Sentinel</h2><p><em>A route construct that wakes only on forced gate use or Alert Clock 5. Standing dormant in a wall niche of the Black Ledger Gate antechamber. New for Phase 9.</em></p><h3>Quick read</h3><ul><li>Roughly humanoid, four feet tall.</li><li>Body assembled from waystation mason-work blocks &mdash; the same dressed stone with the same black mineral seams as the rest of the waystation.</li><li>Stone tablet for a face, bearing a single incised mark &mdash; the deeper-authority mark (shallow arc with three notches).</li><li>Mute. Does not speak. Does not attack first.</li></ul><h3>Function</h3><p>The sentinel's function is to <strong>witness procedural irregularities</strong>. When awakened, it steps from its niche and takes a position adjacent to the irregularity. It does not attack unless attacked. If a PC drops to 0 HP within 5 feet, the sentinel uses its reaction to <em>witness</em>: it presses its tablet-face to the unconscious PC's forehead. The PC is not damaged. The PC is <strong>marked</strong> &mdash; invisible to mundane senses but detectable by Detect Magic at the Final Threshold Landing and beyond.</p><h3>Stat block</h3><p><strong>Animated Armor variant (CR 1 base, adjusted upward to CR 4)</strong>:</p><ul><li>HP 52 (7d10 + 14). AC 17.</li><li>Speed 25 ft.</li><li>STR 16 (+3), DEX 9 (-1), CON 16 (+3), INT 1 (-5), WIS 3 (-4), CHA 1 (-5).</li><li>Multiattack: 3 stone-fist attacks per turn (+6 to hit, 1d8 + 4 bludgeoning each).</li><li>Damage Immunities: poison, psychic.</li><li>Damage Resistances: bludgeoning, piercing, and slashing from nonmagical attacks not made with adamantine weapons.</li><li>Condition Immunities: blinded, charmed, deafened, exhaustion, frightened, paralyzed, petrified, poisoned.</li><li>Senses: blindsight 60 ft. (can't see beyond it), passive Perception 6.</li><li>Languages: none.</li></ul><h3>Special: Witnessing (reaction, 1/encounter)</h3><p>When a creature within 5 feet drops to 0 HP, sentinel may use its reaction to press its tablet to the creature's forehead. The creature takes no damage. The creature is <em>marked</em>; the mark persists indefinitely and is detectable by Detect Magic.</p><h3>If not engaged</h3><p>The sentinel follows the party at walking pace, observing, and stops at the Lower Route Fork. It does not pursue past the threshold. The party can simply walk past it.</p><h3>Carry-forward</h3><p>Witnessed PCs carry a <strong>route-mark</strong>. In Phase 10 and beyond, this mark may cause route personnel to recognise them, route gates to respond differently to them, or surface allies' Detect Magic to reveal the mark.</p>"
  },
  {
    name: "Merrit Osk",
    archetype: "commoner",
    bio: "<h2>Merrit Osk &mdash; The Unclaimed Witness</h2><p><em>Optional NPC found in the Sealed Witness Cell. Former surface courier, taken below as a witness, awaiting transfer that has been deferred. New for Phase 9.</em></p><h3>Quick read</h3><ul><li>Human. Mid-thirties. From Greyhawk City's Free Quarter.</li><li>Working clerk for a Kestrel and Reed branch in Hardby; took on courier work for extra pay.</li><li>Brown hair pulled back severely. Practical clothing, worn for three weeks without change.</li><li>Steady hands. Precise speech &mdash; the speech pattern of someone who reads aloud for a living.</li></ul><h3>Motive</h3><ul><li>Go home. Her mother is in the Free Quarter at fourteen Cooper's Lane.</li><li>Not be witnessed. She has gathered enough fragmentary route information in three weeks to understand that being formally witnessed and transferred means becoming \"permanent cargo.\"</li><li>Be useful. A clerk's instinct: she will give the party concrete, organised information in exchange for any prospect of leaving the cell alive.</li></ul><h3>Public behavior</h3><p>Quiet. Precise. Responds to direct questions with direct answers. Will not volunteer broadly.</p><h3>Tell</h3><p>When lying or omitting, she folds her hands in her lap. Otherwise her hands rest on the bench. Insight DC 13 catches it. <em>She is bad at lying.</em></p><h3>Useful lines</h3><ul><li>\"They asked my name above. Below they asked what I proved.\"</li><li>\"I think I am awaiting transfer. I do not want to be transferred.\"</li><li>\"My mother is in the Free Quarter. She lives at fourteen Cooper's Lane.\"</li><li>\"I do not remember the interviewer's face. I have tried.\"</li><li>\"If you take me out, I will not slow you. If you cannot take me out, please tell my mother I am sorry.\"</li></ul><h3>What she knows</h3><ul><li>People are processed by marks.</li><li>Kethren-like couriers outrank surface handlers.</li><li>Surface names are burned or converted.</li><li><strong>\"Recovery\" means a planned retrieval after controlled failure.</strong> She is the only NPC who will explain this in surface words.</li><li>The next gate leads to a larger route, not a settlement.</li><li>The interviewer's face is unrecoverable from her memory. <em>This is genuine.</em></li></ul><h3>Stat block</h3><p><strong>Commoner (CR 0)</strong>:</p><ul><li>HP 12. AC 10.</li><li>Skills: Investigation +3, Insight +2, Sleight of Hand +1.</li><li><strong>Special: Clerk's Eye.</strong> Reads surface-script documents at advantage. Can read route shorthand at base proficiency (DC 13 instead of usual DC 15).</li><li>Equipment: nothing. The route took her belt, her boots, and her courier satchel when she was first held.</li></ul><h3>Carry-forward</h3><p>If Merrit is brought to surface alive, she becomes one of the most powerful surface-side assets the party can produce from Phase 9. She can be presented to Iren as a sworn statement; to Caelith as a witness; to the Yeomanry Council as evidence.</p>"
  }
];

console.log(`Generating ${NPCS.length} Phase 9 actor JSONs...`);
const outDir = path.join(ROOT, "packs", "_source", "phase-9-actors");
fs.mkdirSync(outDir, { recursive: true });
for (const npc of NPCS) {
  const a = buildActor(npc);
  const fname = npc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fs.writeFileSync(path.join(outDir, `actor-${fname}.json`), JSON.stringify(a, null, 2) + "\n");
}
console.log(`✓ Wrote ${NPCS.length} actor JSONs to ${path.relative(ROOT, outDir)}/`);
