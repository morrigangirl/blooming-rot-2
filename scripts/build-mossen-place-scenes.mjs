#!/usr/bin/env node
// Mossen Place (Hardby townhome) scene builder.
//
// Builds three Foundry V13 Scene JSONs for the Hardby safe-house, with
// walls, doors, windows, lights, and notes. Files written to
// packs/_source/phase-3-scenes/.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

function makeId(prefix, sceneKey, n) {
  const h = crypto.createHash("sha1").update(`${sceneKey}|${prefix}|${n}`).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

function makeWall(sceneId, n, x1, y1, x2, y2, kind = "wall") {
  const _id = makeId("Wall", sceneId, n);
  let door = 0, sight = 20, light = 20, sound = 20, move = 20;
  if (kind === "door") door = 1;
  else if (kind === "secret") door = 2;
  else if (kind === "window") { sight = 10; light = 0; }
  return {
    _id,
    c: [x1, y1, x2, y2],
    light, move, sight, sound,
    threshold: { light: null, sight: null, sound: null, attenuation: false },
    dir: 0, door, ds: 0, doorSound: "",
    flags: {},
    _key: `!scenes.walls!${sceneId}.${_id}`
  };
}

const LIGHT_PRESETS = {
  lamp:       { dim: 15, bright: 6,  color: "#ffd58f", anim: { type: "torch", speed: 2, intensity: 2 } },
  hearth:     { dim: 22, bright: 10, color: "#ffb070", anim: { type: "fire",  speed: 3, intensity: 3 } },
  candle:     { dim: 10, bright: 4,  color: "#ffe2b0", anim: { type: "torch", speed: 4, intensity: 2 } },
  daylight:   { dim: 50, bright: 30, color: "#cee8ff", anim: { type: null,    speed: 0, intensity: 0 } },
  dim:        { dim:  8, bright: 3,  color: "#ffc878", anim: { type: "torch", speed: 1, intensity: 1 } }
};

function makeLight(sceneId, n, x, y, preset = "lamp") {
  const _id = makeId("Light", sceneId, n);
  const p = LIGHT_PRESETS[preset] ?? LIGHT_PRESETS.lamp;
  return {
    _id, x, y, elevation: 0, rotation: 0, walls: true, vision: false,
    config: {
      negative: false, priority: 0, alpha: 0.5, angle: 360,
      bright: p.bright, dim: p.dim, color: p.color,
      coloration: 1, attenuation: 0.5, luminosity: 0.5,
      saturation: 0, contrast: 0, shadows: 0,
      animation: { type: p.anim.type, speed: p.anim.speed, intensity: p.anim.intensity, reverse: false },
      darkness: { min: 0, max: 1 }
    },
    flags: {},
    _key: `!scenes.lights!${sceneId}.${_id}`
  };
}

function makeNote(sceneId, n, x, y, text, icon = "icons/svg/book.svg") {
  const _id = makeId("Note", sceneId, n);
  return {
    _id, entryId: null, pageId: null, x, y, elevation: 0, sort: 0,
    texture: { src: icon, anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0, fit: "fill", scaleX: 1, scaleY: 1, rotation: 0, tint: "#ffffff", alphaThreshold: 0 },
    iconSize: 40, fontSize: 32, fontFamily: "Signika", textAnchor: 1, textColor: "#ffffff",
    text, global: false, flags: {},
    _key: `!scenes.notes!${sceneId}.${_id}`
  };
}

function segment(sceneId, counter, x1, y1, x2, y2, kind = "wall") {
  return makeWall(sceneId, counter.n++, x1, y1, x2, y2, kind);
}

// ============================================================================
// SCENE CONFIGS
// ============================================================================
// The maps are 1024 × 1536 PNG. I'll use Foundry grid 100 px / 5 ft.
// Footprint of the building inside the 1024×1536 frame: roughly
//   x: 80 to 940  (24 ft wide at 100 px = 480 px scaled? No — at 1 ft per ~36 px the
//   buildings as drawn are ~24 ft × 36 ft proportionally, so the FULL image
//   represents about 28 ft × 42 ft of game space).
// I'll trace walls following the visible building outline in each image.

function buildMossenGround() {
  const sceneId = "BR2SceneMossenGr";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Building outer walls (building occupies roughly y=580-1450, x=80-960)
  // North wall (back yard side): split by back gate
  walls.push(segment(sceneId, counter, 80, 580, 940, 580));         // back wall of building
  // East wall (with kitchen service door)
  walls.push(segment(sceneId, counter, 940, 580, 940, 750));         // east wall upper (kitchen)
  walls.push(segment(sceneId, counter, 940, 750, 940, 850, "door")); // kitchen service door east
  walls.push(segment(sceneId, counter, 940, 850, 940, 1450));        // east wall lower
  // South wall (street)
  walls.push(segment(sceneId, counter, 940, 1450, 530, 1450));       // south east half
  walls.push(segment(sceneId, counter, 450, 1450, 530, 1450, "door"));// front door
  walls.push(segment(sceneId, counter, 80, 1450, 450, 1450));        // south west half
  // West wall
  walls.push(segment(sceneId, counter, 80, 1450, 80, 580));

  // Front door windows
  walls.push(segment(sceneId, counter, 180, 1450, 280, 1450, "window"));// parlor window L
  walls.push(segment(sceneId, counter, 640, 1450, 740, 1450, "window"));// parlor window R

  // Back yard perimeter (outside building, top of image)
  walls.push(segment(sceneId, counter, 80, 60, 460, 60));              // back yard N wall (left)
  walls.push(segment(sceneId, counter, 540, 60, 940, 60));             // back yard N wall (right)
  walls.push(segment(sceneId, counter, 460, 60, 540, 60, "door"));     // back alley gate
  walls.push(segment(sceneId, counter, 80, 60, 80, 580));               // back yard W wall
  walls.push(segment(sceneId, counter, 940, 60, 940, 580));             // back yard E wall

  // Interior — foyer + central hall + parlor + stair hall + kitchen + scullery
  // Foyer north wall (open archway centered)
  walls.push(segment(sceneId, counter, 80, 1290, 440, 1290));          // foyer N (left of arch)
  walls.push(segment(sceneId, counter, 580, 1290, 940, 1290));         // foyer N (right of arch)
  // (between 440 and 580 = open archway, no wall)

  // Parlor / hall divider (W side of hall)
  walls.push(segment(sceneId, counter, 440, 1290, 440, 900));           // parlor east wall
  walls.push(segment(sceneId, counter, 440, 1080, 440, 1170, "door"));// parlor door

  // Stair hall / hall divider (E side of hall)
  walls.push(segment(sceneId, counter, 580, 1290, 580, 900));           // stair hall west wall
  walls.push(segment(sceneId, counter, 580, 1080, 580, 1170, "door"));// stair hall door

  // Kitchen south wall (separates kitchen from hall + parlor + stair-hall row)
  walls.push(segment(sceneId, counter, 80, 900, 460, 900));             // kitchen S (left)
  walls.push(segment(sceneId, counter, 540, 900, 940, 900));            // kitchen S (right)
  walls.push(segment(sceneId, counter, 460, 900, 540, 900, "door"));   // kitchen door (north end of hall)

  // Scullery divider (E side of kitchen)
  walls.push(segment(sceneId, counter, 740, 900, 740, 700));            // scullery west wall
  walls.push(segment(sceneId, counter, 740, 760, 740, 820, "door"));   // scullery archway (treat as door)
  walls.push(segment(sceneId, counter, 740, 700, 940, 700));            // scullery south wall

  // Kitchen window (north wall over sink)
  walls.push(segment(sceneId, counter, 380, 580, 480, 580, "window"));

  // Back yard interior — well + bench + privy outlines (decorative, no walls needed)
  // Privy NW corner
  walls.push(segment(sceneId, counter, 120, 100, 240, 100));
  walls.push(segment(sceneId, counter, 120, 100, 120, 240));
  walls.push(segment(sceneId, counter, 240, 100, 240, 240));
  walls.push(segment(sceneId, counter, 120, 240, 175, 240));
  walls.push(segment(sceneId, counter, 185, 240, 240, 240));
  walls.push(segment(sceneId, counter, 175, 240, 185, 240, "door"));// privy door

  // Lights
  lights.push(makeLight(sceneId, counter.n++, 510, 1400, "dim"));      // foyer entry lamp
  lights.push(makeLight(sceneId, counter.n++, 260, 1150, "lamp"));     // parlor lamp
  lights.push(makeLight(sceneId, counter.n++, 170, 1050, "hearth"));   // parlor hearth (cold but can be lit)
  lights.push(makeLight(sceneId, counter.n++, 760, 1150, "dim"));      // stair hall lamp
  lights.push(makeLight(sceneId, counter.n++, 200, 780, "hearth"));    // kitchen hearth
  lights.push(makeLight(sceneId, counter.n++, 500, 780, "lamp"));      // kitchen worktable lamp
  lights.push(makeLight(sceneId, counter.n++, 840, 780, "candle"));    // scullery candle
  lights.push(makeLight(sceneId, counter.n++, 510, 200, "candle"));    // back yard lantern

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 510, 1400, "G1 Foyer — coat-rail (forgotten cloak); arch to central hall", "icons/svg/cowled.svg"));
  notes.push(makeNote(sceneId, counter.n++, 260, 1150, "G2 Parlor — settees under dust-sheets", "icons/svg/silenced.svg"));
  notes.push(makeNote(sceneId, counter.n++, 760, 1150, "G3 Stair Hall — wooden quarter-turn UP to floor 2", "icons/svg/stoned.svg"));
  notes.push(makeNote(sceneId, counter.n++, 500, 750, "G4 Kitchen — handprint on worktable (clean spot)", "icons/svg/sun.svg"));
  notes.push(makeNote(sceneId, counter.n++, 840, 780, "G5 Scullery — pantry (grocer-stocked)", "icons/svg/book.svg"));
  notes.push(makeNote(sceneId, counter.n++, 510, 300, "G6 Back Yard — well + privy + herb bed", "icons/svg/door-exit.svg"));
  notes.push(makeNote(sceneId, counter.n++, 510, 80, "Back alley gate (Caelith's key)", "icons/svg/door.svg"));

  return { sceneId, walls, lights, notes };
}

