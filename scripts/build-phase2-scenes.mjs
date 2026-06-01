#!/usr/bin/env node
// Phase 2 scene builder.
//
// For each of the eight Phase-2-relevant scenes (3 palace floors + 5 location
// maps), this regenerates the walls / doors / windows / lights arrays based
// on a layout config below. Everything else in the scene JSON
// (background, grid, environment, IDs) is preserved.
//
// Wall conventions (Foundry V13):
//   wall:       move=20, light=20, sight=20, sound=20  (everything blocks)
//   door:       same + door=1, ds=0                    (closed door, blocks)
//   secret:     same + door=2, ds=0                    (closed secret door, blocks; GM-only icon)
//   window:     light=0, move=20, sight=10, sound=20   (light + view pass; movement + sound blocked)
//
// Light conventions:
//   lamp:       dim=15, bright=6,   color=#ffd58f, animation=torch (slow)
//   hearth:     dim=22, bright=10,  color=#ffb070, animation=fire
//   chandelier: dim=30, bright=15,  color=#ffe2a0, animation=torch (slow)
//   candle:     dim=10, bright=4,   color=#ffe2b0, animation=torch (slow)
//
// Run with:
//   node scripts/build-phase2-scenes.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// ---------- ID generation (stable across runs) ----------
function makeId(prefix, sceneKey, n) {
  const h = crypto.createHash("sha1").update(`${sceneKey}|${prefix}|${n}`).digest("hex");
  return (prefix + h).replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").substring(0, 16);
}

// ---------- wall/door/window/light factories ----------
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
    dir: 0,
    door,
    ds: 0,
    doorSound: "",
    flags: {},
    _key: `!scenes.walls!${sceneId}.${_id}`
  };
}

const LIGHT_PRESETS = {
  lamp:       { dim: 15, bright: 6,  color: "#ffd58f", anim: { type: "torch", speed: 2, intensity: 2 } },
  hearth:     { dim: 22, bright: 10, color: "#ffb070", anim: { type: "fire",  speed: 3, intensity: 3 } },
  chandelier: { dim: 30, bright: 15, color: "#ffe2a0", anim: { type: "torch", speed: 1, intensity: 2 } },
  candle:     { dim: 10, bright: 4,  color: "#ffe2b0", anim: { type: "torch", speed: 4, intensity: 2 } },
  cellar:     { dim: 12, bright: 5,  color: "#ffc878", anim: { type: "torch", speed: 2, intensity: 2 } },
  daylight:   { dim: 50, bright: 30, color: "#cee8ff", anim: { type: null,    speed: 0, intensity: 0 } }
};

function makeLight(sceneId, n, x, y, preset = "lamp") {
  const _id = makeId("Light", sceneId, n);
  const p = LIGHT_PRESETS[preset] ?? LIGHT_PRESETS.lamp;
  return {
    _id,
    x, y,
    elevation: 0,
    rotation: 0,
    walls: true,
    vision: false,
    config: {
      negative: false,
      priority: 0,
      alpha: 0.5,
      angle: 360,
      bright: p.bright,
      dim: p.dim,
      color: p.color,
      coloration: 1,
      attenuation: 0.5,
      luminosity: 0.5,
      saturation: 0,
      contrast: 0,
      shadows: 0,
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
    _id,
    entryId: null,
    pageId: null,
    x, y,
    elevation: 0,
    sort: 0,
    texture: { src: icon, anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0, fit: "fill", scaleX: 1, scaleY: 1, rotation: 0, tint: "#ffffff", alphaThreshold: 0 },
    iconSize: 40,
    fontSize: 32,
    fontFamily: "Signika",
    textAnchor: 1,
    textColor: "#ffffff",
    text,
    global: false,
    flags: {},
    _key: `!scenes.notes!${sceneId}.${_id}`
  };
}

// ---------- helpers to build a list of walls from a polygon (closed) ----------
function polyWalls(sceneId, counter, points, kind = "wall") {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    out.push(makeWall(sceneId, counter.n++, x1, y1, x2, y2, kind));
  }
  return out;
}
function segment(sceneId, counter, x1, y1, x2, y2, kind = "wall") {
  return makeWall(sceneId, counter.n++, x1, y1, x2, y2, kind);
}

// ============================================================================
// SCENE CONFIGS
// ============================================================================
// All palace floors are 5000 × 3750 px at 100 px / 5 ft grid.
// Phase 2 location scenes vary (1024 × 1024 or 1024 × 1536).
// Coordinates below are approximate to the underlying art.
//
// The convention here is that I trace the most important visible walls
// (perimeter + every clear interior division) and add doors where the art
// shows clear openings or where the journals require a door to exist.
// The GM can refine in Foundry's wall editor; the goal is to ship a
// playable scene out of the box.
// ============================================================================

