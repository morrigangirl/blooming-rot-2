#!/usr/bin/env node
// Blooming Rot 2 — image generator
// Calls OpenAI gpt-image-1.5 for portraits, tokens, handouts, and sigils.
// Resizes / round-crops via ImageMagick (`magick`).
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs              # all tiers
//   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs --tier 1     # only tier-1
//   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs --only merev-sarth-portrait
//   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs --dry-run    # print plan, don't call API
//
// Output:
//   assets/portraits/<id>.png
//   assets/tokens/<id>.png         (round-cropped 512x512)
//   assets/handouts/<id>.png
//   assets/sigils/<id>.png
//   assets/gm-only/<id>.png        (GM-eyes only — three-rayed sun, etc.)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const RAW = path.join(ROOT, "assets", "_raw");

const ART_STYLE = "Painterly fantasy realism, warm hand-painted feel, " +
  "muted earth-and-jewel palette, soft natural lighting, " +
  "consistent with classic Greyhawk-era D&D illustration. " +
  "No text, no logos, no watermarks, no borders, no frames. " +
  "Subject only, against a clean dark or atmospheric backdrop appropriate to the scene.";

const HANDOUT_STYLE = "Aged parchment / vellum prop, photographed flat under soft warm light. " +
  "Hand-written in iron-gall ink with quill, period-accurate Yeomanry / Aerdi clerical style. " +
  "Subtle wear, fold creases, slight foxing. " +
  "Text must be clearly legible exactly as specified. " +
  "Photographed straight-on, no perspective, no decorative borders. " +
  "Plain dark surface around the parchment.";

const SIGIL_STYLE = "Heraldic emblem, single composition centered on a plain dark field. " +
  "Embossed metal or pressed wax look, painterly highlight, no text. " +
  "Symmetric, suitable for use as a token icon. " +
  "Subject only — no banners, no shields, no surrounding ornament unless requested.";