function buildMossenSecond() {
  const sceneId = "BR2SceneMossenSe";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Outer perimeter — same footprint as ground floor (80..940 × 60..1450 inclusive of the now-non-existent back yard)
  // For the upper floors the back yard is just void (no walls), so the building footprint is roughly 80..940 × 60..1450
  // The map shows the building filling most of the frame
  walls.push(segment(sceneId, counter, 80, 80, 940, 80));         // N
  walls.push(segment(sceneId, counter, 940, 80, 940, 1450));      // E
  walls.push(segment(sceneId, counter, 940, 1450, 80, 1450));     // S
  walls.push(segment(sceneId, counter, 80, 1450, 80, 80));          // W

  // Front-facing windows (south wall)
  walls.push(segment(sceneId, counter, 180, 1450, 320, 1450, "window"));
  walls.push(segment(sceneId, counter, 540, 1450, 680, 1450, "window"));

  // North wall windows (master bedroom)
  walls.push(segment(sceneId, counter, 200, 80, 320, 80, "window"));
  walls.push(segment(sceneId, counter, 600, 80, 720, 80, "window"));

  // East wall window (library)
  walls.push(segment(sceneId, counter, 940, 700, 940, 820, "window"));

  // Stair hall + dining room + library + bath + master bedroom partitions
  // South strip: dining room (W) | stair hall (E)
  walls.push(segment(sceneId, counter, 80, 950, 540, 950));        // dining room N wall
  walls.push(segment(sceneId, counter, 540, 950, 540, 1450));      // dining room E wall = stair hall W wall
  walls.push(segment(sceneId, counter, 540, 1150, 540, 1250, "door"));// dining room door

  // Stair hall E wall and bath
  walls.push(segment(sceneId, counter, 540, 950, 940, 950));       // stair hall N wall
  // bath
  walls.push(segment(sceneId, counter, 540, 750, 940, 750));       // bath S wall
  walls.push(segment(sceneId, counter, 540, 750, 540, 950));       // bath W wall = stair hall E wall (continues)
  walls.push(segment(sceneId, counter, 540, 820, 540, 880, "door"));// bath door

  // Library — east side, middle of building
  walls.push(segment(sceneId, counter, 540, 450, 940, 450));       // library N wall
  walls.push(segment(sceneId, counter, 540, 450, 540, 750));       // library W wall = N-S hall E wall
  walls.push(segment(sceneId, counter, 540, 560, 540, 620, "door"));// library door

  // Central N-S hall (between dining/library north of stair hall, leading to master bedroom)
  walls.push(segment(sceneId, counter, 80, 950, 80, 950));          // (placeholder)
  walls.push(segment(sceneId, counter, 380, 450, 540, 450));       // hall N wall (between library + dining-room-north)
  walls.push(segment(sceneId, counter, 380, 450, 380, 950));       // dining-room-extension E wall

  // Master bedroom — north end, full width
  walls.push(segment(sceneId, counter, 80, 450, 380, 450));        // master bedroom S wall (left)
  walls.push(segment(sceneId, counter, 540, 450, 540, 450));       // (placeholder)
  walls.push(segment(sceneId, counter, 80, 450, 940, 450));        // master bedroom S wall (full width, will overlap)
  // master door
  walls.push(segment(sceneId, counter, 450, 450, 510, 450, "door"));// master door

  // Lights
  lights.push(makeLight(sceneId, counter.n++, 260, 1200, "lamp"));     // dining room chandelier (low-lit, dust-sheet)
  lights.push(makeLight(sceneId, counter.n++, 740, 1200, "dim"));      // stair hall lamp (top of stair from below)
  lights.push(makeLight(sceneId, counter.n++, 740, 800, "lamp"));      // bath lamp
  lights.push(makeLight(sceneId, counter.n++, 740, 600, "lamp"));      // library desk lamp
  lights.push(makeLight(sceneId, counter.n++, 740, 500, "lamp"));      // library reading lamp
  lights.push(makeLight(sceneId, counter.n++, 510, 280, "dim"));       // master bedroom lamp
  lights.push(makeLight(sceneId, counter.n++, 200, 280, "candle"));    // master bedroom side candle

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 260, 1200, "M1 Dining Room — long table, chairs under dust-sheets", "icons/svg/oak.svg"));
  notes.push(makeNote(sceneId, counter.n++, 740, 1300, "Stair from ground floor lands here", "icons/svg/stoned.svg"));
  notes.push(makeNote(sceneId, counter.n++, 740, 1000, "Stair UP to third floor", "icons/svg/stoned.svg"));
  notes.push(makeNote(sceneId, counter.n++, 740, 800, "M4 Bath / Water Closet", "icons/svg/drink.svg"));
  notes.push(makeNote(sceneId, counter.n++, 800, 600, "M2 Library / Study — HIDDEN COMPARTMENT under floorboard near desk (Investigation DC 13)", "icons/svg/book.svg"));
  notes.push(makeNote(sceneId, counter.n++, 510, 280, "M3 Master Bedroom — four-poster under dust-sheet", "icons/svg/sleepy.svg"));

  return { sceneId, walls, lights, notes };
}

