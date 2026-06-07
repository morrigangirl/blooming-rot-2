#!/usr/bin/env node
// Generates Phase 2 pressure clock images — 7 states (0-6 filled segments).
// Produces PNG via SVG → ImageMagick so the output is transparent-background.
//
// Usage:  node scripts/generate-pressure-clocks.mjs
// Output: assets/ui/pressure-clock-phase2-{0..6}.png

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT  = path.join(ROOT, "assets", "ui");
const TMP  = path.join(ROOT, "assets", "_raw");
fs.mkdirSync(OUT,  { recursive: true });
fs.mkdirSync(TMP,  { recursive: true });

// Write a minimal ImageMagick type.xml so it can find Georgia TTFs.
// MAGICK_FONT_PATH must point to a directory containing type.xml.
const FONT_DIR = "/System/Library/Fonts/Supplemental";
const typeXml = `<?xml version="1.0" encoding="UTF-8"?>
<typemap>
  <type name="Georgia"
        fullname="Georgia Regular"
        family="Georgia"
        style="Normal"
        stretch="Normal"
        weight="400"
        glyphs="${FONT_DIR}/Georgia.ttf"/>
  <type name="Georgia-Bold"
        fullname="Georgia Bold"
        family="Georgia"
        style="Normal"
        stretch="Normal"
        weight="700"
        glyphs="${FONT_DIR}/Georgia Bold.ttf"/>
</typemap>`;
const MAGICK_CFG_DIR = path.join(TMP, "magick-cfg");
fs.mkdirSync(MAGICK_CFG_DIR, { recursive: true });
fs.writeFileSync(path.join(MAGICK_CFG_DIR, "type.xml"), typeXml, "utf8");

// ── geometry ──────────────────────────────────────────────────────────────────
const W   = 210;      // SVG width
const H   = 252;      // SVG height (circle + text labels below)
const CX  = 105;      // circle centre x
const CY  = 106;      // circle centre y (nudged up from H/2 to leave more room below)
const RO  = 90;       // outer radius
const RI  = 34;       // inner radius (centre hole)
const SEG = 6;        // number of segments
const GAP = 1.8;      // gap between segments in degrees

// ── palette ───────────────────────────────────────────────────────────────────
// Using fill + fill-opacity / stroke + stroke-opacity for maximum SVG compat.
const GOLD       = "#d7aa37";
const GOLD_DIM   = "#c09428";
const CRIMSON    = "#9b1212";
const CRIMSON_LO = "#c84040";
const BG_DARK    = "#0c0602";
const INNER_DARK = "#080401";
const WHITE      = "#ffffff";