function buildLittlePalaceMain() {
  const sceneId = "BR2SceneLPMain01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Perimeter (north wall has front-gate gap; south wall has alley bump)
  walls.push(segment(sceneId, counter, 400, 400, 2300, 400));
  walls.push(segment(sceneId, counter, 2300, 400, 2700, 400, "door"));   // front gate
  walls.push(segment(sceneId, counter, 2700, 400, 4750, 400));
  walls.push(segment(sceneId, counter, 4750, 400, 4750, 3450));            // east wall
  walls.push(segment(sceneId, counter, 4750, 3450, 3100, 3450));
  walls.push(segment(sceneId, counter, 3100, 3450, 2900, 3450, "door"));   // south service gate opening
  walls.push(segment(sceneId, counter, 2900, 3450, 1500, 3450));
  walls.push(segment(sceneId, counter, 1500, 3450, 1500, 3700));
  walls.push(segment(sceneId, counter, 1500, 3700, 800, 3700));
  walls.push(segment(sceneId, counter, 800, 3700, 800, 3450));
  walls.push(segment(sceneId, counter, 800, 3450, 400, 3450));
  walls.push(segment(sceneId, counter, 400, 3450, 400, 400));              // west wall

  // West wing interior (M5 Library + M6/M7 Kitchen / Pantry + M11 Chapel + M12 Stair)
  walls.push(segment(sceneId, counter, 400, 1700, 1700, 1700));            // library/kitchen north
  walls.push(segment(sceneId, counter, 1700, 400, 1700, 1300));            // library east wall (upper)
  walls.push(segment(sceneId, counter, 1700, 1300, 1700, 1500, "door"));   // library door to foyer hall
  walls.push(segment(sceneId, counter, 1700, 1500, 1700, 1700));           // library east wall (lower)

  // Library / Kitchen interior divider (north of kitchen)
  walls.push(segment(sceneId, counter, 400, 2200, 1500, 2200));            // kitchen north wall
  walls.push(segment(sceneId, counter, 1100, 2200, 1300, 2200, "door"));   // kitchen door to interior hall

  // Kitchen / Pantry / Chapel column
  walls.push(segment(sceneId, counter, 400, 2800, 1500, 2800));            // pantry/kitchen interior
  walls.push(segment(sceneId, counter, 1500, 2200, 1500, 3450));           // kitchen east wall (back hall)
  walls.push(segment(sceneId, counter, 1500, 2400, 1500, 2600, "door"));   // override: kitchen → back hall doorway

  // Chapel (M11) bottom-left
  walls.push(segment(sceneId, counter, 400, 3100, 800, 3100));             // chapel north
  walls.push(segment(sceneId, counter, 800, 3100, 800, 3450));             // chapel east
  walls.push(segment(sceneId, counter, 600, 3100, 700, 3100, "door"));     // chapel door

  // M5a Records Alcove (secret door from M5 Library to alcove)
  walls.push(segment(sceneId, counter, 400, 1500, 750, 1500));             // alcove south
  walls.push(segment(sceneId, counter, 750, 700, 750, 1500));              // alcove east
  walls.push(segment(sceneId, counter, 750, 900, 750, 1100, "secret"));    // SECRET DOOR (panel in library)

  // Central foyer / sitting / refectory block (M1/M2/M3/M4)
  // M2 Reception Parlor (NE of foyer)
  walls.push(segment(sceneId, counter, 2400, 400, 2400, 1200));            // parlor west
  walls.push(segment(sceneId, counter, 2400, 1200, 3200, 1200));           // parlor south
  walls.push(segment(sceneId, counter, 2400, 800, 2400, 1000, "door"));    // parlor door to foyer
  walls.push(segment(sceneId, counter, 3200, 1200, 3200, 400));            // parlor east

  // M3 Sitting Room (NW of foyer)
  walls.push(segment(sceneId, counter, 2200, 1200, 2400, 1200));           // sitting south
  walls.push(segment(sceneId, counter, 1700, 1700, 2200, 1700));           // sitting/foyer separator
  walls.push(segment(sceneId, counter, 2200, 1200, 2200, 1700));           // sitting east wall
  walls.push(segment(sceneId, counter, 1900, 1700, 2100, 1700, "door"));   // sitting door

  // M4 Refectory (long oak table, brass chandeliers — central south)
  walls.push(segment(sceneId, counter, 2200, 2400, 3700, 2400));           // refectory north
  walls.push(segment(sceneId, counter, 2200, 2400, 2200, 3450));           // refectory west
  walls.push(segment(sceneId, counter, 3700, 2400, 3700, 3450));           // refectory east
  walls.push(segment(sceneId, counter, 2700, 2400, 2900, 2400, "door"));   // refectory door north (to courtyard / hall)

  // East wing (servants' hall M9 + footman's room M10 + 3 staff bedchambers)
  walls.push(segment(sceneId, counter, 4500, 400, 4500, 3450));            // east wing west wall (corridor divider)
  walls.push(segment(sceneId, counter, 4500, 700, 4500, 900, "door"));     // M9 (servants' hall) door
  walls.push(segment(sceneId, counter, 4500, 1300, 4500, 1500, "door"));   // staff bed 1 door
  walls.push(segment(sceneId, counter, 4500, 1900, 4500, 2100, "door"));   // staff bed 2 door
  walls.push(segment(sceneId, counter, 4500, 2500, 4500, 2700, "door"));   // staff bed 3 door
  walls.push(segment(sceneId, counter, 4500, 3100, 4500, 3300, "door"));   // M10 footman's room door
  // dividers between east wing rooms
  walls.push(segment(sceneId, counter, 4500, 1100, 4750, 1100));
  walls.push(segment(sceneId, counter, 4500, 1700, 4750, 1700));
  walls.push(segment(sceneId, counter, 4500, 2300, 4750, 2300));
  walls.push(segment(sceneId, counter, 4500, 2900, 4750, 2900));

  // M12 Spiral stair to cellar (bottom-left, near wheel device on art)
  walls.push(segment(sceneId, counter, 400, 2800, 400, 3100));             // (already wall by perimeter, just visual)

  // Windows (leaded windows facing front and courtyard)
  walls.push(segment(sceneId, counter, 700, 400, 1000, 400, "window"));    // front facade left
  walls.push(segment(sceneId, counter, 3700, 400, 4000, 400, "window"));   // front facade right
  walls.push(segment(sceneId, counter, 1700, 1100, 1900, 1100, "window"));// library south (interior courtyard side — N/A here, omitted)

  // ---------- Lights ----------
  // Foyer / entry (M1) — lantern at gate
  lights.push(makeLight(sceneId, counter.n++, 2500, 250, "lamp"));         // front lantern
  // M2 Reception Parlor — chandelier + hearth
  lights.push(makeLight(sceneId, counter.n++, 2800, 700, "chandelier"));
  lights.push(makeLight(sceneId, counter.n++, 3050, 1100, "hearth"));
  // M3 Sitting Room — lamps
  lights.push(makeLight(sceneId, counter.n++, 2050, 800, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 2050, 1500, "lamp"));
  // M4 Refectory — chandeliers (the art shows brass chandeliers low-lit)
  lights.push(makeLight(sceneId, counter.n++, 2700, 2700, "chandelier"));
  lights.push(makeLight(sceneId, counter.n++, 3200, 2700, "chandelier"));
  lights.push(makeLight(sceneId, counter.n++, 2700, 3100, "chandelier"));
  lights.push(makeLight(sceneId, counter.n++, 3200, 3100, "chandelier"));
  // M5 Library — lamp on writing desk
  lights.push(makeLight(sceneId, counter.n++, 1200, 800, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 1200, 1500, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 700, 1100, "candle"));       // alcove (M5a) candle
  // M6 Kitchen — hearth
  lights.push(makeLight(sceneId, counter.n++, 600, 2000, "hearth"));       // kitchen hearth
  lights.push(makeLight(sceneId, counter.n++, 1100, 2000, "lamp"));        // kitchen lamp
  // M7 Pantry — lamp
  lights.push(makeLight(sceneId, counter.n++, 700, 2500, "lamp"));
  // M11 Chapel — candles
  lights.push(makeLight(sceneId, counter.n++, 600, 3300, "candle"));
  // East wing rooms — one lamp each
  lights.push(makeLight(sceneId, counter.n++, 4625, 800, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 4625, 1400, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 4625, 2000, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 4625, 2600, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 4625, 3200, "lamp"));
  // M12 Spiral stair — lamp at top of stair
  lights.push(makeLight(sceneId, counter.n++, 700, 2900, "lamp"));

  // ---------- Notes ----------
  notes.push(makeNote(sceneId, counter.n++, 2900, 2700, "M4 Refectory — Evidence Review (Phase 2 opening)", "icons/svg/book.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1200, 1100, "M5 Library / Records Room (Records Alcove behind panel)", "icons/svg/library.svg"));
  notes.push(makeNote(sceneId, counter.n++, 600, 1100, "M5a Records Alcove (SECRET — Phase 2 research)", "icons/svg/mystery-man.svg"));
  notes.push(makeNote(sceneId, counter.n++, 2800, 800, "M2 Reception Parlor (where Moll waits)", "icons/svg/cowled.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1100, 3600, "M8 South Service Gate (Sarth's entry route)", "icons/svg/door-exit.svg"));
  notes.push(makeNote(sceneId, counter.n++, 700, 3000, "M12 Spiral Stair (down to Cellar)", "icons/svg/stoned.svg"));

  return { sceneId, walls, lights, notes };
}

function buildLittlePalaceSecond() {
  const sceneId = "BR2SceneLPSecond01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Perimeter (upper floor follows main floor's wing footprint;
  // courtyard is open to sky in the centre)
  walls.push(segment(sceneId, counter, 400, 400, 4750, 400));        // N
  walls.push(segment(sceneId, counter, 4750, 400, 4750, 2700));      // E
  walls.push(segment(sceneId, counter, 4750, 2700, 3700, 2700));     // SE corner toward courtyard
  walls.push(segment(sceneId, counter, 3700, 2700, 3700, 3200));     // east of courtyard
  walls.push(segment(sceneId, counter, 3700, 3200, 2200, 3200));     // south side toward courtyard
  walls.push(segment(sceneId, counter, 2200, 3200, 2200, 2700));     // west of courtyard
  walls.push(segment(sceneId, counter, 2200, 2700, 400, 2700));      // S
  walls.push(segment(sceneId, counter, 400, 2700, 400, 400));        // W

  // Open courtyard balcony rail (sight-permeable, sound-permeable, movement-blocking)
  walls.push(segment(sceneId, counter, 2200, 2700, 3700, 2700, "window"));  // north side of courtyard (rail)

  // Upper gallery (U1) divider — the gallery wraps three sides; north arm
  walls.push(segment(sceneId, counter, 1700, 1700, 3500, 1700));     // gallery south edge (north arm)
  walls.push(segment(sceneId, counter, 1700, 1900, 1700, 2100, "door"));  // gallery → south wing door (W)
  walls.push(segment(sceneId, counter, 3500, 1900, 3500, 2100, "door"));  // gallery → south wing door (E)
  walls.push(segment(sceneId, counter, 1700, 1700, 1700, 2700));     // west arm of gallery
  walls.push(segment(sceneId, counter, 3500, 1700, 3500, 2700));     // east arm of gallery

  // U2 Caelith's Civic Office (NW)
  walls.push(segment(sceneId, counter, 1700, 1200, 1700, 1700));     // office east wall
  walls.push(segment(sceneId, counter, 1700, 1200, 400, 1200));      // office south wall (cont. of W block)
  walls.push(segment(sceneId, counter, 1700, 1400, 1700, 1500, "door"));// office door to gallery
  // U2a Caelith's bedchamber (adjoining suite, W of office)
  walls.push(segment(sceneId, counter, 400, 800, 1700, 800));        // bedchamber/office divider
  walls.push(segment(sceneId, counter, 900, 800, 1000, 800, "door"));// suite door (office↔bedchamber)
  // U3 Trina's Guest Suite (NE)
  walls.push(segment(sceneId, counter, 3500, 1200, 3500, 1700));     // guest west wall
  walls.push(segment(sceneId, counter, 3500, 1200, 4750, 1200));     // guest south
  walls.push(segment(sceneId, counter, 3500, 1400, 3500, 1500, "door"));// guest door
  walls.push(segment(sceneId, counter, 3500, 800, 4750, 800));       // guest bedchamber divider
  walls.push(segment(sceneId, counter, 4000, 800, 4100, 800, "door"));   // guest bedroom door

  // U4 Old Council Chamber (NW corner, the disused room)
  walls.push(segment(sceneId, counter, 400, 800, 900, 800));         // council north wall meeting

  // Top row of north chambers — Caelith's office bay + central + guest bay
  // (rooms already framed by walls above)

  // South wing: U5-U10 PC Bedrooms + U11 Bath + U12 Linen
  // The south wing wraps around the courtyard's north side
  // Six PC bedrooms split across W and E arms of gallery + a top row
  // U5-U7 along the west arm (vertical column)
  walls.push(segment(sceneId, counter, 400, 2100, 1700, 2100));      // W arm horizontal divider 1
  walls.push(segment(sceneId, counter, 400, 2400, 1700, 2400));      // W arm horizontal divider 2
  walls.push(segment(sceneId, counter, 950, 2100, 1050, 2100, "door"));// bed door
  walls.push(segment(sceneId, counter, 950, 2400, 1050, 2400, "door"));// bed door
  walls.push(segment(sceneId, counter, 950, 2600, 1050, 2600, "door"));// bed door (to lowest bed in W column)
  // U8-U10 along the east arm
  walls.push(segment(sceneId, counter, 3500, 2100, 4750, 2100));     // E arm horizontal divider 1
  walls.push(segment(sceneId, counter, 3500, 2400, 4750, 2400));     // E arm horizontal divider 2
  walls.push(segment(sceneId, counter, 4100, 2100, 4200, 2100, "door"));
  walls.push(segment(sceneId, counter, 4100, 2400, 4200, 2400, "door"));
  walls.push(segment(sceneId, counter, 4100, 2600, 4200, 2600, "door"));
  // U11 Shared Bath / U12 Linen at south end of west arm (small)
  walls.push(segment(sceneId, counter, 400, 2600, 1700, 2600));      // S divider

  // Grand stair from main floor lands on U1 gallery at south end
  walls.push(segment(sceneId, counter, 2400, 2700, 2400, 2700));     // (marker only — stair lands here)

  // Daylight from gallery skylights
  walls.push(segment(sceneId, counter, 700, 400, 1100, 400, "window"));
  walls.push(segment(sceneId, counter, 4000, 400, 4400, 400, "window"));

  // Lights — every visible lamp / hearth in upper floor art
  // U1 Gallery — sconces every ~600 px
  lights.push(makeLight(sceneId, counter.n++, 2000, 1800, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 2600, 1800, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 3200, 1800, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 1800, 2400, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 3400, 2400, "lamp"));
  // U2 Caelith office — hearth + lamp
  lights.push(makeLight(sceneId, counter.n++, 800, 1400, "hearth"));
  lights.push(makeLight(sceneId, counter.n++, 1300, 1400, "lamp"));
  // U2a Caelith bedchamber — small lamp
  lights.push(makeLight(sceneId, counter.n++, 800, 600, "lamp"));
  // U3 Trina guest — lamp + small hearth
  lights.push(makeLight(sceneId, counter.n++, 4100, 1400, "lamp"));
  lights.push(makeLight(sceneId, counter.n++, 4500, 1400, "hearth"));
  // U3 Trina bedchamber — small lamp
  lights.push(makeLight(sceneId, counter.n++, 4400, 600, "lamp"));
  // U4 Old Council Chamber — hearth and one chandelier
  lights.push(makeLight(sceneId, counter.n++, 600, 600, "hearth"));
  lights.push(makeLight(sceneId, counter.n++, 1200, 500, "chandelier"));
  // Bedrooms (each gets a single small lamp)
  lights.push(makeLight(sceneId, counter.n++, 800, 2250, "lamp"));   // U5
  lights.push(makeLight(sceneId, counter.n++, 800, 2550, "lamp"));   // U6
  lights.push(makeLight(sceneId, counter.n++, 800, 2680, "candle")); // U7
  lights.push(makeLight(sceneId, counter.n++, 4300, 2250, "lamp")); // U8
  lights.push(makeLight(sceneId, counter.n++, 4300, 2550, "lamp")); // U9
  lights.push(makeLight(sceneId, counter.n++, 4300, 2680, "candle")); // U10

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 1100, 600, "U4 Old Council Chamber — Three Approaches (Phase 2 finale)", "icons/svg/oak.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1000, 1400, "U2 Caelith's Civic Office (alarm-rune chime audible here)", "icons/svg/eye.svg"));
  notes.push(makeNote(sceneId, counter.n++, 4100, 1400, "U3 Trina's Guest Suite", "icons/svg/silenced.svg"));
  notes.push(makeNote(sceneId, counter.n++, 2950, 2950, "Courtyard open to sky below (balcony rail)", "icons/svg/circle.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1050, 2750, "U5-U10 PC Bedrooms (six)", "icons/svg/sleepy.svg"));

  return { sceneId, walls, lights, notes };
}

function buildLittlePalaceCellar() {
  const sceneId = "BR2SceneLPCellar01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Perimeter — irregular, with north-east tunnel exit (C7)
  walls.push(segment(sceneId, counter, 300, 400, 1900, 400));
  walls.push(segment(sceneId, counter, 1900, 400, 1900, 200));      // stair vestibule bump
  walls.push(segment(sceneId, counter, 1900, 200, 2900, 200));
  walls.push(segment(sceneId, counter, 2900, 200, 2900, 400));
  walls.push(segment(sceneId, counter, 2900, 400, 4500, 400));
  walls.push(segment(sceneId, counter, 4500, 400, 4500, 1400));     // east before tunnel
  walls.push(segment(sceneId, counter, 4500, 1400, 4800, 1400));    // tunnel north
  walls.push(segment(sceneId, counter, 4800, 1400, 4800, 2600));    // tunnel east (Old Service Tunnel C7)
  walls.push(segment(sceneId, counter, 4800, 2600, 4800, 2800, "secret"));  // SECRET grate to outside
  walls.push(segment(sceneId, counter, 4800, 2800, 4800, 3200));
  walls.push(segment(sceneId, counter, 4800, 3200, 4500, 3200));    // tunnel south
  walls.push(segment(sceneId, counter, 4500, 3200, 4500, 3450));    // east lower
  walls.push(segment(sceneId, counter, 4500, 3450, 300, 3450));     // south
  walls.push(segment(sceneId, counter, 300, 3450, 300, 400));       // west

  // C1 Cellar Entry (north central, foot of spiral stair from M12)
  walls.push(segment(sceneId, counter, 1900, 400, 1900, 800));      // entry vestibule west
  walls.push(segment(sceneId, counter, 2900, 400, 2900, 800));      // entry vestibule east
  walls.push(segment(sceneId, counter, 1900, 800, 2300, 800));      // entry south (W side)
  walls.push(segment(sceneId, counter, 2500, 800, 2900, 800));      // entry south (E side)
  walls.push(segment(sceneId, counter, 2300, 800, 2500, 800, "door"));// stair door into main cellar

  // C2 Wine Cellar (west)
  walls.push(segment(sceneId, counter, 1500, 400, 1500, 2400));     // wine cellar east wall
  walls.push(segment(sceneId, counter, 1500, 1400, 1500, 1600, "door"));// wine cellar door

  // C3 Pantry Cellar (east, opposite wine)
  walls.push(segment(sceneId, counter, 3300, 400, 3300, 2400));     // pantry cellar west wall
  walls.push(segment(sceneId, counter, 3300, 1400, 3300, 1600, "door"));

  // C4 Coal & lamp-oil stores (south-west corner)
  walls.push(segment(sceneId, counter, 300, 2400, 1500, 2400));     // coal store north
  walls.push(segment(sceneId, counter, 800, 2400, 900, 2400, "door"));

  // C5 Strong Room (central south) — 10ft × 12ft = 200×240 px
  walls.push(segment(sceneId, counter, 2100, 2400, 2900, 2400));    // strong room north
  walls.push(segment(sceneId, counter, 2100, 2400, 2100, 3000));    // strong room west
  walls.push(segment(sceneId, counter, 2900, 2400, 2900, 3000));    // strong room east
  walls.push(segment(sceneId, counter, 2100, 3000, 2400, 3000));    // strong room south (W)
  walls.push(segment(sceneId, counter, 2500, 3000, 2900, 3000));    // strong room south (E)
  walls.push(segment(sceneId, counter, 2400, 3000, 2500, 3000, "door"));// iron door (double-locked)

  // C6 Old Cistern (well, lower-west on art — visible spiral wheel)
  walls.push(segment(sceneId, counter, 300, 2800, 1100, 2800));     // cistern north
  walls.push(segment(sceneId, counter, 1100, 2800, 1100, 3450));    // cistern east
  walls.push(segment(sceneId, counter, 600, 2800, 700, 2800, "door"));// cistern access

  // C7 Old Service Tunnel — east wing; already perimeter walls + secret grate exit (above)

  // Lights — dim cellar lamps
  lights.push(makeLight(sceneId, counter.n++, 2400, 600, "cellar"));  // entry vestibule
  lights.push(makeLight(sceneId, counter.n++, 800, 1200, "cellar")); // wine cellar
  lights.push(makeLight(sceneId, counter.n++, 800, 2000, "cellar"));
  lights.push(makeLight(sceneId, counter.n++, 3900, 1200, "cellar"));// pantry cellar
  lights.push(makeLight(sceneId, counter.n++, 3900, 2000, "cellar"));
  lights.push(makeLight(sceneId, counter.n++, 2500, 2700, "lamp")); // strong room lamp (inside)
  lights.push(makeLight(sceneId, counter.n++, 600, 3100, "candle"));// cistern (well) candle
  lights.push(makeLight(sceneId, counter.n++, 800, 2700, "cellar"));// coal store
  // Tunnel torches (C7) — sparse
  lights.push(makeLight(sceneId, counter.n++, 4650, 1800, "cellar"));
  lights.push(makeLight(sceneId, counter.n++, 4650, 2500, "cellar"));

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 2500, 2700, "C5 Strong Room — iron door, double-locked (Sleight of Hand DC 18 ×2). Alarm rune inside.", "icons/svg/locked.svg"));
  notes.push(makeNote(sceneId, counter.n++, 2400, 600, "C1 Cellar Entry — foot of spiral stair from M12", "icons/svg/stoned.svg"));
  notes.push(makeNote(sceneId, counter.n++, 4650, 2700, "C7 Old Service Tunnel exit (SECRET grate; Yeomanry corporal posted at far end)", "icons/svg/door-exit.svg"));

  return { sceneId, walls, lights, notes };
}

function buildPollowOffice() {
  // 1024 × 1024 — two-storey building, ground floor (top half) + upper office (bottom half)
  const sceneId = "BR2ScenePollow01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Top floor (clerk antechamber, upper half) ~ 256-512 vertical
  walls.push(segment(sceneId, counter, 50, 30, 1000, 30));    // N
  walls.push(segment(sceneId, counter, 1000, 30, 1000, 510)); // E (split into two storeys)
  walls.push(segment(sceneId, counter, 1000, 510, 50, 510));  // S (clerk antechamber floor)
  walls.push(segment(sceneId, counter, 50, 510, 50, 30));     // W
  // Door from clerk antechamber to street (top)
  walls.push(segment(sceneId, counter, 450, 30, 600, 30, "door"));

  // Bottom floor (inner office, lower half)
  walls.push(segment(sceneId, counter, 50, 510, 1000, 510));  // N (inner office north wall — shared with antechamber south)
  walls.push(segment(sceneId, counter, 1000, 510, 1000, 1000));
  walls.push(segment(sceneId, counter, 1000, 1000, 50, 1000));
  walls.push(segment(sceneId, counter, 50, 1000, 50, 510));
  // Door from inner office to antechamber (interior stair)
  walls.push(segment(sceneId, counter, 450, 510, 600, 510, "door"));

  // Lights
  lights.push(makeLight(sceneId, counter.n++, 500, 250, "lamp"));    // antechamber lamp
  lights.push(makeLight(sceneId, counter.n++, 200, 250, "lamp"));    // antechamber sconce
  lights.push(makeLight(sceneId, counter.n++, 850, 250, "lamp"));    // antechamber strongbox lamp
  lights.push(makeLight(sceneId, counter.n++, 500, 750, "lamp"));    // inner office lamp on desk
  lights.push(makeLight(sceneId, counter.n++, 200, 600, "hearth"));  // inner office hearth (per art)
  lights.push(makeLight(sceneId, counter.n++, 850, 750, "lamp"));    // inner office shelves lamp

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 850, 350, "Strongbox (at desk's right hand)", "icons/svg/locked.svg"));
  notes.push(makeNote(sceneId, counter.n++, 500, 700, "Pollow's examination desk (he certifies deaths here)", "icons/svg/aura.svg"));

  return { sceneId, walls, lights, notes };
}

function buildRecordsAlcoveCV() {
  // 1024 × 1536 — C&V Loftwick satellite, two storeys stacked
  const sceneId = "BR2SceneCVLoftwick01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Lower floor (public hall, bottom 0-800)
  walls.push(segment(sceneId, counter, 50, 800, 1000, 800));        // N (separates upper floor)
  walls.push(segment(sceneId, counter, 50, 800, 50, 1500));         // W
  walls.push(segment(sceneId, counter, 1000, 800, 1000, 1500));     // E
  walls.push(segment(sceneId, counter, 50, 1500, 1000, 1500));      // S (street wall)
  walls.push(segment(sceneId, counter, 450, 1500, 600, 1500, "door"));  // street entrance door

  // Public hall counter (the railing-divided front/back)
  walls.push(segment(sceneId, counter, 50, 1200, 400, 1200, "window"));  // counter rail (sight-permeable)
  walls.push(segment(sceneId, counter, 650, 1200, 1000, 1200, "window"));// counter rail
  walls.push(segment(sceneId, counter, 400, 1200, 650, 1200));          // gate in counter (closed)

  // Stair from street level to upper office
  walls.push(segment(sceneId, counter, 100, 800, 200, 800, "door"));    // stair foot (top)

  // Upper floor (50-800 vertical)
  walls.push(segment(sceneId, counter, 50, 50, 1000, 50));         // N
  walls.push(segment(sceneId, counter, 50, 50, 50, 800));          // W
  walls.push(segment(sceneId, counter, 1000, 50, 1000, 800));      // E

  // Upper interior — Hesren Vesh's office (west) + 3 interview rooms (east)
  walls.push(segment(sceneId, counter, 400, 50, 400, 600));        // Vesh office east wall
  walls.push(segment(sceneId, counter, 400, 300, 400, 400, "door"));// Vesh office door
  walls.push(segment(sceneId, counter, 50, 600, 400, 600));        // Vesh office south
  // Three interview rooms along east side
  walls.push(segment(sceneId, counter, 600, 200, 1000, 200));      // interview 1/2 divider
  walls.push(segment(sceneId, counter, 600, 400, 1000, 400));      // interview 2/3 divider
  walls.push(segment(sceneId, counter, 600, 600, 1000, 600));      // last interview south
  walls.push(segment(sceneId, counter, 600, 50, 600, 600));        // interviews west wall (hall side)
  walls.push(segment(sceneId, counter, 600, 100, 600, 175, "door"));   // interview 1 door
  walls.push(segment(sceneId, counter, 600, 275, 600, 350, "door"));   // interview 2 door
  walls.push(segment(sceneId, counter, 600, 475, 600, 550, "door"));   // interview 3 door

  // Stair landing top
  walls.push(segment(sceneId, counter, 50, 600, 200, 600));            // landing south
  walls.push(segment(sceneId, counter, 200, 600, 200, 800));           // landing east

  // Lights
  lights.push(makeLight(sceneId, counter.n++, 200, 250, "lamp"));     // Vesh desk lamp
  lights.push(makeLight(sceneId, counter.n++, 800, 150, "candle"));   // interview 1
  lights.push(makeLight(sceneId, counter.n++, 800, 300, "candle"));
  lights.push(makeLight(sceneId, counter.n++, 800, 500, "candle"));
  lights.push(makeLight(sceneId, counter.n++, 500, 1000, "chandelier"));// public hall chandelier
  lights.push(makeLight(sceneId, counter.n++, 200, 1400, "lamp"));    // street-level entry lamps
  lights.push(makeLight(sceneId, counter.n++, 850, 1400, "lamp"));

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 200, 250, "Hesren Vesh's office — Charter Roll on wall", "icons/svg/book.svg"));
  notes.push(makeNote(sceneId, counter.n++, 500, 1300, "Public hall — counter divides front/back", "icons/svg/coins.svg"));
  notes.push(makeNote(sceneId, counter.n++, 525, 1500, "Front entrance (street: Wick Lane)", "icons/svg/door.svg"));

  return { sceneId, walls, lights, notes };
}

function buildVellinHome() {
  // 1024 × 1536 — two-floor home stacked
  const sceneId = "BR2SceneVellin01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Upper floor (top half, 0-768) — bedchambers + bath
  walls.push(segment(sceneId, counter, 80, 50, 950, 50));        // N
  walls.push(segment(sceneId, counter, 950, 50, 950, 700));      // E
  walls.push(segment(sceneId, counter, 950, 700, 80, 700));      // S (divides from ground floor)
  walls.push(segment(sceneId, counter, 80, 700, 80, 50));        // W

  // Upper interior — three rooms
  walls.push(segment(sceneId, counter, 400, 50, 400, 500));      // bedchamber 1 east wall
  walls.push(segment(sceneId, counter, 400, 200, 400, 300, "door"));// bed 1 door
  walls.push(segment(sceneId, counter, 600, 50, 600, 500));      // bedchamber 2 west wall
  walls.push(segment(sceneId, counter, 600, 200, 600, 300, "door"));// bed 2 door
  walls.push(segment(sceneId, counter, 400, 500, 950, 500));     // central hall south
  walls.push(segment(sceneId, counter, 80, 500, 400, 500));      // hall north of bath
  walls.push(segment(sceneId, counter, 200, 500, 280, 500, "door"));// bath door

  // Upper stair landing
  walls.push(segment(sceneId, counter, 80, 600, 200, 600, "door"));// stair top

  // Ground floor (bottom half, 768-1536)
  walls.push(segment(sceneId, counter, 80, 750, 950, 750));      // N
  walls.push(segment(sceneId, counter, 950, 750, 950, 1500));    // E
  walls.push(segment(sceneId, counter, 950, 1500, 80, 1500));    // S (street wall)
  walls.push(segment(sceneId, counter, 80, 1500, 80, 750));      // W

  // Front door (street)
  walls.push(segment(sceneId, counter, 450, 1500, 600, 1500, "door"));

  // Interior: kitchen-dining (west), study (east), entry
  walls.push(segment(sceneId, counter, 400, 750, 400, 1500));    // central divider
  walls.push(segment(sceneId, counter, 400, 1100, 400, 1200, "door"));// kitchen → entry
  walls.push(segment(sceneId, counter, 600, 750, 600, 1500));    // study west wall
  walls.push(segment(sceneId, counter, 600, 1100, 600, 1200, "door"));// study door

  // Stair (bottom-left up to upper landing)
  walls.push(segment(sceneId, counter, 80, 800, 200, 800, "door"));// stair foot
  walls.push(segment(sceneId, counter, 200, 800, 200, 1000));    // stair shaft east

  // Windows
  walls.push(segment(sceneId, counter, 150, 1500, 250, 1500, "window"));// front window L
  walls.push(segment(sceneId, counter, 750, 1500, 850, 1500, "window"));// front window R

  // Lights
  // Upper
  lights.push(makeLight(sceneId, counter.n++, 250, 250, "lamp"));   // bed 1 lamp
  lights.push(makeLight(sceneId, counter.n++, 800, 250, "lamp"));   // bed 2 lamp
  lights.push(makeLight(sceneId, counter.n++, 800, 100, "candle")); // bath lamp / bath area
  lights.push(makeLight(sceneId, counter.n++, 500, 600, "lamp"));   // hall lamp
  // Ground
  lights.push(makeLight(sceneId, counter.n++, 200, 900, "hearth"));  // kitchen hearth
  lights.push(makeLight(sceneId, counter.n++, 250, 1200, "lamp"));   // dining lamp
  lights.push(makeLight(sceneId, counter.n++, 800, 1000, "lamp"));   // study lamp
  lights.push(makeLight(sceneId, counter.n++, 500, 1300, "lamp"));   // entry hall lamp

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 800, 1000, "Vellin's study — Tamsin's 'Sevenday' note is here", "icons/svg/book.svg"));
  notes.push(makeNote(sceneId, counter.n++, 250, 900, "Kitchen / dining (hearth) — where Vellin receives guests", "icons/svg/sun.svg"));

  return { sceneId, walls, lights, notes };
}