function buildMossenThird() {
  const sceneId = "BR2SceneMossenTh";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Outer perimeter — slightly smaller footprint to account for sloped roof (the dormer floor)
  // Using ~120..900 × 100..1430 to be modestly inset from the lower floors
  walls.push(segment(sceneId, counter, 120, 100, 900, 100));        // N
  walls.push(segment(sceneId, counter, 900, 100, 900, 1430));       // E
  walls.push(segment(sceneId, counter, 900, 1430, 120, 1430));      // S
  walls.push(segment(sceneId, counter, 120, 1430, 120, 100));         // W

  // Dormer windows on side walls (small, projecting)
  walls.push(segment(sceneId, counter, 900, 250, 900, 350, "window"));// T4 east dormer
  walls.push(segment(sceneId, counter, 900, 850, 900, 950, "window"));// T2 east dormer
  walls.push(segment(sceneId, counter, 120, 250, 120, 350, "window"));// T3 west dormer
  walls.push(segment(sceneId, counter, 120, 850, 120, 950, "window"));// T1 west dormer

  // Stair landing in the south-center
  walls.push(segment(sceneId, counter, 400, 1150, 620, 1150));       // landing N wall (separates from corridor)
  walls.push(segment(sceneId, counter, 460, 1150, 560, 1150, "door"));// landing → corridor (archway)
  walls.push(segment(sceneId, counter, 400, 1150, 400, 1430));       // landing W wall
  walls.push(segment(sceneId, counter, 620, 1150, 620, 1430));       // landing E wall

  // T1 (south-west) and T2 (south-east) — flanking the landing
  walls.push(segment(sceneId, counter, 400, 1250, 400, 1320, "door"));// T1 door (from landing west wall)
  walls.push(segment(sceneId, counter, 620, 1250, 620, 1320, "door"));// T2 door

  // Central N-S corridor (between landing and the back rooms)
  walls.push(segment(sceneId, counter, 400, 700, 400, 1150));        // corridor W wall
  walls.push(segment(sceneId, counter, 620, 700, 620, 1150));        // corridor E wall

  // T3 (north-west) and T4 (north-east) — back rooms
  walls.push(segment(sceneId, counter, 120, 700, 400, 700));         // T3 S wall = T1 N wall
  walls.push(segment(sceneId, counter, 620, 700, 900, 700));         // T4 S wall = T2 N wall
  walls.push(segment(sceneId, counter, 400, 800, 400, 870, "door"));// T3 door
  walls.push(segment(sceneId, counter, 620, 800, 620, 870, "door"));// T4 door

  // T5 Bath + T6 Linen closet — top of the corridor
  walls.push(segment(sceneId, counter, 400, 350, 620, 350));         // bath/closet S wall
  walls.push(segment(sceneId, counter, 400, 100, 400, 350));         // bath W wall
  walls.push(segment(sceneId, counter, 620, 100, 620, 350));         // bath E wall
  walls.push(segment(sceneId, counter, 400, 230, 620, 230));         // divider between bath (N) and linen closet (S)
  walls.push(segment(sceneId, counter, 460, 230, 540, 230, "door"));// bath door (from closet — but conceptually they're separate from corridor)

  // Closet door (from corridor)
  walls.push(segment(sceneId, counter, 460, 350, 540, 350, "door"));

  // Bath door (we need to reach bath from corridor too; reach via north of closet through bath divider)
  // For simplicity, treat as: corridor → closet → bath (small private access)

  // Lights
  lights.push(makeLight(sceneId, counter.n++, 260, 1300, "candle"));   // T1
  lights.push(makeLight(sceneId, counter.n++, 760, 1300, "candle"));   // T2
  lights.push(makeLight(sceneId, counter.n++, 260, 850, "candle"));    // T3
  lights.push(makeLight(sceneId, counter.n++, 760, 850, "candle"));    // T4
  lights.push(makeLight(sceneId, counter.n++, 510, 280, "dim"));       // bath
  lights.push(makeLight(sceneId, counter.n++, 510, 1250, "dim"));      // stair landing lamp

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 510, 1250, "T7 Stair landing — arrives from second floor", "icons/svg/stoned.svg"));
  notes.push(makeNote(sceneId, counter.n++, 260, 1300, "T1 PC Bedroom (SW)", "icons/svg/sleepy.svg"));
  notes.push(makeNote(sceneId, counter.n++, 760, 1300, "T2 PC Bedroom (SE)", "icons/svg/sleepy.svg"));
  notes.push(makeNote(sceneId, counter.n++, 260, 850, "T3 PC Bedroom (NW)", "icons/svg/sleepy.svg"));
  notes.push(makeNote(sceneId, counter.n++, 760, 850, "T4 PC Bedroom (NE)", "icons/svg/sleepy.svg"));
  notes.push(makeNote(sceneId, counter.n++, 510, 280, "T5 Small Bath", "icons/svg/drink.svg"));
  notes.push(makeNote(sceneId, counter.n++, 510, 290, "T6 Linen Closet — HIDDEN CACHE under floorboard (200 gp; Investigation DC 14)", "icons/svg/coins.svg"));

  return { sceneId, walls, lights, notes };
}