// ── telegraph texts ───────────────────────────────────────────────────────────
const TELEGRAPHS = [
  { name: "CLEAR",         sub: "Phase 2 · Loftwick" },
  { name: "TAMPERING",     sub: "Someone was looking." },
  { name: "WARNING",       sub: "Trina won't budge." },
  { name: "RUMOUR",        sub: "The party is recognisable." },
  { name: "WITNESS LOSS",  sub: "Cut the thread that hurts most." },
  { name: "MOTION FILED",  sub: "48 hours remain." },
  { name: "DOOR SHUTS",    sub: "GM's choice — the worst." },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function toRad(deg) { return (deg - 90) * Math.PI / 180; }   // 0° = top

function pt(r, deg) {
  const a = toRad(deg);
  return { x: +(CX + r * Math.cos(a)).toFixed(3), y: +(CY + r * Math.sin(a)).toFixed(3) };
}

// Donut-slice path from startDeg to endDeg
function donutPath(startDeg, endDeg) {
  const p1 = pt(RO, startDeg + GAP);
  const p2 = pt(RO, endDeg   - GAP);
  const p3 = pt(RI, endDeg   - GAP);
  const p4 = pt(RI, startDeg + GAP);
  const arc = (endDeg - startDeg) > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${RO} ${RO} 0 ${arc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${RI} ${RI} 0 ${arc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

// ── SVG builder ───────────────────────────────────────────────────────────────
function buildSVG(filled) {
  const el = [];   // SVG element strings

  // ── drop shadow / glow behind the whole disc
  el.push(`<defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
      <feOffset dx="0" dy="1"/>
      <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="saturate" values="0"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`);

  // Outer decorative ring (dashed)
  el.push(`<circle cx="${CX}" cy="${CY}" r="${RO + 6}"
    fill="none"
    stroke="${GOLD_DIM}" stroke-opacity="0.45"
    stroke-width="1" stroke-dasharray="3.5 3"/>`);

  // Main background disc
  el.push(`<circle cx="${CX}" cy="${CY}" r="${RO + 2}"
    fill="${BG_DARK}" fill-opacity="0.87"
    stroke="${GOLD}" stroke-opacity="0.88"
    stroke-width="2.5"
    filter="url(#glow)"/>`);

  // Donut segments
  for (let i = 0; i < SEG; i++) {
    const start = (i / SEG) * 360;
    const end   = ((i + 1) / SEG) * 360;
    const d = donutPath(start, end);
    if (i < filled) {
      // Filled — deep crimson with a lighter inner edge
      el.push(`<path d="${d}" fill="${CRIMSON}" fill-opacity="0.92"
        stroke="${CRIMSON_LO}" stroke-opacity="0.55" stroke-width="0.8"/>`);
    } else {
      // Empty — barely-there fill, gold outline
      el.push(`<path d="${d}" fill="${WHITE}" fill-opacity="0.06"
        stroke="${GOLD}" stroke-opacity="0.45" stroke-width="0.8"/>`);
    }
  }

  // Radial dividers (centre → outer rim)
  for (let i = 0; i < SEG; i++) {
    const deg = (i / SEG) * 360;
    const inner = pt(RI - 1, deg);
    const outer = pt(RO + 1, deg);
    el.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}"
      stroke="${GOLD}" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round"/>`);
  }

  // Inner centre hole
  el.push(`<circle cx="${CX}" cy="${CY}" r="${RI}"
    fill="${INNER_DARK}" fill-opacity="0.97"
    stroke="${GOLD}" stroke-opacity="0.70" stroke-width="1.5"/>`);

  // Counter "3/6" in the centre hole
  const countY = CY + 6;
  el.push(`<text x="${CX}" y="${countY}"
    text-anchor="middle"
    font-family="Georgia"
    font-size="17" font-weight="bold" letter-spacing="1"
    fill="${GOLD}" fill-opacity="0.96">${filled}&#x2F;${SEG}</text>`);

  // Telegraph name (below circle)
  const label1 = TELEGRAPHS[filled].name;
  const label2 = TELEGRAPHS[filled].sub;
  const textY1 = CY + RO + 20;
  const textY2 = CY + RO + 35;

  el.push(`<text x="${CX}" y="${textY1}"
    text-anchor="middle"
    font-family="Georgia"
    font-size="11.5" font-weight="bold" letter-spacing="2"
    fill="${GOLD}" fill-opacity="0.95">${label1}</text>`);

  el.push(`<text x="${CX}" y="${textY2}"
    text-anchor="middle"
    font-family="Georgia"
    font-size="9" letter-spacing="1"
    fill="${GOLD_DIM}" fill-opacity="0.78">${label2}</text>`);

  // Embed font via @font-face so librsvg/ImageMagick can resolve it
  const fontFace = `<defs>
  <style>
    @font-face {
      font-family: 'Georgia';
      font-weight: normal;
      src: url('/System/Library/Fonts/Supplemental/Georgia.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Georgia';
      font-weight: bold;
      src: url('/System/Library/Fonts/Supplemental/Georgia Bold.ttf') format('truetype');
    }
  </style>
</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg"
  width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${fontFace}
${el.join("\n")}
</svg>`;
}

// ── generate ─────────────────────────────────────────────────────────────────
for (let n = 0; n <= SEG; n++) {
  const svg     = buildSVG(n);
  const svgFile = path.join(TMP, `pressure-clock-phase2-${n}.svg`);
  const pngFile = path.join(OUT, `pressure-clock-phase2-${n}.png`);

  fs.writeFileSync(svgFile, svg, "utf8");

  // Convert SVG → PNG via ImageMagick, transparent background, 2× density for crisp edges.
  // MAGICK_FONT_PATH must point to a directory containing type.xml (font registry).
  execFileSync("magick", [
    "-background", "none",
    "-density",    "144",
    svgFile,
    pngFile,
  ], {
    env: {
      ...process.env,
      MAGICK_FONT_PATH: MAGICK_CFG_DIR,
    },
  });

  const kb = (fs.statSync(pngFile).size / 1024).toFixed(0);
  console.log(`  pressure-clock-phase2-${n}.png  (${kb} KB)`);
}

console.log("Done.");
