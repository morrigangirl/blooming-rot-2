#!/usr/bin/env node
// Phase 8 NPC actor generator.
//
// Creates three new drop-in actors for Phase 8:
//   - Route-Cleaner Lead (Bandit Captain template; CR 2)
//   - Deep-Route Courier (Scout Captain template; CR 3)
//   - Stone-Witness (Animated Armor template; CR 1; Permission Door guardian)
//
// Returning enemies (Route-Cleanser Agent, Silent Scout, Hired Greyhawk Tough)
// are already in Phase 7 actors and used directly via drop-in.

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
};

function makeId(prefix, key) {
  const h = crypto.createHash("sha1").update(key).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

function buildActor({ name, archetype, bio }) {
  const tpl = TEMPLATES[archetype];
  if (!tpl) throw new Error(`Unknown archetype: ${archetype}`);
  const _id = makeId("BR2P8A", `phase8|${name}`);
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
    "blooming-rot-2": { kind: "named-npc", archetype, phase: "8" }
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
    name: "Route-Cleaner Lead",
    archetype: "banditCaptain",
    bio: "<h2>Route-Cleaner Lead</h2><p><em>Captain-grade route-cleaner. Korre's senior on-site supervisor at Tarnsmere. New for Phase 8.</em></p><h3>Quick read</h3><ul><li>Mid-forties. Clean hands. A polished cudgel at the belt, an expensive-but-discreet rapier under a long coat.</li><li>Carries a leather case of paperwork &mdash; route notices, dispatch orders, blank permission slips with pre-stamped firm marks.</li><li>Speaks Aerdy commercial-court formal register. Scrupulously polite. Will negotiate before fighting.</li></ul><h3>Goals</h3><p>Keep the site quiet. Keep the door unforced. Keep the party from descending. Will <em>parley before lethal force</em> &mdash; the Lead does not want a body on Tarnsmere ground that has to be explained later.</p><h3>Tell</h3><p>When agitated, the Lead taps the brass clasp of the paperwork case &mdash; one soft, deliberate tap with the index finger. Three taps means a runner is about to be dispatched.</p><h3>Stat block</h3><p><strong>Bandit Captain (CR 2)</strong> with the following adjustments:</p><ul><li>HP 65 (10d8 + 20).</li><li>AC 15 (studded leather).</li><li>Multiattack: rapier + 2 daggers, or rapier + parley action.</li><li>Investigation +4, Insight +2, Deception +4, Persuasion +4 (paperwork specialist).</li><li>One sealed leather case containing route-cleaner instructions (Handout 4) and one blank pre-stamped permission slip.</li></ul><h3>If captured alive</h3><p>The Lead negotiates. Will offer specific information in exchange for safe passage out of Greyhawk City &mdash; specifically, the door's listening-tube location, the names of two senior route-cleaners in Greyhawk, and the route name (&ldquo;the First Under-Road&rdquo;), but not Korre's address, not Korre's superior, not anything that names &ldquo;K.&rdquo; They have a family they want to retire to.</p><h3>If killed</h3><p>Their paperwork case is the prize. Handout 4 (Route-Cleaner Instructions) is on their body. Their cudgel is plain but well-balanced (treat as a +0 magical cudgel for sentimental value; 50 gp resale).</p>"
  },
  {
    name: "Deep-Route Courier",
    archetype: "scoutCaptain",
    bio: "<h2>Deep-Route Courier</h2><p><em>A specialised courier who travels the under-road. Transient at Tarnsmere; will rarely engage in extended combat. New for Phase 8.</em></p><h3>Quick read</h3><ul><li>Late thirties to early fifties. Lean, weathered, dressed for long crossings &mdash; reinforced boots, a route-mask hung at the belt (a leather mask with smoked-quartz lenses; used in the under-road), a writing case with brass clasps.</li><li>A short-sword and a hand crossbow. Does not show them unless attacked.</li><li>Carries a brass token at the belt &mdash; an older, more weathered version of the Tarnsmere descent token, marked with a route-account number rather than a date.</li></ul><h3>Goals</h3><p>Get past Tarnsmere and on to wherever they are going. <em>The courier does not work for Korre directly</em>; they work for the route. They will engage the party only if directly threatened, and even then they will prefer to disengage rather than die. <strong>The courier knows things about Phase 9 that no one else in Phase 8 does.</strong></p><h3>Tell</h3><p>The courier reaches for the route-mask at their belt when they are about to flee &mdash; checking it is still there before bolting downstair.</p><h3>Stat block</h3><p><strong>Scout Captain (CR 3)</strong> with the following adjustments:</p><ul><li>HP 58 (9d8 + 18).</li><li>AC 14 (studded leather + cloak of dust-grey).</li><li>Multiattack: short-sword + hand crossbow.</li><li>Stealth +6, Survival +4, Perception +5.</li><li>Special: <em>Route-Mask</em>. While the mask is worn, the courier ignores difficult terrain caused by smoke, dust, or low light, and has darkvision 60 ft.</li><li>Special: <em>Disengage as a bonus action.</em></li></ul><h3>If captured alive</h3><p>The courier is the GM's most valuable Phase 9 NPC if captured. They have walked the First Under-Road and the longer under-roads beyond. They will not betray <em>what they have seen</em>, but they will, under sustained pressure (Persuasion 18 or sustained interrogation over a day), give the party:</p><ul><li>A name for the First Under-Road: it is called <em>the courier-road</em> by those who walk it.</li><li>An estimate of distance: the courier-road runs east-southeast under the Cairn Hills for at least sixty miles before branching.</li><li>The location of the first major junction: a milestone marked &ldquo;ECN/IV&rdquo; (Empire's Council Numeral Four), where four under-roads meet.</li><li>The standing advice every under-road walker is given: <em>&ldquo;Greet stone politely. Do not name what passes you. Do not bring a torch on the third day.&rdquo;</em></li></ul><h3>If killed</h3><p>The brass-clasped writing case contains: a sealed letter (currently being carried below; if Lockdown 4+, addressed to a recipient with the single initial &ldquo;E.&rdquo;), route notes from the past three crossings (mileage, conditions, hazards), and the courier's route-account token. <em>The sealed letter is one of the campaign's quietest tells about &ldquo;E.&rdquo; The handwriting on the envelope is plain. The seal is unmarked.</em></p>"
  },
  {
    name: "Stone-Witness",
    archetype: "animatedArmor",
    bio: "<h2>Stone-Witness</h2><p><em>A construct that wakes if the Permission Door is forced (Method E). New for Phase 8.</em></p><h3>Quick read</h3><ul><li>Roughly humanoid, three feet tall, dressed-stone body assembled from blocks that match the threshold complex's mason work.</li><li>A stone tablet for a face. No eyes, no mouth. The tablet bears a single incised mark &mdash; the blackened-hill symbol.</li><li>Mute. Does not speak. Does not attack first. <em>It observes.</em></li></ul><h3>What it does</h3><p>The Stone-Witness wakes from a wall-recess to the right of the Permission Door when the door's mechanism is breached without paperwork. It steps out, takes a position five feet from the breach, and watches.</p><p>If the party leaves, the Stone-Witness does not pursue. It remains at the breach until the door's mechanism resets (which requires repair).</p><p>If the party engages it in combat, the Stone-Witness fights. It is dangerous but slow. <strong>Its purpose is not to kill the party; its purpose is to record them.</strong> If a PC is reduced to 0 HP, the Stone-Witness pauses for one round, presses its tablet-face against the unconscious PC's forehead, and then resumes combat. <em>This is the witnessing.</em> The PC is unhurt by this contact; the witness has merely recorded them.</p><h3>Stat block</h3><p><strong>Animated Armor variant (CR 1, adjusted upward to CR 2)</strong>:</p><ul><li>HP 38 (5d8 + 15).</li><li>AC 16 (natural stone armor).</li><li>Speed 25 ft.</li><li>STR 16 (+3), DEX 9 (-1), CON 16 (+3), INT 1 (-5), WIS 3 (-4), CHA 1 (-5).</li><li>Multiattack: <em>3 stone-fist attacks per turn</em> (+5 to hit, 1d8 + 3 bludgeoning each).</li><li>Damage immunities: poison, psychic. Damage resistances: bludgeoning, piercing, and slashing from nonmagical attacks not made with adamantine weapons.</li><li>Condition immunities: blinded, charmed, deafened, exhaustion, frightened, paralyzed, petrified, poisoned.</li><li>Senses: blindsight 60 ft. (can't see beyond it), passive Perception 6.</li><li>Languages: none.</li></ul><h3>Special: Witnessing</h3><p>Once per encounter, when a PC drops to 0 HP within 5 feet, the Stone-Witness uses its reaction to <em>witness</em>: it presses its tablet to the PC's forehead. The PC is not damaged. The Stone-Witness's tablet faintly warms. <em>This is the construct fulfilling its function.</em></p><h3>Carry-forward</h3><p>If the Stone-Witness witnessed any PC at 0 HP, that PC is marked. The mark is invisible to mundane senses but detectable by <em>Detect Magic</em> at the Final Threshold Landing and beyond. <em>The descent below now knows that PC's name in the way the door knows it &mdash; as a record.</em> This may matter in Phase 9 or later.</p><h3>If defeated</h3><p>The construct falls apart into its component stones. The mason-work of the body matches the threshold complex's mason-work exactly; <em>it was built from the same quarry, by the same hands</em>. Investigation DC 14 on the stones identifies them as Class VII Tarnsmere mason-grade. The blackened-hill mark on the tablet is the same mark as the cairn, the landing, and the Permission Door.</p>"
  }
];

console.log(`Generating ${NPCS.length} Phase 8 actor JSONs...`);
const outDir = path.join(ROOT, "packs", "_source", "phase-8-actors");
fs.mkdirSync(outDir, { recursive: true });
for (const npc of NPCS) {
  const a = buildActor(npc);
  const fname = npc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fs.writeFileSync(path.join(outDir, `actor-${fname}.json`), JSON.stringify(a, null, 2) + "\n");
}
console.log(`✓ Wrote ${NPCS.length} actor JSONs to ${path.relative(ROOT, outDir)}/`);