function buildScene(builder, meta) {
  const build = builder();
  return {
    _key: `!scenes!${meta.sceneId}`,
    _id: meta.sceneId,
    name: meta.name,
    active: false,
    navigation: true,
    navOrder: 0,
    navName: meta.navName,
    background: {
      src: meta.img,
      anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0,
      fit: "fill", scaleX: 1, scaleY: 1, rotation: 0,
      tint: "#ffffff", alphaThreshold: 0
    },
    foreground: null, foregroundElevation: 20, thumb: null,
    width: meta.width, height: meta.height, padding: 0, initial: null,
    backgroundColor: "#1a1a1a",
    grid: { type: 1, size: 100, style: "solidLines", thickness: 1, color: "#000000", alpha: 0.2, distance: 5, units: "ft" },
    tokenVision: true,
    fog: { exploration: true, reset: null, overlay: null, colors: { explored: null, unexplored: null } },
    environment: {
      darknessLevel: 0, darknessLock: false,
      globalLight: { enabled: true, alpha: 0.5, bright: false, color: null, coloration: 1, luminosity: 0, saturation: 0, contrast: 0, shadows: 0, darkness: { min: 0, max: 0 } },
      cycle: true,
      base: { hue: 0, intensity: 0, luminosity: 0, saturation: 0, shadows: 0 },
      dark: { hue: 0, intensity: 0, luminosity: -0.25, saturation: 0, shadows: 0 }
    },
    drawings: [], tokens: [], lights: build.lights, walls: build.walls,
    templates: [], tiles: [], regions: [], notes: build.notes, sounds: [],
    journal: null, journalEntryPage: null, playlist: null, playlistSound: null,
    weather: "", folder: null, sort: 0, ownership: { default: 0 }, flags: {},
    _stats: { compendiumSource: null, duplicateSource: null, exportSource: null, coreVersion: "13.351", systemId: "dnd5e", systemVersion: "5.3.0", createdTime: null, modifiedTime: null, lastModifiedBy: null }
  };
}

