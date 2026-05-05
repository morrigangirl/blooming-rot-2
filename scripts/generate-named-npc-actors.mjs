#!/usr/bin/env node
// Blooming Rot 2 — generator for named non-combatant actors.
//
// Reads the extracted MM 2024 Actor pack and uses appropriate stat blocks
// (Commoner, Noble, Spy, Priest Acolyte, Priest, Druid, Mage Apprentice,
// Mage, Warrior Veteran, Knight, Bandit Captain, Pirate) as templates for
// each named character. Each generated actor:
//
//   - Copies the chosen MM template's full system block, items, prototypeToken
//   - Sets a BR2-local _id and _key
//   - Sets a custom name and a one-paragraph BR2 biography
//   - Drops into the appropriate phase-N-actors / sandbox-actors source dir
//   - Sets _stats.compendiumSource to the real MM UUID for runtime linkage
//
// Re-run safely — IDs are deterministic from name+phase.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MM_ACTORS = "/tmp/br2-source-extract/dnd-monster-manual/actors";

// === Load MM templates by name ===

function loadTemplate(name) {
  for (const f of fs.readdirSync(MM_ACTORS)) {
    const j = JSON.parse(fs.readFileSync(path.join(MM_ACTORS, f), "utf8"));
    if (j.name === name) return j;
  }
  throw new Error(`MM template not found: ${name}`);
}

const TEMPLATES = {
  commoner: loadTemplate("Commoner"),
  noble: loadTemplate("Noble"),
  spy: loadTemplate("Spy"),
  acolyte: loadTemplate("Priest Acolyte"),
  priest: loadTemplate("Priest"),
  druid: loadTemplate("Druid"),
  mage: loadTemplate("Mage"),
  apprentice: loadTemplate("Mage Apprentice"),
  veteran: loadTemplate("Warrior Veteran"),
  knight: loadTemplate("Knight"),
  banditCaptain: loadTemplate("Bandit Captain"),
  pirate: loadTemplate("Pirate"),
  guard: loadTemplate("Guard")
};

// === Helpers ===

function makeId(prefix, key) {
  // Deterministic 16-char alphanumeric ID — hash the key for collision-free
  // generation across long/similar names.
  const h = crypto.createHash("sha1").update(key).digest("hex");
  const cleaned = (prefix + h).replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.padEnd(16, "0").substring(0, 16);
}

function nameSlug(name, n) {
  // Take first letters of words, then padding from full string
  return name.replace(/[^a-zA-Z0-9]/g, "").substring(0, n);
}

function buildActor({ name, phase, archetype, bio, folder = null }) {
  const tpl = TEMPLATES[archetype];
  if (!tpl) throw new Error(`Unknown archetype: ${archetype}`);

  const slug = nameSlug(name, 11);
  const idPrefix = phase === "sandbox" ? "BR2Sbx" : `BR2P${phase}A`;
  // Use full name as hash key so similar prefixes don't collide
  const _id = makeId(idPrefix, `${phase}|${name}`);

  // Deep clone the template
  const actor = JSON.parse(JSON.stringify(tpl));

  // Find the right MM pack name from the template's own data (it should be 'actors')
  const mmUuid = `Compendium.dnd-monster-manual.actors.Actor.${tpl._id}`;

  // Reset identifying fields
  actor._id = _id;
  actor._key = `!actors!${_id}`;
  actor.name = name;
  actor.folder = folder ?? null;
  actor.sort = 0;
  actor.ownership = { default: 0 };

  // BR2 biography
  if (!actor.system.details) actor.system.details = {};
  actor.system.details.biography = {
    value: `<p>${bio}</p>`,
    public: ""
  };

  // Stats: link back to MM source
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
    core: {
      ...((actor.flags && actor.flags.core) || {}),
      sourceId: mmUuid
    },
    "blooming-rot-2": {
      kind: "named-npc",
      archetype,
      phase: String(phase)
    }
  };

  // Re-key all embedded items so they are valid for the new actor _id
  if (Array.isArray(actor.items)) {
    actor.items = actor.items.map((item, idx) => {
      // Generate a deterministic short item id
      const itemId = makeId(`BR2I`, `${name}|${idx}|${item.name || "item"}`);
      return {
        ...item,
        _id: itemId,
        _key: `!actors.items!${_id}.${itemId}`
      };
    });
  } else {
    actor.items = [];
  }

  // Reset effects keys similarly
  if (Array.isArray(actor.effects)) {
    actor.effects = actor.effects.map((eff, idx) => {
      const effId = makeId(`BR2E`, `${name}|${idx}|${eff.name || "eff"}`);
      return {
        ...eff,
        _id: effId,
        _key: `!actors.effects!${_id}.${effId}`
      };
    });
  } else {
    actor.effects = [];
  }

  // Token: set its name + actorId-link
  if (actor.prototypeToken) {
    actor.prototypeToken.name = name;
  }

  return actor;
}

