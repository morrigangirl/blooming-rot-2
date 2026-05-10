#!/usr/bin/env node
// Generate Foundry Scene documents for Phase 2-6 maps.
//
// For each (phase, map-file) pair, writes a Scene JSON that references
// the map as the background. Walls, lighting, and tokens are intentionally
// blank — the GM places those in Foundry. The scene dimensions are computed
// from the actual image dimensions to preserve aspect ratio.
//
// Output: packs/_source/phase-{2,3,4,5,6}-scenes/scene-*.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// Phase → list of [scene-name, map-filename-relative-to-assets/maps/, navOrder]
const SCENES = {
  2: [
    ["Tamsin's Counting House", "tamsin-counting-house-interior.png", 1],
    ["Doctor Pollow's Office", "pollow-office-interior.png", 2],
    ["Vellin Moraven's Home", "vellin-moraven-home-interior.png", 3],
    ["Records Alcove (Cindren & Vhal Loftwick)", "cv-loftwick-satellite-interior.png", 4],
  ],
  3: [
    ["Hardby City Map", "hardby-city-map.png", 1],
    ["Hardby Marketplace", "hardby-marketplace.png", 2],
    ["Hardby Merchant Quarter", "hardby-merchant-quarter.png", 3],
    ["Castrian Vell's House", "castrian-vell-house-interior.png", 4],
    ["The Coopered Wreck", "coopered-wreck-interior.png", 5],
    ["C&V Hardby Branch", "cv-hardby-branch-interior.png", 6],
    ["Veska's Notary Office", "veska-notary-office-interior.png", 7],
    ["Gynarchy Registry", "gynarchy-registry-interior.png", 8],
  ],
  4: [
    ["Rel Astra — Old City", "rel-astra-old-city.png", 1],
    ["Rel Astra — Goldsmiths' Quarter", "rel-astra-goldsmiths-quarter.png", 2],
    ["Sereth's Office (third floor)", "sereth-office-third-floor.png", 3],
    ["Whitemoor Estate Grounds", "whitemoor-estate-grounds.png", 4],
    ["Whitemoor Estate Upper Floor", "whitemoor-estate-upper-floor.png", 5],
    ["Harbor Commission Hall", "harbor-commission-hall.png", 6],
  ],
  5: [
    ["Loftwick (city map)", "Loftwick.jpg", 1],
  ],
  6: [
    ["Greyhawk — Foreign Quarter Overview", "greyhawk-foreign-quarter-overview.png", 1],
    ["The Brass Crow (interior)", "brass-crow-interior.png", 2],
    ["Velash Manuscripts & Bindings", "velash-manuscripts-interior.png", 3],
    ["Edrik Vone's Archive", "vone-archive-interior.png", 4],
    ["Kestrel & Reed, Foreign Letters", "kestrel-reed-interior.png", 5],
    ["V. Korre's Monthly Address", "korre-apartment-interior.png", 6],
    ["Old Stonecistern (battlemap)", "old-stonecistern-battlemap.png", 7],
  ],
};

function getImageSize(filePath) {
  try {
    const out = execSync(`magick identify -format "%wx%h" "${filePath}"`, { encoding: "utf8" }).trim();
    const [w, h] = out.split("x").map(Number);
    return { width: w, height: h };
  } catch {
    return { width: 4000, height: 3000 };
  }
}

function makeId(prefix, key) {
  const h = crypto.createHash("sha1").update(key).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

const STATS = {
  compendiumSource: null, duplicateSource: null, exportSource: null,
  coreVersion: "13.351", systemId: "dnd5e", systemVersion: "5.3.0",
  createdTime: null, modifiedTime: null, lastModifiedBy: null
};

function buildScene(phase, name, mapFile, navOrder) {
  const sceneId = makeId("BR2P" + phase + "S", name + "|" + mapFile);
  const mapPath = path.join(ROOT, "assets", "maps", mapFile);
  if (!fs.existsSync(mapPath)) {
    console.warn(`  missing map: ${mapFile}`);
    return null;
  }
  const { width: imgW, height: imgH } = getImageSize(mapPath);
  // Foundry V13 scene dimensions: pad to 4-grid border on each side; grid 100 = 5 ft.
  const gridSize = 100;
  const sceneWidth = imgW;
  const sceneHeight = imgH;
  return {
    _key: "!scenes!" + sceneId,
    _id: sceneId,
    name: name,
    active: false,
    navigation: false,
    navOrder: navOrder,
    navName: "",
    background: {
      src: "modules/blooming-rot-2/assets/maps/" + mapFile,
      anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0,
      fit: "fill", scaleX: 1, scaleY: 1, rotation: 0, tint: "#ffffff", alphaThreshold: 0
    },
    foreground: null,
    foregroundElevation: null,
    thumb: null,
    width: sceneWidth,
    height: sceneHeight,
    padding: 0.25,
    initial: null,
    backgroundColor: "#999999",
    grid: { type: 1, size: gridSize, style: "solidLines", thickness: 1, color: "#000000", alpha: 0.0, distance: 5, units: "ft" },
    tokenVision: false,
    fog: { exploration: false, reset: null, overlay: null, colors: { explored: null, unexplored: null } },
    environment: { darknessLevel: 0, darknessLock: false, globalLight: { enabled: true, alpha: 0.5, bright: false, color: null, coloration: 1, luminosity: 0, saturation: 0, contrast: 0, shadows: 0, darkness: { min: 0, max: 0 } }, cycle: true, base: { hue: 0, intensity: 0, luminosity: 0, saturation: 0, shadows: 0 }, dark: { hue: 0, intensity: 0, luminosity: 0, saturation: 0, shadows: 0 } },
    drawings: [], tokens: [], lights: [], notes: [], regions: [], sounds: [], templates: [], tiles: [], walls: [],
    playlist: null, playlistSound: null, journal: null, journalEntryPage: null, weather: "",
    folder: null, sort: navOrder * 100,
    ownership: { default: 0 },
    flags: { "blooming-rot-2": { phase: phase, kind: "scene-map" } },
    _stats: STATS
  };
}

let total = 0;
for (const [phase, scenes] of Object.entries(SCENES)) {
  const outDir = path.join(ROOT, "packs", "_source", `phase-${phase}-scenes`);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Phase ${phase}:`);
  for (const [name, mapFile, navOrder] of scenes) {
    const scene = buildScene(phase, name, mapFile, navOrder);
    if (!scene) continue;
    const fname = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    fs.writeFileSync(path.join(outDir, `scene-${fname}.json`), JSON.stringify(scene, null, 2) + "\n");
    console.log(`  ✓ ${name} (${scene.width}x${scene.height})`);
    total++;
  }
}
console.log(`\nWrote ${total} scenes across Phases 2-6.`);