const JOBS = [
  // ============== TIER 1 — must-have ==============
  {
    id: "merev-sarth-portrait",
    tier: 1,
    out: "assets/portraits/merev-sarth-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MEREV SARTH, a professional human thief in her mid-thirties.
Lean, weathered, plain features, watchful eyes, mouth a careful line that does not smile.
Short dark-brown hair tied back. No jewelry. No insignia.
Wearing a real Yeomanry courier's tabard (plain wool, dull green over a darker undershirt) — a uniform she purchased, not earned.
She is half-shadowed; she has been doing quiet work for fifteen years and the camera has caught her at a moment she did not arrange.
Three-quarter view from waist up, looking slightly past the viewer, not at them.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "caelith-token",
    tier: 1,
    out: "assets/tokens/caelith-dunivar-token.png",
    sourceFromExisting: "assets/portraits/Caelith-Dunivar-Portrait.png",
    skipGeneration: true,
    postProcess: "round-token-512",
    // Bronze / dark gold — Hand of the Duke, civic gravity.
    ring: { base: "#a07c2c", highlight: "#d8c378", shadow: "#3a2410" },
  },
  {
    id: "trina-token",
    tier: 1,
    out: "assets/tokens/trina-alvere-token.png",
    sourceFromExisting: "assets/portraits/trina-alvere-portrait.png",
    skipGeneration: true,
    postProcess: "round-token-512",
    // Silver-violet — fey-tinted, subtle Archfey hint without naming it.
    ring: { base: "#8a7ba9", highlight: "#c4b5dc", shadow: "#2a2240" },
  },
  {
    id: "merev-token",
    tier: 1,
    out: "assets/tokens/merev-sarth-token.png",
    sourceFromExisting: "assets/portraits/merev-sarth-portrait.png",
    skipGeneration: true,
    postProcess: "round-token-512",
    dependsOn: "merev-sarth-portrait",
    // Dark steel — professional, hostile disposition.
    ring: { base: "#4a4a52", highlight: "#7e7e88", shadow: "#1a1a1c" },
  },
  {
    id: "cindren-vhal-house-seal",
    tier: 1,
    out: "assets/sigils/cindren-vhal-house-seal.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Heraldic seal of CINDREN & VHAL, BONDED FACTORS — an Aerdi private banking house.
Centered composition: a long-necked CRANE in flight, wings spread, soaring above THREE STACKED COINS
(circular, with simple struck rims, no faces or numerals). The crane is rendered in clean metal-relief style.
The three coins are arranged in a small vertical pyramid below the crane, slightly overlapping.
Embossed on a dark red sealing-wax disc, with a faint thumbprint impression at one edge suggesting the seal was pressed by hand.
${SIGIL_STYLE}`,
    postProcess: null,
  },
  {
    id: "cindren-vhal-countermark",
    tier: 1,
    out: "assets/sigils/cindren-vhal-countermark.png",
    size: "1024x1024",
    quality: "high",
    prompt: `An internal clearing-mark of CINDREN & VHAL, BONDED FACTORS — small countermark used between the firm's offices.
Centered composition: a stylized stone HARBOR TOWER, narrow and tall with one small banner-pennant at its top, rising above
THREE WAVES (curling, simple, parallel) at the bottom. Tight composition, more like a punch-mark than a house seal.
Rendered as if struck into the silver edge of a clipped coin — show the mark itself in clean isolation, not embedded in the coin.
Slight tarnish, asymmetric punch quality consistent with hand-struck assay marks.
${SIGIL_STYLE}`,
    postProcess: null,
  },

  // ============== TIER 2 — handouts ==============
  {
    id: "false-letter-of-passage",
    tier: 2,
    out: "assets/handouts/false-letter-of-passage.png",
    size: "1024x1536",
    quality: "high",
    prompt: `A Yeomanry letter of safe passage, photographed flat. Aged cream parchment, slight foxing.
Hand-written in iron-gall ink in a careful 16th-century-style chancery script.
The legible text reads exactly:

"By the office of the Bureau of Crop Estimation, Loftwick, in the Yeomanry of the Sheldomar:
Let the bearer pass the inns, gates, and assessor-houses of this Republic without let or delay.
Bearer is named HASKUR VOREN, Agricultural Assessor, in service to this Bureau.
Granted in good faith and the gratitude of the Council, summer of this year."

Below the body of the letter, an ink signature (no specific name visible — illegible flourish), and pressed beneath it a wax seal with an indistinct chop (just a roundel with abstract impression — do NOT show the crane-and-coins seal here).
${HANDOUT_STYLE}`,
    postProcess: null,
  },
  {
    id: "ledger-fragment",
    tier: 2,
    out: "assets/handouts/ledger-fragment.png",
    size: "1536x1024",
    quality: "high",
    prompt: `A torn corner of double-entry accounting paper, photographed flat. Cream parchment, ragged tear along two edges, the rest neatly cut.
No header, no date, no margin notation, no totals, no sums anywhere.
Just three lines, each in a clearly different handwriting:

Line 1 (a confident clerk's hand, small careful capitals): "VANDRELL settled"
Line 2 (a hurried slanting hand, ink slightly thicker): "MORAVEN delayed"
Line 3 (a neat librarian-style hand, very even): "GILST transferred"

The three hands must be visibly different — different ink color (one slightly browner, one bluer, one black-grey), different letter slope, different line weight.
${HANDOUT_STYLE}`,
    postProcess: null,
  },
  {
    id: "vellum-strip-harbor-before-throne",
    tier: 2,
    out: "assets/handouts/vellum-strip-harbor-before-throne.png",
    size: "1536x1024",
    quality: "high",
    prompt: `A narrow strip of fine vellum, photographed flat — long and thin, as if cut from a wider sheet.
Slightly off-white, with a hint of yellow age.
Centered on the strip, four words in clear careful capitals, one line, no other ornament:

"HARBOR BEFORE THRONE"

The lettering is precise, drawn in dark iron-gall ink with a fine quill. No date, no signature, no decoration.
${HANDOUT_STYLE}`,
    postProcess: null,
  },
  {
    id: "hand-of-the-duke-token",
    tier: 2,
    out: "assets/sigils/hand-of-the-duke-token.png",
    size: "1024x1024",
    quality: "high",
    prompt: `A small flat brass token, the size of a thumbnail, lying on a dark slate surface under warm lamplight.
The token is etched on its face with two simple symbols: a writing QUILL above a small CLOSED GATE (a shut wooden gate with iron bands).
The quill points downward, nib above the gate's central iron lock.
The token has a subtle worn shine; the etching is shallow but clean.
Slight tarnish suggests the token has been carried in a pocket for many years.
No text, no inscription, no decoration around the rim.
${SIGIL_STYLE}`,
    postProcess: null,
  },

  // ============== TIER 3 — supporting ==============
  {
    id: "arthen-moll-portrait",
    tier: 3,
    out: "assets/portraits/arthen-moll-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of ARTHEN MOLL, a Yeomanry civic functionary in his mid-fifties.
Round, well-fed, well-dressed, sincere. A man who genuinely believes the work he does is for the good of the Republic.
Wearing pearl-gray Yeomanry civil dress over a dark-blue waistcoat, with a small silver pin shaped like an open hand at his collar.
Soft features, friendly eyes, a polished smile that he gives the same way to everyone — friend, errand-boy, witness.
Holding a small leather portfolio under one arm. Three-quarter view from waist up.
He is not a villain. He is the wall the soft pressure faction puts in front of inquiries.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "hesren-vesh-portrait",
    tier: 3,
    out: "assets/portraits/hesren-vesh-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of HESREN VESH, a junior bonded clerk in his early thirties.
Tall, slim, courteous to the point of stiffness. A man who is polite to everyone and trusts no one.
Wearing the firm's livery — a plain dark-green wool coat buttoned to the throat, a small brass pin on the lapel
shaped like a CRANE in flight above three coins (the Cindren & Vhal house seal).
Short brown hair, neatly cut. Clean-shaven. His eyes have the careful, level set of someone who is junior in something dangerous.
Three-quarter view from waist up, against a plain dark wood-paneled background.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "gilst-locket-miniature",
    tier: 3,
    out: "assets/handouts/gilst-locket-miniature.png",
    size: "1024x1024",
    quality: "high",
    prompt: `A small painted miniature portrait, the size of a coin, the kind that fits inside a silver locket.
A young woman, perhaps thirty, dark-haired, with a slight private smile and steady eyes.
She is unidentified — no name, no insignia, no background detail. Plain dark backdrop behind her.
Painted in delicate brushwork on enamel, slightly aged, very softly lit.
Show only the miniature itself, photographed flat against a dark velvet surface.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "fear-note",
    tier: 3,
    out: "assets/handouts/fear-note.png",
    size: "1024x1024",
    quality: "high",
    prompt: `A small folded slip of cheap paper, photographed flat. Slightly cream-yellow, with one fold crease across the middle and a softened corner.
Hand-written in a tight nervous script with iron-gall ink.
The legible text, on three lines, reads exactly:

"If they ask again, I do not know how to keep saying no.
If they stop asking, I do not know what that will mean.
This is the third winter I have been afraid."

No date, no signature, no decoration. The ink trembles slightly on the second line.
${HANDOUT_STYLE}`,
    postProcess: null,
  },

  // ============== TIER 4 — GM-only ==============
  {
    id: "three-rayed-sun-into-fist",
    tier: 4,
    out: "assets/gm-only/three-rayed-sun-into-fist.png",
    size: "1024x1024",
    quality: "high",
    prompt: `An arcane sigil, the kind a wizardly conspirator might use as a personal mark.
A stylized THREE-RAYED SUN (three straight rays radiating from a small central disc) collapsing or being clenched into a CLOSED FIST.
The composition reads as motion: the rays bend inward and converge into the gripping hand at the bottom of the image.
Rendered as if pressed into red sealing wax — embossed, slightly shadowed, with a faint thumbprint at one edge.
GM-ONLY: this sigil belongs to the conspirators' patron school of magic — never shown to the players in Phase 2.
${SIGIL_STYLE}`,
    postProcess: null,
  },

  // ============== TIER 5 — narrative illustrations (scenery / arrival beats) ==============
  {
    id: "loftwick-northern-approach",
    tier: 5,
    out: "assets/illustrations/loftwick-northern-approach.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art in the style of contemporary tabletop-RPG book covers (D&D, Pathfinder, Critical Role). Cinematic wide landscape, autumn late-afternoon golden hour.
A small adventuring party — a fighter in worn plate, a wizard in a hooded travel cloak, a half-elf ranger, a dwarf with a road-stained pack — is walking along a flat well-trodden road through autumn-yellowed grassland and shorn fields of grain stubble. They look road-weary, returning from battle. Two riders in dark militia tabards with green sashes flank them as a quiet escort — no fanfare, no banners.
Middle distance: the fantasy CITY OF LOFTWICK behind pale limestone fortified walls. The walls are irregular and hand-built with squared bastions and crenellation. A pair of iron-banded oak gates remains closed. Behind the walls rise the city's slate-roofed civic towers and squat practical spires — no soaring cathedrals, the silhouette of a republic that prefers function to majesty. Cooking-fire smoke curls upward.
Far horizon: the JOTUN MOUNTAINS as distant blue-violet silhouettes to the north-west.
Lighting: dramatic cinematic golden-hour rim-light from low sun, long warm shadows, atmospheric perspective.
Composition: classic fantasy book-cover framing, the eye drawn from the foreground party to the city walls then to the mountains.
Style: painterly digital fantasy illustration, vivid but tonally cohesive palette of warm gold, stone-grey, deep autumn green and rust. Detail-rich but not photorealistic. NOT 19th-century oil painting — modern fantasy genre art.
No text, no labels.`,
    postProcess: null,
  },
  {
    id: "little-palace-entrance",
    tier: 5,
    out: "assets/illustrations/little-palace-entrance.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art in the style of contemporary tabletop-RPG book interiors (D&D 5e module art, Pathfinder, Tales of the Valiant). Exterior of a fantasy civic guesthouse called THE LITTLE PALACE, late autumn afternoon.
The building is pale limestone, four hundred years old, well-kept but never opulent. The facade shows a ceremonial portico of four squared limestone columns — severe republican style, no statues or friezes. Behind the portico stands a pair of heavy IRON-BANDED OAK DOORS with weathered hardware, closed but not unwelcoming. The doors are flanked by stone planters with autumn herbs.
Above the doors hangs a faded gold-thread BANNER showing a stylized wheatsheaf in a circle (banner text indistinct).
A single MILITIA GUARD in a fantasy-medieval uniform stands at the leftmost column — dark wool coat, green sash, leather brigandine, plain longsword at hip, hands clasped at the small of the back, watchful at-ease posture.
At the bottom edge of the frame: cobblestones of a wider city street, the corner of an opposite stone building, a pair of weary fantasy adventurers in cloaks and travel gear approaching the steps.
Atmosphere: principled, civic, slightly austere — function before majesty. Dramatic afternoon shadows; warm gold rim-light on the upper columns and banner; cool stone in shadow below.
Composition: classic fantasy module interior-illustration framing — slightly low angle, the doors centered, the guard small and human-scale at left.
Style: painterly digital fantasy illustration, atmospheric, palette of warm stone-grey, dark oak, faded gold, deep green. NOT 19th-century oil painting — modern fantasy concept art.
No text.`,
    postProcess: null,
  },
  {
    id: "little-palace-sitting-room",
    tier: 5,
    out: "assets/illustrations/little-palace-sitting-room.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art in the style of contemporary tabletop-RPG book interiors (D&D 5e, Pathfinder 2e, fantasy adventure-module art). Interior view of a hospitable but civic SITTING ROOM in an old fantasy-medieval republic guesthouse, late-morning autumn light.
At the room's heart: a stone fireplace with a low LIVE FIRE, the flames casting warm amber rim-light across the scene. The fireplace mantel holds a few small civic objects — a brass candlestick, a folded letter, a single pewter cup.
Furniture: a long settee with worn dark-green upholstery and brass tacking sits at left, dark-stained oak chairs arranged loosely around the hearth, a low oak table near them holding a single empty teacup on a saucer as if just set down. A faded crimson rug with a geometric border lies on a polished oak floor. Whitewashed plaster walls and dark exposed beams overhead.
On one wall: three small framed civic PORTRAITS, painted in the same modest style — past officials, unlabeled. On another: a tall narrow case of bound CONSTITUTIONAL VOLUMES.
A sideboard with a pewter pitcher and three plain glasses. A small writing desk near a tall arched WINDOW with leaded panes; through the window, late-morning gold sunlight slants in on dust motes, and an inner courtyard with autumn foliage is glimpsed beyond.
No people in the room.
Mood: warm, lived-in, civic rather than royal — a room that has heard many private conversations and held no grand ones. Cinematic fantasy interior atmosphere with strong firelight contrasted against cool window light.
Style: painterly digital fantasy illustration, cinematic interior, palette of cream plaster, dark oak, deep forest green, ember-orange firelight, soft gold from the window. NOT 19th-century Dutch interior — modern fantasy genre concept art.
No text.`,
    postProcess: null,
  },
];

// ----------------- engine -----------------

const args = process.argv.slice(2);
const tierFilter = args.includes("--tier") ? Number(args[args.indexOf("--tier") + 1]) : null;
const onlyIds = args.includes("--only")
  ? args[args.indexOf("--only") + 1].split(",").map(s => s.trim()).filter(Boolean)
  : null;
const dryRun = args.includes("--dry-run");

const apiKey = process.env.OPENAI_API_KEY;

fs.mkdirSync(RAW, { recursive: true });
for (const sub of ["portraits", "tokens", "handouts", "sigils", "gm-only", "illustrations"]) {
  fs.mkdirSync(path.join(ROOT, "assets", sub), { recursive: true });
}

const queue = JOBS.filter((j) => {
  if (onlyIds && !onlyIds.includes(j.id)) return false;
  if (tierFilter !== null && j.tier !== tierFilter) return false;
  return true;
});

console.log(`Plan: ${queue.length} job(s)\n`);
for (const j of queue) {
  console.log(`  [tier ${j.tier}] ${j.id} → ${j.out}${j.skipGeneration ? "  (post-process from existing)" : ""}`);
}
console.log("");

if (dryRun) {
  console.log("--dry-run, exiting without calling API.");
  process.exit(0);
}

async function generateOne(job) {
  if (job.skipGeneration) {
    return await postProcess(job, path.join(ROOT, job.sourceFromExisting));
  }
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set; this job needs the OpenAI API. Source .env first.");
  }
  console.log(`→ ${job.id}: calling gpt-image-1.5 (${job.size}, ${job.quality})...`);
  const body = {
    model: "gpt-image-1.5",
    prompt: job.prompt,
    n: 1,
    size: job.size,
    quality: job.quality,
  };
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gpt-image-1.5 ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No b64_json in response: ${JSON.stringify(data).slice(0, 200)}`);
  const rawPath = path.join(RAW, `${job.id}.png`);
  fs.writeFileSync(rawPath, Buffer.from(b64, "base64"));
  console.log(`  raw saved: ${rawPath}`);
  return await postProcess(job, rawPath);
}

async function postProcess(job, srcPath) {
  const outPath = path.join(ROOT, job.out);
  if (job.postProcess === "round-token-512") {
    // 512x512 token: subject inscribed in inner circle (radius 244), with a 12px
    // beveled metal ring composited around it (radii 244–256). Subject is bias-
    // cropped toward the top of its source so the face lands centered in the frame.
    const ring = job.ring ?? { base: "#a07c2c", highlight: "#d8c378", shadow: "#3a2410" };
    execFileSync("magick", [
      srcPath,
      "-resize", "1024x1024^",
      "-gravity", "north",
      "-extent", "1024x1024",
      "-resize", "488x488",
      "-gravity", "center",
      "-background", "none",
      "-extent", "512x512",
      // Mask subject to inner circle (radius 244)
      "(", "+clone", "-threshold", "101%", "-fill", "white", "-draw", "circle 256,256 256,12", ")",
      "-channel", "A", "-compose", "CopyOpacity", "-composite",
      "+channel",
      // Outer dark shadow band (frame edge)
      "-fill", "none", "-stroke", ring.shadow, "-strokewidth", "14",
      "-draw", "circle 256,256 256,5",
      // Main metal ring
      "-fill", "none", "-stroke", ring.base, "-strokewidth", "10",
      "-draw", "circle 256,256 256,7",
      // Inner highlight (subtle bevel)
      "-fill", "none", "-stroke", ring.highlight, "-strokewidth", "1",
      "-draw", "circle 256,256 256,13",
      // Inner shadow line (where frame meets subject)
      "-fill", "none", "-stroke", ring.shadow, "-strokewidth", "1",
      "-draw", "circle 256,256 256,17",
      outPath,
    ], { stdio: "inherit" });
  } else if (job.postProcess) {
    throw new Error(`Unknown postProcess: ${job.postProcess}`);
  } else {
    fs.copyFileSync(srcPath, outPath);
  }
  console.log(`  ✓ ${outPath}`);
}

(async () => {
  for (const job of queue) {
    try {
      await generateOne(job);
    } catch (err) {
      console.error(`  ✗ ${job.id} failed: ${err.message}`);
    }
  }
  console.log("\nDone.");
  console.log("Next: rebuild packs and (optionally) wire the new files into actor img / tokens via the JSON sources.");
})();