function buildTamsinCountingHouse() {
  // 1024 × 1536 — single room, no divisions
  const sceneId = "BR2SceneTamsin01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Perimeter (single floor, single room)
  walls.push(segment(sceneId, counter, 60, 40, 940, 40));        // N (with door)
  walls.push(segment(sceneId, counter, 400, 40, 580, 40, "door"));// front door (interrupted above; re-cut later)
  walls.push(segment(sceneId, counter, 940, 40, 940, 1490));     // E
  walls.push(segment(sceneId, counter, 940, 1490, 60, 1490));    // S
  walls.push(segment(sceneId, counter, 60, 1490, 60, 40));       // W

  // Re-cut N wall around the door
  walls.push(segment(sceneId, counter, 60, 40, 400, 40));
  walls.push(segment(sceneId, counter, 580, 40, 940, 40));
  // (the duplicate full-width N at top is overridden by these two — Foundry doesn't dedupe, so we drop the full one)

  // Windows
  walls.push(segment(sceneId, counter, 120, 40, 250, 40, "window"));
  walls.push(segment(sceneId, counter, 750, 40, 880, 40, "window"));

  // Lights
  lights.push(makeLight(sceneId, counter.n++, 100, 200, "lamp"));   // NW
  lights.push(makeLight(sceneId, counter.n++, 900, 200, "lamp"));   // NE
  lights.push(makeLight(sceneId, counter.n++, 100, 1300, "lamp"));  // SW (entry)
  lights.push(makeLight(sceneId, counter.n++, 900, 1300, "lamp"));  // SE (entry)
  lights.push(makeLight(sceneId, counter.n++, 500, 700, "lamp"));   // central lamp on chair area

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 500, 1300, "Standing desk — Doril Veth posted here", "icons/svg/aura.svg"));
  notes.push(makeNote(sceneId, counter.n++, 800, 400, "Bound carbon ledgers (last open ledger — three C&V Hardby queries)", "icons/svg/book.svg"));

  return { sceneId, walls, lights, notes };
}