console.log("Building Mossen Place scenes ...");
const outDir = path.join(ROOT, "packs", "_source", "phase-3-scenes");
fs.mkdirSync(outDir, { recursive: true });

const scenes = [
  {
    file: path.join(outDir, "scene-mossen-place-ground-floor.json"),
    sceneId: "BR2SceneMossenGr",
    name: "Mossen Place — Ground Floor",
    navName: "Mossen · Ground",
    img: "modules/blooming-rot-2/assets/maps/mossen-place-ground-floor.png",
    width: 1024, height: 1536,
    builder: buildMossenGround
  },
  {
    file: path.join(outDir, "scene-mossen-place-second-floor.json"),
    sceneId: "BR2SceneMossenSe",
    name: "Mossen Place — Second Floor",
    navName: "Mossen · 2nd",
    img: "modules/blooming-rot-2/assets/maps/mossen-place-second-floor.png",
    width: 1024, height: 1536,
    builder: buildMossenSecond
  },
  {
    file: path.join(outDir, "scene-mossen-place-third-floor.json"),
    sceneId: "BR2SceneMossenTh",
    name: "Mossen Place — Third Floor",
    navName: "Mossen · 3rd",
    img: "modules/blooming-rot-2/assets/maps/mossen-place-third-floor.png",
    width: 1024, height: 1536,
    builder: buildMossenThird
  }
];

for (const s of scenes) {
  const scene = buildScene(s.builder, s);
  fs.writeFileSync(s.file, JSON.stringify(scene, null, 2) + "\n");
  console.log(`  ✓ ${path.relative(ROOT, s.file)}: ${scene.walls.length} walls, ${scene.lights.length} lights, ${scene.notes.length} notes`);
}

console.log("\nDone.");
