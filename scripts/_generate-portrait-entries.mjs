#!/usr/bin/env node
// Build portrait + token JOB entries for the 75 NPCs that are still
// using stock MM portrait images. Reads each actor's biography for
// description hints, picks a tier per source pack, and emits the
// entries as a single block of JS to be inserted into generate-images.mjs.
//
// We emit:
//   tier 27: Phase 1-5 + Phase 6 minor portraits
//   tier 28: sandbox NPC portraits
//   tier 29: tokens (post-process from portraits) for both groups
//
// Run with: node scripts/_generate-portrait-entries.mjs > /tmp/p7-entries.js

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE = path.join(ROOT, "packs", "_source");

const PHASE_DIRS = [
  ["phase-1-actors", 27],
  ["phase-2-actors", 27],
  ["phase-3-actors", 27],
  ["phase-4-actors", 27],
  ["phase-5-actors", 27],
  ["phase-6-actors", 27],
  ["sandbox-actors", 28],
];

// Ring colors keyed by archetype, for the metal-ringed token post-process
const ARCHETYPE_RINGS = {
  commoner:        { base: "#5a544a", highlight: "#9a8e74", shadow: "#1a1408" },
  noble:           { base: "#7a6a48", highlight: "#b09a70", shadow: "#1a1408" },
  spy:             { base: "#3a3a48", highlight: "#7c7c88", shadow: "#080810" },
  acolyte:         { base: "#a89878", highlight: "#d8c8a0", shadow: "#3a2a14" },
  priest:          { base: "#a89878", highlight: "#d8c8a0", shadow: "#3a2a14" },
  druid:           { base: "#5a6a4a", highlight: "#94a888", shadow: "#0a1208" },
  mage:            { base: "#3a4a7a", highlight: "#7898c8", shadow: "#08101c" },
  apprentice:      { base: "#4a5a7a", highlight: "#88a0c8", shadow: "#0a121c" },
  veteran:         { base: "#5a4a3a", highlight: "#988070", shadow: "#1a0808" },
  knight:          { base: "#3a4a5a", highlight: "#7888a0", shadow: "#080a14" },
  banditCaptain:   { base: "#5a3a3a", highlight: "#a07070", shadow: "#1a0808" },
  pirate:          { base: "#3a4a4a", highlight: "#788888", shadow: "#080a0a" },
  guard:           { base: "#5a5a6a", highlight: "#94949c", shadow: "#0a0a14" },
  thug:            { base: "#3a3a3a", highlight: "#6a6a6a", shadow: "#080808" },
  scout:           { base: "#3a3a3a", highlight: "#6a6a6a", shadow: "#080808" },
};
const DEFAULT_RING = ARCHETYPE_RINGS.commoner;

// Strip HTML to plain text and grab the first 1-2 paragraphs of the bio
function bioSnippet(html) {
  if (!html) return "";
  const text = html
    .replace(/<h[1-6][^>]*>[^<]*<\/h[1-6]>/gi, "")  // drop headings
    .replace(/<\/?(p|br|li|ul|ol|em|strong|i|b|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "—")
    .replace(/&ldquo;/g, "\"")
    .replace(/&rdquo;/g, "\"")
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
  // Clip to ~700 chars
  return text.substring(0, 700);
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildPrompt(name, archetype, bio, isSandbox) {
  const archetypeNotes = {
    commoner:      "ordinary working person",
    noble:         "civic functionary or commercial firm partner; wears polished commercial dress",
    spy:           "subtle observer; non-obvious clothing; the kind of person no one stops in the street",
    acolyte:       "junior temple cleric in modest clerical robes",
    priest:        "senior temple cleric in clerical robes, calm authority",
    druid:         "druid of mixed-elf or local-folk descent in earth-tone leather and undyed wool, no obvious magic",
    mage:          "scholar or magister in formal academic dress; restrained, intelligent",
    apprentice:    "junior scholar or hedge-mage in plain working dress",
    veteran:       "weathered career soldier in plain leather or coat",
    knight:        "officer of the watch or imperial guard in fitted leathers and a polished gorget",
    banditCaptain: "weather-beaten leader of working men; once a respectable soldier, now isn't",
    pirate:        "ship captain in waterproofed coat and salt-rimed boots, hat optional",
    guard:         "city watchman in plain wool tunic with a polished pewter pin",
    thug:          "rough working enforcer in dark wool, scar visible somewhere",
    scout:         "city runner or messenger in dark cloth, fast on feet",
  };
  const note = archetypeNotes[archetype] || "ordinary working person";
  return `Portrait of ${name.toUpperCase()}, a ${note}.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

${bio}

Three-quarter view from waist up. Plain, period-appropriate background suited to the character's setting. Atmosphere over ornament. NO floating particles, NO glowing magic effects, NO obvious adventurer's gear unless the character is plainly martial.

\${ART_STYLE}`;
}

let count = 0;
const out = [];

for (const [phase, tier] of PHASE_DIRS) {
  const dir = path.join(SOURCE, phase);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const img = j.img || "";
    const isStock = img.startsWith("modules/dnd-") || img.startsWith("icons/");
    if (!isStock) continue;
    const archetype = j.flags?.["blooming-rot-2"]?.archetype || "commoner";
    const bio = bioSnippet(j.system?.details?.biography?.value || "");
    const isSandbox = phase === "sandbox-actors";
    const name = j.name;
    const sl = slug(name);
    const prompt = buildPrompt(name, archetype, bio, isSandbox);
    const portraitDir = isSandbox ? "assets/portraits/sandbox" : "assets/portraits";
    const tokenDir = isSandbox ? "assets/tokens/sandbox" : "assets/tokens";
    const ring = ARCHETYPE_RINGS[archetype] || DEFAULT_RING;
    const portraitPath = `${portraitDir}/${sl}-portrait.png`;
    const tokenPath = `${tokenDir}/${sl}-token.png`;
    out.push(`  {
    id: "p7-${sl}-portrait",
    tier: ${tier},
    out: "${portraitPath}",
    size: "1024x1536",
    quality: "high",
    prompt: \`${prompt.replace(/`/g, "\\`")}\`,
    postProcess: null,
  },`);
    out.push(`  { id: "p7-${sl}-token", tier: 29, out: "${tokenPath}",
    sourceFromExisting: "${portraitPath}", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "${ring.base}", highlight: "${ring.highlight}", shadow: "${ring.shadow}" } /* ${archetype} */ },`);
    count++;
  }
}

console.log(`  // ============== TIER 27/28/29 — bulk NPC portraits + tokens (auto-generated) ==============`);
console.log(out.join("\n"));
console.error(`Generated ${count} portrait+token entry pairs (${out.length} entries total)`);