function buildGilstRooms() {
  // 1024 × 1536 — two rooms + water closet + stair landing
  const sceneId = "BR2SceneGilst01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Perimeter
  walls.push(segment(sceneId, counter, 100, 40, 920, 40));         // N
  walls.push(segment(sceneId, counter, 920, 40, 920, 1490));       // E
  walls.push(segment(sceneId, counter, 920, 1490, 100, 1490));     // S
  walls.push(segment(sceneId, counter, 100, 1490, 100, 40));       // W

  // Interior — top half is bedchamber (40-600), middle is sitting parlor + study (600-1300), bottom is water-closet under stair (1300-1490)
  walls.push(segment(sceneId, counter, 100, 600, 920, 600));       // bedchamber south wall
  walls.push(segment(sceneId, counter, 400, 600, 550, 600, "door"));   // bed↔parlor door

  walls.push(segment(sceneId, counter, 100, 1300, 600, 1300));     // parlor south
  walls.push(segment(sceneId, counter, 600, 1300, 920, 1300));
  walls.push(segment(sceneId, counter, 250, 1300, 350, 1300, "door"));// stair landing → parlor door

  walls.push(segment(sceneId, counter, 600, 1300, 600, 1490));     // stair shaft east wall
  walls.push(segment(sceneId, counter, 350, 1300, 350, 1490));     // stair shaft west / water-closet east
  walls.push(segment(sceneId, counter, 350, 1400, 350, 1450, "door"));// water-closet door

  // Front door (entry from public stair landing — south of stair shaft)
  walls.push(segment(sceneId, counter, 480, 1490, 580, 1490, "door"));

  // Windows
  walls.push(segment(sceneId, counter, 350, 40, 500, 40, "window"));     // bedchamber north window
  walls.push(segment(sceneId, counter, 850, 700, 850, 850, "window"));   // parlor east window (over Wick Lane)
  walls.push(segment(sceneId, counter, 750, 600, 750, 600));             // (placeholder)

  // Lights
  lights.push(makeLight(sceneId, counter.n++, 750, 250, "lamp"));   // bedchamber wash-stand lamp
  lights.push(makeLight(sceneId, counter.n++, 300, 800, "lamp"));   // parlor hearth-side lamp
  lights.push(makeLight(sceneId, counter.n++, 300, 800, "hearth")); // (cold hearth — keep light off in art; can be lit)
  lights.push(makeLight(sceneId, counter.n++, 750, 900, "lamp"));   // writing desk lamp
  lights.push(makeLight(sceneId, counter.n++, 250, 1380, "candle"));// water-closet candle
  lights.push(makeLight(sceneId, counter.n++, 530, 1380, "candle"));// stair landing candle

  // Notes — the seven hidden items the journals describe
  notes.push(makeNote(sceneId, counter.n++, 700, 800, "A. Hollowed Constitutional Commentaries III (DC 13)", "icons/svg/book.svg"));
  notes.push(makeNote(sceneId, counter.n++, 750, 950, "B. Throat-lozenge tin — smoking-gun bank instrument (DC 14)", "icons/svg/skull.svg"));
  notes.push(makeNote(sceneId, counter.n++, 500, 300, "C. Locket with miniature (DC 14)", "icons/svg/heart.svg"));
  notes.push(makeNote(sceneId, counter.n++, 200, 800, "D. Burned note in cold hearth (DC 13)", "icons/svg/fire.svg"));
  notes.push(makeNote(sceneId, counter.n++, 800, 1000, "E. Coin shaving in desk seam (DC 15)", "icons/svg/coins.svg"));
  notes.push(makeNote(sceneId, counter.n++, 700, 900, "F. Initials list (incl. second \"E.\") (DC 13)", "icons/svg/mystery-man.svg"));
  notes.push(makeNote(sceneId, counter.n++, 500, 400, "G. Fear note (\"third winter I have been afraid\") (DC 12)", "icons/svg/silenced.svg"));

  return { sceneId, walls, lights, notes };
}

