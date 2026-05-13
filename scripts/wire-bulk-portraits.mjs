#!/usr/bin/env node
// Wire actor JSONs to their newly-generated portraits + tokens.
//
// For each actor in phase-1-actors..phase-6-actors and sandbox-actors,
// if the matching portrait file (slugified name) exists in assets/portraits
// or assets/portraits/sandbox, update the actor's `img` and (if the token
// also exists) `prototypeToken.texture.src` to point at them. Idempotent
// and safe to re-run as more images land.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const phases = [
  ["phase-1-actors", false],
  ["phase-2-actors", false],
  ["phase-3-actors", false],
  ["phase-4-actors", false],
  ["phase-5-actors", false],
  ["phase-6-actors", false],
  ["phase-7-actors", false],
  ["phase-8-actors", false],
  ["phase-9-actors", false],
  ["sandbox-actors", true],
];

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

let wired = 0, skippedNoPortrait = 0, skippedAlreadyCustom = 0;
const updates = [];

for (const [phase, isSandbox] of phases) {
  const dir = path.join(ROOT, "packs", "_source", phase);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".json"))) {
    const fp = path.join(dir, f);
    const j = JSON.parse(fs.readFileSync(fp, "utf8"));
    const sl = slug(j.name);
    const portraitDir = isSandbox ? "assets/portraits/sandbox" : "assets/portraits";
    const tokenDir = isSandbox ? "assets/tokens/sandbox" : "assets/tokens";
    const portraitFile = path.join(ROOT, portraitDir, sl + "-portrait.png");
    const tokenFile = path.join(ROOT, tokenDir, sl + "-token.png");
    const isCustom = (j.img || "").startsWith("modules/blooming-rot-2/");
    if (isCustom) { skippedAlreadyCustom++; continue; }
    if (!fs.existsSync(portraitFile)) { skippedNoPortrait++; continue; }
    j.img = `modules/blooming-rot-2/${portraitDir}/${sl}-portrait.png`;
    if (j.prototypeToken) {
      j.prototypeToken.texture = j.prototypeToken.texture || {};
      if (fs.existsSync(tokenFile)) {
        j.prototypeToken.texture.src = `modules/blooming-rot-2/${tokenDir}/${sl}-token.png`;
      }
    }
    fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n");
    wired++;
    updates.push(`${phase}/${j.name}`);
  }
}

console.log(`Wired: ${wired}`);
console.log(`Already custom: ${skippedAlreadyCustom}`);
console.log(`Portrait missing (skipped): ${skippedNoPortrait}`);
if (updates.length) {
  console.log("\nUpdated:");
  for (const u of updates) console.log("  ✓", u);
}