// === The data table — 73 named NPCs ===

const NPCS = [
  // ============================================================
  // PHASE 1 — Loftwick's return
  // ============================================================
  { phase: 1, name: "Brennan Kepf", archetype: "commoner",
    bio: "Cook at the Little Palace, sixties, decades in service. Knocks at midnight in the Cook's Niece complication if the GM uses that hook. Knows every name and routine of the household." },
  { phase: 1, name: "Mira Holt", archetype: "commoner",
    bio: "Kitchen-girl at the Little Palace, three days in service when the party arrives. Quiet, watchful, has not yet learned where the Strong Room is." },
  { phase: 1, name: "Elsbet Vael", archetype: "noble",
    bio: "Household steward of the Little Palace. Holds the Strong Room key. Brings the post in Scene 7. Reappears in Phase 5 when the party returns to Loftwick. Aerdi-trained, scrupulously discreet." },
  { phase: 1, name: "Holyn Sevarian", archetype: "spy",
    bio: "Rel Astran counting-house clerk Caelith names as a witness who can corroborate the Loftwick correspondence. Lives by daylight in a counting-room and by night in the Aerdi advocate quarter." },
  { phase: 1, name: "Haskur Vandrell", archetype: "spy",
    bio: "The surviving antagonist named in the Strong Room evidence. Off-screen for most of the campaign — an Aerdi-aligned cutout passing instructions to Sereth's hand. Spotted by Tellan Verth at the Brass Crow in Greyhawk during Phase 5." },

  // ============================================================
  // PHASE 2 — The Dead Man's Receipts
  // ============================================================
  { phase: 2, name: "Arthen Moll", archetype: "commoner",
    bio: "Wagon-driver who offers the party an alternate route in the 'Three Travel Approaches' scene. Honest, slow, knows the Yeomanry roads as well as anyone." },
  { phase: 2, name: "Brell Kostan", archetype: "veteran",
    bio: "Yeomanry sergeant, twenty years in. Disarms Merev Sarth in the pre-dawn retrieval-attempt scene. Stat block: MM Warrior Veteran. Reluctant participant, follows orders, dislikes the operation he's part of." },
  { phase: 2, name: "Doman Reith", archetype: "commoner",
    bio: "The party reaches him too late. His final words are 'I am sorry. They had a writ.' His receipts and his death are the case the party is investigating. Stat block included for narrative tokens; he has no living-actor function." },
  { phase: 2, name: "Doril Veth", archetype: "noble",
    bio: "Tamsin Moraven's chief clerk at her counting house on Tannerway. Mid-fifties, methodical, has run her books for eleven years. Knows what the missing receipts mean and is afraid of saying so out loud." },
  { phase: 2, name: "Reln Pollow", archetype: "acolyte",
    bio: "Contract-physician. Confronted at his office in three Phase 2 scenes. Forty, careful with his words, knows Tamsin's case from when he attended Doman in his last hour." },
  { phase: 2, name: "Halir Anwic", archetype: "veteran",
    bio: "Yeomanry sergeant who was on Tamsin Moraven's case until he was reassigned. Approaches the party privately with what he was not allowed to write down. Senior to Brell Kostan, more cynical." },
  { phase: 2, name: "Vellin Moraven", archetype: "commoner",
    bio: "Tamsin Moraven's husband. Potential hostage thread in Phase 2; at risk if the party moves too publicly. Forty, mild, manages the household while Tamsin runs the counting house." },
  { phase: 2, name: "Veshen Cindren", archetype: "noble",
    bio: "Senior partner of Cindren & Vhal in Greyhawk. Hosts the Festival of Lamps reception where the party may first encounter the firm's leadership. Cordial, evasive, careful." },
  { phase: 2, name: "Merro Gilst", archetype: "commoner",
    bio: "Witness whose room is tossed during Phase 2 evidence-gathering. Identified in research; the party may track him for what he saw. Anxious, lives alone, keeps written copies of every receipt he ever signs." },

  // ============================================================
  // PHASE 3 — Hardby Investigation
  // ============================================================
  { phase: 3, name: "Hella Voren", archetype: "commoner",
    bio: "Veska Maelan's apprentice scribe at the Quay clearing-house. Twenty-three, half-Suel, daughter of harbor pilots. Unrelated to the false 'Voren' name on Haskur Vandrell's letter." },
  { phase: 3, name: "Joren Krill", archetype: "spy",
    bio: "Hardby weighmaster, on Cindren & Vhal's payroll. Named in Tamsin Moraven's unsent letters as the man who signed off on weights that did not exist. Knows enough to be dangerous; trades information for safe passage." },
  { phase: 3, name: "Dren Marsh", archetype: "veteran",
    bio: "Former harbor-watch corporal, now sleeping guard at the C&V Hardby branch. Stat block: MM Warrior Veteran (per journal attribution). Half-asleep when first encountered; sharper than he looks." },
  { phase: 3, name: "Halver Onn", archetype: "noble",
    bio: "Mid-fifties vault clerk at the C&V Hardby branch. Former Aerdi treasury clerk. Recognizes the firm's seals on sight and can read Aerdi commercial cipher fluently." },
  { phase: 3, name: "Edrin Saetar", archetype: "commoner",
    bio: "Sculptor master in the Salters' Quarter. Tutoring Ailen Moraven free of charge — a small kindness in honor of Tamsin's father, who he served under decades ago." },
  { phase: 3, name: "Olo Crask", archetype: "banditCaptain",
    bio: "Retired Aerdi marine captain hired to guard the recovery target. Stat block: MM Bandit Captain. Leads five Thugs (MM). Will surrender for a fair price and a quiet exit." },
  { phase: 3, name: "Reyna Worth", archetype: "spy",
    bio: "Cindren-aligned overseer who runs a daily check at the third bell. Fifties, Aerdi expat, paid by the firm to notice things and to forget them in the right order." },
  { phase: 3, name: "Sarro Pell", archetype: "spy",
    bio: "Widow housekeeper for Castrian Vell, eleven years' service. 'Notices everything.' Late forties, Hardby-born, distantly related to Ostren Pell of Loftwick (no living connection)." },
  { phase: 3, name: "Vella Tannin", archetype: "spy",
    bio: "Sympathetic clerk at the C&V Hardby branch. Path-2 contact who feeds the party intel without revealing herself to her employer. Recurs into Phase 4 and Phase 5." },
  { phase: 3, name: "Yorra Mel", archetype: "pirate",
    bio: "Hardby ship captain who runs paying passengers east when the harbor commission has its eyes elsewhere. Stat block: MM Pirate. Recurs in the Hardby sandbox and Phase 4 arrival options." },
  { phase: 3, name: "Olfard", archetype: "spy",
    bio: "Barkeep at the Coopered Wreck on the Hardby waterfront. Sixty, broken nose from a long-ago brawl, pretends not to listen and remembers everything. Will not fight; will sell what he knows for the right reason." },
  { phase: 3, name: "Tamsin Moraven", archetype: "commoner",
    bio: "The rescued captive whose disappearance triggers Phase 2 and 3. Forty, runs (ran) a counting house on Tannerway. Mother of Ailen, wife of Vellin. Recovered alive but altered by the experience." },

  // ============================================================
  // PHASE 4 — Rel Astra Confrontation
  // ============================================================
  { phase: 4, name: "Adra Sayan", archetype: "spy",
    bio: "Therion Halask's old uncompromised colleague. Will give a statement to a properly seated commercial-court advocate. Sixties, retired from active practice, lives in a small house off Imperial Way." },
  { phase: 4, name: "Mistress Aldaen Veth", archetype: "noble",
    bio: "Senior Commissioner of the Rel Astra Harbor Commission, age 68. Aerdy noble who has held her seat through three imperial transitions. Holds the deciding vote on most matters; cordial to all parties on principle." },
  { phase: 4, name: "Captain Volin Reach", archetype: "knight",
    bio: "Imperial garrison harbor liaison. Holds the Imperial Seat on the Harbor Commission. Stat block: MM Knight. Aerdy-loyal but procedurally honest; will not vote for what he cannot see in writing." },
  { phase: 4, name: "Magister Eled Ruth", archetype: "apprentice",
    bio: "Civic Seat holder, irritable academic in his late fifties. Stat block: MM Mage Apprentice. Knows commercial law better than half the advocates in the city; has no patience for ceremony." },
  { phase: 4, name: "Master Hold Veshanen", archetype: "noble",
    bio: "Commerce Seat holder, Sereth-aligned merchant. Forty-five, smooth, owes Sereth's firm money. Will vote with Sereth unless given a clear public reason not to." },
  { phase: 4, name: "Magister Velren Ostrach", archetype: "noble",
    bio: "Aerdi Commercial Court judge. Path-1 venue if the party wants Sereth heard in a court rather than a commission. Stern, by-the-book, despises both sides equally." },
  { phase: 4, name: "Lyla Vesh", archetype: "noble",
    bio: "Imperial advocate handling the Cindren & Vhal case. Her reassignment is a Pressure-Clock beat. Thirties, Aerdy-trained, painfully honest in a system that makes that expensive." },
  { phase: 4, name: "Solvard Mein", archetype: "noble",
    bio: "Senior councilor of the Old Harbor Ward, openly Sereth-aligned. Tables Belven Astor's motions whenever they threaten the firm's interests. Sixties, jovial in person, ruthless in committee." },

  // ============================================================
  // PHASE 5 — The Small Matter (Loftwick aftermath)
  // ============================================================
  { phase: 5, name: "Iren Velash", archetype: "apprentice",
    bio: "Half-Suel manuscript dealer in Greyhawk's Garden Quarter. Intel contact whose paper-trail expertise helps the party trace Haskur Vandrell. Forty, quiet, knows everyone in the Aerdy book trade." },
  { phase: 5, name: "Pell Garven", archetype: "commoner",
    bio: "Honest woman who runs the civic courier desk in the Loftwick Audit Hall. No relation to Ostren Pell (a name coincidence the party will need to verify). Knows every courier route and timetable." },
  { phase: 5, name: "Sera Pell", archetype: "commoner",
    bio: "Ostren Pell's daughter, twenty-two, dressmaker apprentice on Wick Lane. The hostage thread that keeps Ostren cooperating. Quiet, pragmatic, has known she was the leverage for years." },
  { phase: 5, name: "Tellan Verth", archetype: "veteran",
    bio: "Retired militia sergeant in the Greyhawk Foreign Quarter. Spotted Haskur Vandrell at the Brass Crow on a recent evening. Sixty, lame in one knee, drinks at the same tavern every night." },
  { phase: 5, name: "Tellis Maro", archetype: "noble",
    bio: "Cindren-aligned junior advocate. Rumor source for Vector D in the Phase 5 leak operation. Twenty-eight, ambitious, willing to talk to the right person at the right cost." },
  { phase: 5, name: "Edrik Vone", archetype: "spy",
    bio: "Greyhawk customs and courier archive operator. Forties, fastidious, keeps written records that he is not legally required to keep. Will exchange copies for protection of his own paperwork." },
  { phase: 5, name: "Ven Sallis", archetype: "commoner",
    bio: "Quiet old printer beside the Audit Hall stream. Sixty-two, prints civic forms and the occasional private letter. Operates a node in the Phase 5 courier-chain location." },
  { phase: 5, name: "Trell", archetype: "commoner",
    bio: "The courier himself. First name only — overheard from a baker's apprentice. Mid-twenties, runs Loftwick-to-Greyhawk in three days flat, paid in coin he does not deposit." },

  // ============================================================
  // SANDBOX — per-PC anchors and crafting/training masters
  // ============================================================

  // -- Loftwick --
  { phase: "sandbox", folder: "Loftwick", name: "Brother Ashan Vell", archetype: "priest",
    bio: "Cleric of Heironeous at the Cloister of the Open Way in Loftwick. Elle's primary anchor in this city. Mid-fifties, plain-spoken, runs the morning training in the practice yard." },
  { phase: "sandbox", folder: "Loftwick", name: "Sergeant Doral Hurst", archetype: "veteran",
    bio: "Yeomanry militia sergeant at the Southwall Yard archers' practice. Gianni's primary anchor in Loftwick. Forty, strict, will train any soldier who will train at his hours." },
  { phase: "sandbox", folder: "Loftwick", name: "Master Olen Ferrick", archetype: "apprentice",
    bio: "Bookbinder and proprietor of a small reading room beside the Civic Way. Selvara's primary Loftwick anchor. Mid-sixties, half-elf, keeps copies of restricted commercial law for trusted clients." },
  { phase: "sandbox", folder: "Loftwick", name: "Mistress Mira Welk", archetype: "spy",
    bio: "Proprietor of 'Old Mira's Pawn-and-Borrow' on Wick Lane. Cam's primary Loftwick anchor. Forty-five, halfling, fence and information broker for those who can pay her in trust as well as coin." },
  { phase: "sandbox", folder: "Loftwick", name: "Hesp Veld", archetype: "commoner",
    bio: "Civic Way smith. Sixties, halfling, runs the only forge in Loftwick that takes commissions for halfling-fitted gear without comment." },
  { phase: "sandbox", folder: "Loftwick", name: "Mara Olest", archetype: "commoner",
    bio: "Loftwick harness-maker who fits halfling-sized leather and chain. Fifties, fast, charges fair." },
  { phase: "sandbox", folder: "Loftwick", name: "Old Tellis", archetype: "commoner",
    bio: "Loftwick bowyer. Eighty, slow, does the best yew-and-horn work in the Yeomanry. Named comparatively in Hardby talk ('not as good as Old Tellis')." },
  { phase: "sandbox", folder: "Loftwick", name: "Mistress Reva Lodd", archetype: "mage",
    bio: "Retired Yeomanry magical theorist, age 81. Lives in Two-Brooks village outside Loftwick. Will speak with Selvara on advanced theory if introduced by Master Ferrick." },

  // -- Hardby --
  { phase: "sandbox", folder: "Hardby", name: "Sister Wren", archetype: "acolyte",
    bio: "Vowed sister at the Temple of Ehlonna in Hardby. Elle's primary Hardby anchor. Twenty-eight, runs the practice yard hours that align with the party's downtime." },
  { phase: "sandbox", folder: "Hardby", name: "Captain Tarlin Fels", archetype: "knight",
    bio: "Captain of the Hardby West Gate watch-yard. Gianni's primary Hardby anchor. Forty-five, Aerdy-trained, runs the only formal officer's drill in the city." },
  { phase: "sandbox", folder: "Hardby", name: "Mistress Vella Korr", archetype: "apprentice",
    bio: "Proprietor of a tea-house in the Merchant Quarter and host of the Scribe's Tea Society. Selvara's primary Hardby anchor. Sixties, half-elf, brings together the city's quiet sorcerers and scholars." },
  { phase: "sandbox", folder: "Hardby", name: "Hesp Olfair", archetype: "spy",
    bio: "Halfling cant-speaker and fence in the Hardby underworld. Cam's primary Hardby anchor. Forty, runs a small but reliable network across all four sandbox cities." },
  { phase: "sandbox", folder: "Hardby", name: "Master Vellan", archetype: "commoner",
    bio: "Aerdy-trained bowyer in the Hardby Merchant Quarter. Mid-fifties, exacting, makes high-end longbows and the occasional Aerdi composite." },
  { phase: "sandbox", folder: "Hardby", name: "Master Wenra Holst", archetype: "commoner",
    bio: "Hardby's best weaponsmith. Fifty, runs a busy shop on the Iron Way, takes commissions four months out." },
  { phase: "sandbox", folder: "Hardby", name: "Sister Marrin", archetype: "acolyte",
    bio: "Vowed sister at the Temple of Ehlonna, age 22. Sub-Team Mini-Quest target — went missing during a remote pilgrimage. Devout, naive in dangerous ways." },
  { phase: "sandbox", folder: "Hardby", name: "Sianna Reff", archetype: "apprentice",
    bio: "Hardby sorcerer, age 23, Tea Society absentee. Sub-Team Mini-Quest target — stopped attending after an incident the Society does not discuss publicly." },
  { phase: "sandbox", folder: "Hardby", name: "Vell Marad", archetype: "apprentice",
    bio: "Tea Society sorcerer, secondary anchor introduced via Mistress Vella Korr. Late twenties, ambitious, looking for a tutor with restricted knowledge." },

  // -- Rel Astra --
  { phase: "sandbox", folder: "Rel Astra", name: "Brother Ostrik Vaerin", archetype: "priest",
    bio: "Cleric of Heironeous at the Temple of Heironeous training yard in Rel Astra. Elle's primary Rel Astra anchor. Forty, Aerdy-born, runs disciplined training to Aerdi standards." },
  { phase: "sandbox", folder: "Rel Astra", name: "Lieutenant Korven Mada", archetype: "knight",
    bio: "Imperial garrison officer at the training annex. Gianni's primary Rel Astra anchor. Thirty-five, Aerdy military aristocrat, runs formal officer drill to imperial standards." },
  { phase: "sandbox", folder: "Rel Astra", name: "Magister Ilen Vaden", archetype: "mage",
    bio: "Senior magister at the Aerdy College of Commercial Law. Selvara's primary Rel Astra anchor. Late sixties, half-elf, accepts students by introduction only. Referenced from afar in Greyhawk as 'Magister Vaden.'" },
  { phase: "sandbox", folder: "Rel Astra", name: "Master Drael", archetype: "commoner",
    bio: "Old Harbor Ward weaponer in Rel Astra. Specializes in the Aerdy rapier — narrow blade, ornate hilt. Sixty, an artist as much as a smith." },
  { phase: "sandbox", folder: "Rel Astra", name: "Mistress Veth-Avir", archetype: "apprentice",
    bio: "Holder of a private archive of pact correspondence — letters between mortals and their otherworldly patrons. Alicia's primary Rel Astra anchor. Mid-fifties, will share the archive with the right student." },
  { phase: "sandbox", folder: "Rel Astra", name: "Edril Thence", archetype: "druid",
    bio: "Druid of the Three-Tree Grove on the outskirts of Rel Astra. Kitty's primary Rel Astra anchor. Half-elf, late thirties, comfortable with chthonic ancestry where most are not." },
  { phase: "sandbox", folder: "Rel Astra", name: "Rinya Dane", archetype: "spy",
    bio: "Halfling fence in Rel Astra. Cam's primary Rel Astra anchor. Thirty-eight, runs a quiet operation out of a chandlery on the harbor." },

  // -- Greyhawk --
  { phase: "sandbox", folder: "Greyhawk", name: "Sergeant Brel Vandros", archetype: "veteran",
    bio: "Watch sergeant at the Greyhawk Foreign Quarter station. Gianni's primary Greyhawk anchor. Late forties, Free-City native, runs the steadiest training schedule in the city." },
  { phase: "sandbox", folder: "Greyhawk", name: "Skarrel", archetype: "spy",
    bio: "Fence and pawn-broker at the Folded Cup in Greyhawk's Foreign Quarter. Cam's primary Greyhawk anchor. Tiefling, fifty, runs the most discreet operation in the city's underworld." },
  { phase: "sandbox", folder: "Greyhawk", name: "Brisa Wood", archetype: "commoner",
    bio: "Herb-stall proprietor under the Ash Tree in Greyhawk's Garden Quarter. Kitty's primary Greyhawk anchor. Forty, half-elf, sells herbs and quiet wisdom in equal measure." },
  { phase: "sandbox", folder: "Greyhawk", name: "Helka Fenn", archetype: "druid",
    bio: "Greyhawk druid figure, recognized openly for her own chthonic ancestry. Sixty, lives near Mother Felun, available for advanced druid training." },
  { phase: "sandbox", folder: "Greyhawk", name: "Mother Felun", archetype: "druid",
    bio: "Greyhawk anchor figure who is calm about chthonic ancestry where the rest of the city is not. Late seventies, half-elf, runs a small grove the city watch leaves alone." },
  { phase: "sandbox", folder: "Greyhawk", name: "Master Hael", archetype: "commoner",
    bio: "Garden Quarter weaponsmith in Greyhawk. Mid-fifties, takes commissions on a six-week schedule, refuses no honest work." },
  { phase: "sandbox", folder: "Greyhawk", name: "Kell Marrow", archetype: "veteran",
    bio: "Sporting-yard proprietor at the Gravestone in Greyhawk. Elle's primary Greyhawk anchor. Forty-eight, retired city watch, runs sparring rings and weapons drill for paying members." }
];

console.log(`Generating ${NPCS.length} actor JSONs...`);

let written = 0;
for (const npc of NPCS) {
  const a = buildActor(npc);
  let outDir;
  if (npc.phase === "sandbox") {
    outDir = path.join(ROOT, "packs", "_source", "sandbox-actors");
  } else {
    outDir = path.join(ROOT, "packs", "_source", `phase-${npc.phase}-actors`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const fname = npc.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outPath = path.join(outDir, `actor-${fname}.json`);
  fs.writeFileSync(outPath, JSON.stringify(a, null, 2) + "\n");
  written++;
}

console.log(`✓ Wrote ${written} actor JSONs.`);
console.log("\nReminder: don't forget to register the new sandbox-actors pack");
console.log("in module.json + scripts/build-packs.mjs.");