function buildTrinaTownhouse() {
  // 1024 × 1536 — single floor, axial hallway
  const sceneId = "BR2SceneTrina01";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Building perimeter (south = bottom, north = top)
  walls.push(segment(sceneId, counter, 100, 1400, 920, 1400));    // S exterior wall (street side)
  walls.push(segment(sceneId, counter, 420, 1400, 600, 1400, "door"));// front door (centered)
  walls.push(segment(sceneId, counter, 920, 1400, 920, 400));     // E (with kitchen wing top corner)
  walls.push(segment(sceneId, counter, 920, 400, 100, 400));      // N (kitchen north wall)
  walls.push(segment(sceneId, counter, 100, 400, 100, 1400));     // W

  // Front-door windows
  walls.push(segment(sceneId, counter, 200, 1400, 350, 1400, "window"));
  walls.push(segment(sceneId, counter, 680, 1400, 820, 1400, "window"));

  // Foyer (south end) — small entry just inside front door
  walls.push(segment(sceneId, counter, 100, 1200, 920, 1200));    // foyer north wall
  walls.push(segment(sceneId, counter, 450, 1200, 580, 1200, "door"));// foyer arch to central hall

  // Central hall (a 6 ft narrow corridor running N-S up the centre)
  walls.push(segment(sceneId, counter, 380, 700, 380, 1200));     // hall west
  walls.push(segment(sceneId, counter, 640, 700, 640, 1200));     // hall east
  // Parlor door (E wall of hall)
  walls.push(segment(sceneId, counter, 640, 850, 640, 950, "door"));
  // Library door (W wall of hall)
  walls.push(segment(sceneId, counter, 380, 850, 380, 950, "door"));
  // Stair at the south end of hall (drawn but doesn't block movement; rep as wall around it)
  walls.push(segment(sceneId, counter, 380, 1100, 480, 1100));    // stair base west
  walls.push(segment(sceneId, counter, 540, 1100, 640, 1100));    // stair base east
  walls.push(segment(sceneId, counter, 480, 1100, 540, 1100, "door"));// stair to upper

  // Library (W of hall)
  walls.push(segment(sceneId, counter, 100, 700, 380, 700));      // library north (separating from kitchen)
  walls.push(segment(sceneId, counter, 100, 700, 100, 1200));     // library west (already perimeter)
  walls.push(segment(sceneId, counter, 100, 1000, 100, 1000));    // (no library west window — wall continues)
  // Library window (west exterior wall)
  walls.push(segment(sceneId, counter, 100, 800, 100, 950, "window"));

  // Receiving parlor (E of hall)
  walls.push(segment(sceneId, counter, 640, 700, 920, 700));      // parlor north
  walls.push(segment(sceneId, counter, 920, 800, 920, 1100, "window"));// parlor east windows (long)

  // Kitchen (north end, full width)
  walls.push(segment(sceneId, counter, 100, 700, 920, 700));      // kitchen south wall (separates kitchen from library+parlor)
  walls.push(segment(sceneId, counter, 450, 700, 580, 700, "door"));// kitchen door from hall
  // Kitchen interior is open
  // Service door on east wall of kitchen → back garden
  walls.push(segment(sceneId, counter, 920, 500, 920, 600, "door"));
  // Window over kitchen sink (N wall)
  walls.push(segment(sceneId, counter, 400, 400, 550, 400, "window"));

  // Back garden (outside building footprint, but inside property walls)
  // (in this scene model, the garden is shown above the building's north wall in the
  // underlying art; we don't enclose it with walls here, but a side-lane gate
  // exists at the very top — represented as a window on the garden-area boundary)
  // (we treat garden as outdoor)

  // Lights — lamplight at corners
  lights.push(makeLight(sceneId, counter.n++, 250, 1320, "lamp"));   // foyer NW lamp
  lights.push(makeLight(sceneId, counter.n++, 750, 1320, "lamp"));   // foyer NE lamp
  lights.push(makeLight(sceneId, counter.n++, 510, 1050, "lamp"));   // stair lamp
  lights.push(makeLight(sceneId, counter.n++, 240, 1000, "lamp"));   // library reading lamp
  lights.push(makeLight(sceneId, counter.n++, 220, 850, "lamp"));    // library brass lamp
  lights.push(makeLight(sceneId, counter.n++, 800, 900, "lamp"));    // parlor lamp
  lights.push(makeLight(sceneId, counter.n++, 780, 1050, "lamp"));   // parlor side lamp
  lights.push(makeLight(sceneId, counter.n++, 240, 550, "hearth"));  // kitchen hearth
  lights.push(makeLight(sceneId, counter.n++, 700, 550, "lamp"));    // kitchen lamp
  lights.push(makeLight(sceneId, counter.n++, 510, 540, "lamp"));    // kitchen worktable lamp

  // Notes
  notes.push(makeNote(sceneId, counter.n++, 510, 1320, "Front door (Civic Way)", "icons/svg/door.svg"));
  notes.push(makeNote(sceneId, counter.n++, 510, 1050, "Stair up (Trina's chambers above)", "icons/svg/stoned.svg"));
  notes.push(makeNote(sceneId, counter.n++, 240, 900, "Library (Trina's reading room)", "icons/svg/book.svg"));
  notes.push(makeNote(sceneId, counter.n++, 800, 950, "Receiving Parlor (Trina meets visitors here)", "icons/svg/silenced.svg"));
  notes.push(makeNote(sceneId, counter.n++, 700, 550, "Service door → back garden → side lane (escape route)", "icons/svg/door-exit.svg"));

  return { sceneId, walls, lights, notes };
}

function buildSparrowsRunLoftwick() {
  // 3072 × 4096 — Loftwick city map, dense northern commercial quarter.
  // Footchase along four reaches: Wick Lane → Cloth Market → Loft Steps wall → Tanners' Cut → Culvert.
  // Light wall chain to outline the chase corridor; the work is done by the four reach notes + fold-drop note.
  const sceneId = "BR2SceneSprwLftwk";
  const counter = { n: 0 };
  const walls = [];
  const lights = [];
  const notes = [];

  // Reach 1 — Wick Lane → Cloth Market.
  // Start: Sparrow's corner at the head of Wick Lane.
  // End: spilling into the Cloth Market square.
  walls.push(segment(sceneId, counter, 1500, 720, 1500, 1100));   // Wick Lane W wall
  walls.push(segment(sceneId, counter, 1720, 720, 1720, 1100));   // Wick Lane E wall
  walls.push(segment(sceneId, counter, 1350, 1100, 1850, 1100));  // Cloth Market N edge (crowd-line)

  // Reach 2 — The market wall and the Loft Steps (FOLD DROP HERE).
  walls.push(segment(sceneId, counter, 1250, 1300, 1450, 1300));  // low market wall (Sparrow vaults this)
  walls.push(segment(sceneId, counter, 1180, 1320, 1180, 1500));  // Loft Steps W edge
  walls.push(segment(sceneId, counter, 1420, 1320, 1420, 1500));  // Loft Steps E edge

  // Reach 3 — The Tanners' Cut (narrow alley).
  walls.push(segment(sceneId, counter, 1500, 1620, 1500, 1900));  // Tanners' Cut W wall
  walls.push(segment(sceneId, counter, 1660, 1620, 1660, 1900));  // Tanners' Cut E wall

  // Reach 4 — The culvert at the river's edge.
  walls.push(segment(sceneId, counter, 1620, 2020, 1820, 2020));  // culvert N approach
  walls.push(segment(sceneId, counter, 1680, 2050, 1760, 2050, "door"));  // half-open grate (door type)

  // Reach markers — each note carries the DC + obstacle text for the GM.
  notes.push(makeNote(sceneId, counter.n++, 1610, 760,
    "Start — Sparrow's corner (head of Wick Lane). She launches the instant the party moves to take her.",
    "icons/svg/eye.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1610, 1180,
    "Reach 1 — Cloth Market crowd. DC 13: Athletics (shove), Acrobatics (vault), Intimidation/Persuasion (\"Make way!\"), Insight/Investigation (cut the corner). Sparrow uses Nimble Bolt to open the gap.",
    "icons/svg/regen.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1300, 1380,
    "Reach 2 — Market wall & Loft Steps. FOLD DROPS HERE. Athletics/Acrobatics DC 15 to clear the wall. A pursuer can snatch the oilcloth fold (costs their action) or mark the spot and grab it after.",
    "icons/svg/scroll.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1580, 1770,
    "Reach 3 — Tanners' Cut. Sparrow upends a fleece-barrow. DC 15: Acrobatics/Dexterity (vault), Athletics (bull through), Survival/streetwise (parallel cut). A fumble costs a round untangling wool.",
    "icons/svg/run.svg"));
  notes.push(makeNote(sceneId, counter.n++, 1720, 2070,
    "Reach 4 — The culvert (escape). Half-open grate at the waterline + flat skiff in the reeds. Sparrow escapes UNLESS the party has already driven Lead to 0 AND has a real way to follow (flying, Small, readied grapple, hold person, misty step, water-walking).",
    "icons/svg/door-exit.svg"));

  // Standing-orders box note for the GM, off to the side.
  notes.push(makeNote(sceneId, counter.n++, 2200, 1400,
    "Lead tracker — start at 2. Party drives down with success, Sparrow drives up. She escapes when the route runs out. Keep to 3–4 rounds; never let one bad roll end it. THE CLUE IS NOT THE CAPTURE — the fold drops at Reach 2 regardless.",
    "icons/svg/clockwork.svg"));

  return { sceneId, walls, lights, notes };
}

// ---------- write back to scene files ----------
function updateScene(scenePath, build) {
  const j = JSON.parse(fs.readFileSync(scenePath, "utf8"));
  j.walls = build.walls;
  j.lights = build.lights;
  j.notes = build.notes;
  fs.writeFileSync(scenePath, JSON.stringify(j, null, 2) + "\n");
  console.log(`  ✓ ${path.relative(ROOT, scenePath)}: ${build.walls.length} walls, ${build.lights.length} lights, ${build.notes.length} notes`);
}

console.log("Building Phase 2 scenes ...");

const targets = [
  ["packs/_source/phase-1-scenes/scene-little-palace-main-floor.json", buildLittlePalaceMain],
  ["packs/_source/phase-1-scenes/scene-little-palace-2nd-floor.json", buildLittlePalaceSecond],
  ["packs/_source/phase-1-scenes/scene-little-palace-cellar.json", buildLittlePalaceCellar],
  ["packs/_source/phase-2-scenes/scene-doctor-pollow-s-office.json", buildPollowOffice],
  ["packs/_source/phase-2-scenes/scene-records-alcove-cindren-vhal-loftwick.json", buildRecordsAlcoveCV],
  ["packs/_source/phase-2-scenes/scene-vellin-moraven-s-home.json", buildVellinHome],
];

for (const [rel, builder] of targets) {
  updateScene(path.join(ROOT, rel), builder());
}

// New scenes for the new maps
const newScenes = [
  {
    file: "packs/_source/phase-2-scenes/scene-tamsin-counting-house.json",
    name: "Tamsin's Counting House",
    img: "modules/blooming-rot-2/assets/maps/tamsin-counting-house-interior.png",
    sceneId: "BR2SceneTamsin01",
    width: 1024,
    height: 1536,
    builder: buildTamsinCountingHouse
  },
  {
    file: "packs/_source/phase-2-scenes/scene-gilst-rented-rooms.json",
    name: "Merro Gilst's Rented Rooms",
    img: "modules/blooming-rot-2/assets/maps/gilst-rented-rooms-interior.png",
    sceneId: "BR2SceneGilst01",
    width: 1024,
    height: 1536,
    builder: buildGilstRooms
  },
  {
    file: "packs/_source/phase-2-scenes/scene-trina-townhouse.json",
    name: "Trina Alvere's Townhouse",
    img: "modules/blooming-rot-2/assets/maps/trina-townhouse-interior.png",
    sceneId: "BR2SceneTrina01",
    width: 1024,
    height: 1536,
    builder: buildTrinaTownhouse
  },
  {
    file: "packs/_source/phase-2-scenes/scene-sparrows-run-loftwick.json",
    name: "Sparrow's Run — Loftwick Footchase",
    img: "modules/blooming-rot-2/assets/maps/Loftwick.jpg",
    sceneId: "BR2SceneSprwLftwk",
    width: 3072,
    height: 4096,
    builder: buildSparrowsRunLoftwick
  }
];

for (const ns of newScenes) {
  const fullPath = path.join(ROOT, ns.file);
  const build = ns.builder();

  // Skeleton scene mirroring the existing Phase 2 scenes' shape
  const scene = {
    _key: `!scenes!${ns.sceneId}`,
    _id: ns.sceneId,
    name: ns.name,
    active: false,
    navigation: true,
    navOrder: 0,
    navName: ns.name,
    background: {
      src: ns.img,
      anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0,
      fit: "fill", scaleX: 1, scaleY: 1, rotation: 0,
      tint: "#ffffff", alphaThreshold: 0
    },
    foreground: null,
    foregroundElevation: 20,
    thumb: null,
    width: ns.width,
    height: ns.height,
    padding: 0,
    initial: null,
    backgroundColor: "#1a1a1a",
    grid: {
      type: 1, size: 100, style: "solidLines",
      thickness: 1, color: "#000000", alpha: 0.2,
      distance: 5, units: "ft"
    },
    tokenVision: true,
    fog: { exploration: true, reset: null, overlay: null, colors: { explored: null, unexplored: null } },
    environment: {
      darknessLevel: 0, darknessLock: false,
      globalLight: { enabled: true, alpha: 0.5, bright: false, color: null, coloration: 1, luminosity: 0, saturation: 0, contrast: 0, shadows: 0, darkness: { min: 0, max: 0 } },
      cycle: true,
      base: { hue: 0, intensity: 0, luminosity: 0, saturation: 0, shadows: 0 },
      dark: { hue: 0, intensity: 0, luminosity: -0.25, saturation: 0, shadows: 0 }
    },
    drawings: [],
    tokens: [],
    lights: build.lights,
    walls: build.walls,
    templates: [],
    tiles: [],
    regions: [],
    notes: build.notes,
    sounds: [],
    journal: null,
    journalEntryPage: null,
    playlist: null,
    playlistSound: null,
    weather: "",
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: { compendiumSource: null, duplicateSource: null, exportSource: null, coreVersion: "13.351", systemId: "dnd5e", systemVersion: "5.3.0", createdTime: null, modifiedTime: null, lastModifiedBy: null }
  };
  fs.writeFileSync(fullPath, JSON.stringify(scene, null, 2) + "\n");
  console.log(`  ✓ ${ns.file} CREATED: ${build.walls.length} walls, ${build.lights.length} lights, ${build.notes.length} notes`);
}

console.log("\nDone.");
