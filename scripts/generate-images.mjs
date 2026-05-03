#!/usr/bin/env node
// Blooming Rot 2 — image generator
// Calls OpenAI gpt-image-2 for portraits, tokens, handouts, and sigils.
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

// Append to interior map prompts to enforce sane door rendering.
const DOOR_RULES = "\n\nDoor rendering rules: Every door is shown CLOSED, exactly 1 grid square (5 ft) wide, drawn as a small solid rectangular panel set flush with the wall on both sides. The wall continues cleanly into the door panel; no gap on either side. A small hinge mark at one short edge indicates the hinge side. Doors are never shown open or ajar.";

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
    referenceImages: [
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
      "assets/portraits/party/gianni-ranger-.jpg",
      "assets/portraits/party/elle-halfling-monk.jpg",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art in the style of contemporary tabletop-RPG book covers (D&D, Pathfinder, Critical Role). Cinematic wide landscape, autumn late-afternoon golden hour.
**Six reference images supplied — the six-PC adventuring party. Identify each by features and match exactly:**
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic with gold piping, golden sword at hip, tattoo sleeve on left arm.
- **Selvara** (human Sorcerer) — hooded, dark red cloak, scar across face with one milky pale eye, blue gem pendant, holds a spear.
- **Kitty** (chthonic-tiefling Druid) — ashen-grey skin, small dark curving horns, pale luminescent eyes, dark hair in long braids, sigil-veining at temples, dark slender tail, woven-wood spear, lynx shield.
- **Gianni** (human Ranger) — dark hair in single thick braid, fierce dark-lined eyes, leather cuirass over yellow-cream tunic, quiver of arrows.
- **Elle** (halfling Monk) — halfling-sized, yellow/saffron robes with red sash, brown hair, agile build.
- **Cam** (halfling Rogue) — halfling-sized, long brown hair, large yellow eyes, brown leather travel clothes.
The six PCs are walking along a flat well-trodden road through autumn-yellowed grassland and shorn fields of grain stubble. They look road-weary, returning from battle. The two halflings (Elle, Cam) are visibly shorter than the others. Kitty's tail visible at her hip. Two riders in dark militia tabards with green sashes flank the party as a quiet escort — no fanfare, no banners.
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
  // ----- one-off PC portrait fixups -----
  {
    id: "kitty-tiefling-pass",
    tier: 5,
    out: "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
    size: "1024x1024",
    quality: "high",
    referenceImages: ["assets/portraits/party/kitty-druid-cthonic-tiefling.png"],
    prompt: `Modern high-fantasy character portrait illustration in tabletop-RPG concept-art style (D&D 5e / Pathfinder).
**The figure in the supplied reference image is KITTY, a CHTHONIC TIEFLING druid. The reference shows her current look (dark hair in braids, the lynx shield, the woven spear, the green-leather druid's tunic with leather belts). KEEP her facial structure, hair style and color (long dark braids), her gear (woven wood spear with the wrappings, the wooden lynx shield), and her green leather tunic. But push her appearance further toward CHTHONIC TIEFLING — she should not read as human.**
Chthonic tieflings are touched by the underworld / death realms. Render her with:
- Skin: ashen-grey undertone, paler than human, with a subtle cool cast — like the day after a frost.
- Small twin HORNS curving back from her temples (modest size, dark grey, slightly polished — not demonic spikes, more like deer-antler buds or short curling ram horns).
- Eyes: solid pale luminescent grey-white or faintly glowing pale-amber — no visible iris, no visible sclera distinction; an otherworldly gaze.
- Dark sigil-like veining tracing faintly under the skin at the temples, the side of the neck, and along the inner arm — like ink lines just below the surface.
- A long slender tail, dark grey at the base fading to charcoal at the tip, curling visibly from behind one hip; tipped with a small flattened spade.
- Faint hairline scar along one cheekbone — old, healed, visible only as a thin pale line.
Atmosphere: same forest backdrop with green canopy and dappled light. Watercolor / painterly digital fantasy portrait, vivid but tonally cohesive. NOT 19th-century oil painting.
She should still feel KITTY — capable, watchful, the druid we already know — just with her chthonic heritage now legible at first glance.
No text.`,
    postProcess: null,
  },

  // ----- set-piece scene illustrations (NPCs in frame where listed) -----
  {
    id: "p1-public-welcome",
    tier: 5,
    out: "assets/illustrations/p1-public-welcome.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/illustrations/the-little-palace-entrance.png",
      "assets/portraits/Caelith-Dunivar-Portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
      "assets/portraits/party/gianni-ranger-.jpg",
      "assets/portraits/party/elle-halfling-monk.jpg",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module (D&D 5e / Pathfinder / Tales of the Valiant book interior style).
**Eight reference images supplied. The first is the architectural reference; the rest are characters.**
- **(Architecture reference)** — the wide architectural photo shows THE LITTLE PALACE ENTRANCE. The scene must be set on these exact steps and portico: white-and-ivory limestone facade with ornate baroque gilt carving, broad red-carpeted limestone steps, gilded balustrades flanking the steps with stone urns and small cypress trees, twin gilded onion-domed turrets above, an arched gilt entrance pediment, twin tall lanterns flanking the doors, a red banner with a heraldic device hanging at left. Match this architecture exactly.
- **Caelith Dunivar** (NPC) — bearded dark-haired lean man in a dark scholar's coat with subtle gold detail and a small brass quill-pin.
- **Alicia** (PC, human Warlock) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, holds a golden sword (her Pact weapon), tattoo sleeve on her left arm, pink/lavender glove on right hand.
- **Selvara** (PC, human Sorcerer) — hooded woman in a dark red cloak, scar across her face with one milky pale eye, blue gem pendant, holds a spear.
- **Kitty** (PC, chthonic-tiefling Druid) — ashen-grey skinned tiefling, small dark horns curving back from her temples, pale luminescent eyes, dark hair in long braids, dark sigil-veining at the temples, slender dark tail visible at her hip, woven-wood spear, oval shield painted with a lynx face.
- **Gianni** (PC, human Ranger) — dark-haired woman, hair in a thick single braid, fierce dark-lined eyes, leather cuirass over a yellow-cream tunic, quiver of arrows visible at one shoulder.
- **Elle** (PC, halfling Monk) — halfling-sized woman in flowing yellow/saffron robes with a red sash, brown hair, agile build.
- **Cam** (PC, halfling Rogue) — halfling-sized woman, long brown hair, large yellow eyes, brown leather travel clothes.
Scene: the formal civic welcome of the adventuring party on the red-carpeted limestone steps of an ornate guesthouse called the Little Palace, late afternoon, autumn light.
At the top of the steps under a baroque columned portico stands CAELITH DUNIVAR with both hands raised palms-out in a ceremonial gesture, mid-speech.
Halfway down the steps, between Caelith above and the crowd below: ALL SIX PCs of the adventuring party in a loose semicircle, weary from the road, facing a Yeomanry COUNCIL PAGE who hands each of them a small wooden token. **The COUNCIL PAGE is a young human in dark Yeomanry livery (dark coat with green sash) holding a small flat polished wooden tray. On the tray: six round wooden disc tokens the size of a large coin, each pressed with a red wax seal showing the Yeomanry wheatsheaf. The tokens are CLEARLY WOODEN DISCS WITH WAX SEALS — not pastries, not biscuits, not food.** The page holds the tray with both hands at chest height; one PC at a time steps forward to take a token.\nEVERY ONE of the six PCs must be visibly present and distinct, and **none of the PCs is holding the tray** — it is in the council page's hands only:
1. ALICIA front-left, the red-haired warlock with the golden sword at her hip and the tattoo sleeve on her left arm.
2. SELVARA behind Alicia, the hooded sorcerer in the dark red cloak, scar and milky pale eye visible.
3. KITTY in the center back, the chthonic-tiefling druid — the two small dark horns curving back from her temples must be clearly visible above her braided dark hair, dark slender tail at her hip, lynx shield slung on her back.
4. GIANNI to Kitty's right, the dark-haired ranger with the single thick braid and the quiver of arrows.
5. ELLE in the front-center, the halfling monk in flowing yellow/saffron robes with red sash — visibly small (halfling height, head about waist-height of the humans).
6. CAM in the front-right, the halfling rogue with long brown hair, large yellow eyes, brown leather travel clothes — also visibly halfling-sized.
**IMPORTANT: render Alicia cleanly — no floating particles, no glowing sparkles, no swirling motes around her. Her sword is metal-gold, not magical-glowing. Treat her as a normal red-haired human warrior, no magical aura.**
At the bottom and sides of the steps: TWO SCRIBES at portable writing desks recording on parchment; a small civic crowd of clerks in black coats and journeymen in working dress; two militia guards in dark coats with green sashes flanking the doors. A faded gold-thread banner with a wheatsheaf hangs above the iron-banded oak doors. Lit lanterns at the column capitals.
Composition: classic ceremony framing — Caelith elevated, the party and witnesses below, a clear ceremonial hierarchy. Dramatic late-afternoon golden-hour light, long shadows.
Style: painterly digital fantasy illustration, vivid but tonally cohesive palette of warm gold, dark wood, deep red carpet, stone-grey, autumn rust. NOT 19th-century oil painting. No text or labels.`,
    postProcess: null,
  },
  {
    id: "p1-caelith-office",
    tier: 5,
    out: "assets/illustrations/p1-caelith-office.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/Caelith-Dunivar-Portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module (D&D 5e / Pathfinder book interior style).
**Three reference images supplied. Identify each by features and match exactly:**
- **Caelith Dunivar** (NPC) — bearded dark-haired lean man, dark scholar's coat with subtle gold detail, small brass quill-pin.
- **Alicia** (human Warlock) — red-haired woman, high ponytail, blue tunic with gold piping, golden Pact-of-the-Blade sword, tattoo sleeve on her left arm.
- **Selvara** (human Sorcerer) — hooded woman, dark red cloak, scar across her face with one milky pale eye, blue gem pendant.
Scene: late evening, Caelith Dunivar's wood-paneled second-floor study in a fantasy republic guesthouse. Intimate, conspiratorial atmosphere.
At a heavy dark-oak desk facing the viewer sits CAELITH DUNIVAR. A small framed eighth-century ribbon-and-medallion hangs above the desk. He has just placed a flat brass token on the desk between himself and the visitors — the token shows a quill above a closed gate (the Hand of the Duke insignia). His expression is grave but trusting.
Across from him, in two visitors' chairs: ALICIA leaning forward to look at the token, her golden sword sheathed at her hip; SELVARA beside her, hood pushed back slightly, watching Caelith carefully with her one good eye. Both lean in.
A small private hearth crackles low at left; a single tall candle on the desk; warm intimate firelight. Tall leaded window behind Caelith opens onto a dark inner courtyard at night. A locked correspondence cupboard at right, a small bookcase, a plain side table with a half-empty teapot.
Mood: secrecy, the moment trust is offered. Dramatic warm rim-light from candle and hearth, deep shadows in the corners.
Style: painterly digital fantasy illustration, palette of warm amber candlelight, dark walnut paneling, ember-orange firelight, deep blue night through the window. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p1-strong-room",
    tier: 5,
    out: "assets/illustrations/p1-strong-room.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/Caelith-Dunivar-Portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module (D&D 5e style).
**Four reference images supplied. Identify each by features and match exactly:**
- **Caelith Dunivar** (NPC) — bearded dark-haired lean man, dark scholar's coat, brass quill-pin.
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic with gold piping, golden sword.
- **Cam** (halfling Rogue) — halfling-sized woman, long brown hair, large yellow eyes, brown leather travel clothes.
- **Kitty** (chthonic-tiefling Druid) — ashen-grey skinned tiefling with small dark horns, pale luminescent eyes, dark hair in long braids, sigil-veining at the temples, dark slender tail.
Scene: deep cellar Strong Room of an old fantasy guesthouse, late at night. Vaulted stone ceiling, rough-cut grey stone walls, a slate floor. A single hanging iron lantern provides warm gold light; the room's corners drop into shadow.
Center of composition: a long oak workbench. On it, an open iron-bound chest; arranged on the bench beside it, the recovered evidence — a battered black leather spellbook, a sealed wallet of correspondence, a heavy brass signet ring with a crane-and-coins motif, a folded vellum letter of credit, a polished dark-wood ritual focus, a brass tube of charts, an unusual silver coin. The chest is unlocked.
At the bench: CAELITH DUNIVAR leaning over a piece of evidence, his face lit by the lantern. Across from him, CAM (halfling rogue) standing on a stool to reach the bench, examining the signet ring closely. Beside Cam, ALICIA scanning the letter of credit. KITTY stands at the open Strong Room door behind them, watching the corridor — her tail visible at her hip.
Behind them: the heavy iron-banded reinforced Strong Room door, partly open. Two stout shelves on one wall holding sealed crates.
Mood: secrecy, the weight of accounting, the chill of the cellar. Light is dramatic — strong warm lantern light against deep cool stone shadow.
Style: painterly digital fantasy illustration, palette of warm gold lantern, deep cool grey stone, dark oak. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-refectory",
    tier: 5,
    out: "assets/illustrations/p2-refectory.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/Caelith-Dunivar-Portrait.png",
      "assets/portraits/trina-alvere-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
      "assets/portraits/party/gianni-ranger-.jpg",
      "assets/portraits/party/elle-halfling-monk.jpg",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module (D&D 5e / Pathfinder).
**Eight reference images supplied. Identify each character by features and match exactly:**
- **Caelith Dunivar** (NPC) — bearded dark-haired lean man, dark scholar's coat, brass quill-pin.
- **Trina Alvere** (NPC) — brown-skinned woman in her thirties with long dark hair (often braided), faintly luminescent violet fey-markings on her arms, forest-dusk colored dress, silver leaf pendant.
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic with gold piping, golden sword, tattoo sleeve on left arm.
- **Selvara** (human Sorcerer) — hooded woman, dark red cloak, scar across face with one milky pale eye, blue gem pendant.
- **Kitty** (chthonic-tiefling Druid) — ashen-grey skin, small dark curving horns, pale luminescent eyes, dark hair in long braids, sigil-veining at the temples, dark slender tail.
- **Gianni** (human Ranger) — dark-haired, hair in a thick single braid, fierce dark-lined eyes, leather cuirass over yellow-cream tunic, quiver of arrows.
- **Elle** (halfling Monk) — halfling-sized, flowing yellow/saffron robes with red sash, brown hair, agile build.
- **Cam** (halfling Rogue) — halfling-sized, long brown hair, large yellow eyes, brown leather travel clothes.
Scene: gray autumn morning, the Refectory of a lavish fantasy guesthouse. A long polished dark-oak table runs the length of the room beneath three hanging brass chandeliers (lit, but low). Lacquered dark-wood paneling on the walls, deep red drapery at tall leaded windows, a stone hearth at the room's far end with a low fire.
Across the table, seven items of recovered evidence are laid out — each on its own square of cream linen, each linen square neatly numbered in dark ink. Visible items include a battered black spellbook, a small black-lacquered scroll tube, a clipped silver coin, a cloth pouch of grain, a torn ledger fragment, a strip of vellum.
**EXACTLY EIGHT distinct people in this scene — no extras, no background figures, no servants, no clerks. Two NPCs at the table and SIX PCs standing at the table's near end.**
**CRITICAL — RENDER KITTY AS A CHTHONIC TIEFLING, NOT A HUMAN:** The party member named KITTY is a CHTHONIC TIEFLING druid. She must be unmistakably non-human in this image. **She must have:** (a) two small dark grey horns curving back from her temples — these MUST be visible above her hair; (b) ashen-grey skin tone, distinctly cooler/paler than the other humans in the scene; (c) pale luminescent eyes (no normal pupils); (d) a dark slender tail visible at her hip, curling out from behind her body. She also has dark hair in long braids and carries a woven-wood spear and a wooden lynx-painted shield. **If Kitty looks like a normal dark-haired human in the rendered image, you have failed this prompt. Push her tiefling features hard.**
Render each character as listed:
At the far end of the table:
1. **CAELITH DUNIVAR** seated, leaning over the burned spell focus with one gloved finger touching it. He is the only bearded man in the scene.
2. **TRINA ALVERE** seated beside Caelith, a small porcelain cup of pale tea balanced on one knee. Her violet fey-markings should glow faintly on her arm in the chandelier light.
At the table's near end (the side closer to the viewer), standing in a loose group, all just entered:
3. **ALICIA** front-left of the party group — red ponytail, blue tunic with gold piping, golden sword at her hip, tattoo sleeve on left arm. **No sparkles, no glowing motes around her — render her cleanly.**
4. **SELVARA** beside Alicia. **Selvara is a HOODED SORCERER, NOT a leather-clad ranger. Do NOT render her as another Gianni.** She wears a heavy DARK RED CLOAK with the HOOD UP framing her face; she does NOT wear leather armor; she does NOT carry a quiver. Her face shows a long thin RED SCAR running across one eye, and that eye is MILKY PALE / blind-looking. A round BLUE GEM PENDANT hangs at her throat. She holds a plain wooden spear. **There is exactly ONE Selvara and exactly ONE Gianni — they look completely different. If two characters in your output look like Gianni (both with leather and quiver), you have failed this prompt — one of them is supposed to be the hooded scarred sorceress.**
5. **KITTY (CHTHONIC TIEFLING — see CRITICAL note above)** standing prominently at the front-center of the party group so her horns and tail are unmistakable. Ashen-grey skin, two small dark horns curving back from her temples, pale luminescent eyes, dark braided hair, dark slender tail at her hip, woven-wood spear in hand, lynx-painted wooden shield slung on her back.
6. **GIANNI** the human ranger (a WOMAN with dark hair in a single thick braid, fierce dark-lined eyes, leather cuirass over yellow-cream tunic, quiver of arrows over one shoulder). She is NOT male.
7. **ELLE** the halfling monk — **halfling height, head about waist-height of the humans** — flowing yellow/saffron robes with red sash, brown hair, agile build.
8. **CAM** the halfling rogue — also **halfling height, head about waist-height of the humans** — long brown hair, large yellow eyes, brown leather travel clothes, brown leather satchel.
Both halflings (Elle, Cam) MUST be visibly smaller than the four humans / one tiefling. NO additional unnamed figures of any kind anywhere in the room.
Mood: investigative gravity, the room set up like a battlefield. Cool morning light from windows balanced against warm chandelier light.
Style: painterly digital fantasy illustration, cinematic composition, palette of cream linen, dark walnut, brass, deep red, pale morning gray. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-records-alcove",
    tier: 5,
    out: "assets/illustrations/p2-records-alcove.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/trina-alvere-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Two reference images supplied. Identify each by features and match exactly:**
- **Trina Alvere** (NPC) — brown-skinned woman in her thirties, long dark hair, faintly luminescent violet fey-markings visible on her arm, forest-dusk colored dress, silver leaf pendant.
- **Alicia** (human Warlock PC, Trina's mentee) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, golden sword sheathed at her hip, tattoo sleeve on her left arm.
Scene: a small hidden records alcove behind a paneled door in the library of a fantasy republic guesthouse, mid-morning. Two walls lined floor-to-ceiling with leather-bound civic records — bound charter rolls, ledgers, treasury registers, commercial-marks volumes. A single brass oil lamp on a small reading table provides warm light; the rest of the alcove glows in soft gold.
At the reading table: TRINA ALVERE — one finger flat on a page of an open volume, looking up to comment. Across from her, ALICIA cross-referencing a different bound volume on a small writing slope. There is a quiet mentor-and-student warmth between them; Trina watches Alicia read with the patience of someone who has been waiting for this exact moment of focus. Alicia's golden sword leans against her chair.
Behind them, the paneled doorway visible — a hinge of normal wood with no obvious latch.
Atmosphere: warm, intimate, the calm of careful work. The alcove feels secret without feeling threatening.
Mood: scholarly, hopeful, on the verge of identifying a name.
Style: painterly digital fantasy illustration, cinematic close-quarters interior, palette of warm leather brown, brass lamp gold, ink black, parchment cream. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-cv-satellite",
    tier: 5,
    out: "assets/illustrations/p2-cv-satellite.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/hesren-vesh-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Four reference images supplied. Identify each by features and match exactly:**
- **Hesren Vesh** (NPC) — young man, early thirties, dark hair, lean clean-shaven features, wearing Cindren & Vhal firm livery: dark green wool coat with a small brass crane-and-coins pin at the breast.
- **Alicia** (human Warlock PC) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, golden sword at her hip, tattoo sleeve on her left arm. **Render her clean — no glowing motes, no sparkles, no magical particles. The sword is plain metal-gold, not magical.**
- **Selvara** (human Sorcerer PC) — hooded woman in a dark red cloak, scar across her face with one milky pale eye, blue gem pendant.
- **Cam** (halfling Rogue PC) — halfling-sized woman, long brown hair, large yellow eyes, brown leather travel clothes. Visibly halfling height (head about waist-height of the humans).
Scene: small front office of the Cindren & Vhal Bonded Factors satellite on Wick Lane, mid-morning. Small but expensive — dark walnut paneling, a polished desk, a small leaded window casting cool gray light, a brass-and-green-glass desk lamp lit on the desk corner, two heavy visitors' chairs (currently empty — the visitors are standing).
Standing behind the desk: HESREN VESH, courteous-stiff posture, his eyes just landed on something on the desk that he does not want to look at, mouth a careful neutral line.
Standing at the near side of the desk facing him: ALICIA holding the folded vellum letter of credit out flat for him to read, the marginal endorsement visible; SELVARA at Alicia's shoulder watching Hesren's face for tells, her hood pushed back; CAM at Alicia's other side, smaller than the humans, brown leather satchel at her hip, hands clasped behind her back as she watches Hesren too.
On the desk between them: the partly-unfolded letter of credit, a small brass scale, an inkwell. The firm's printed CHARTER ROLL OF MARKS broadsheet pinned to the wall behind Hesren, showing the crane-and-coins seal alongside other small marks.
Mood: polite tension, the moment a young clerk realizes the senior partners are doing something he is not authorized to know about. Three pairs of eyes on him, his on the document.
Style: painterly digital fantasy illustration, intimate interior, palette of dark walnut, deep green livery, brass, parchment cream, soft window light. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-gilst-room",
    tier: 5,
    out: "assets/illustrations/p2-gilst-room.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module — investigation set piece.
Scene: a modest two-room rented apartment above a stationer's shop on a quiet street, late morning. The dead bonds clerk who lived here was tidy, but the room has been searched.
A WRITING DESK at right with an inkpot, quill stand, and a single empty teacup on a saucer. Drawers half-open, papers slightly disturbed. A BOOKSHELF on the back wall — books pulled forward and pushed back not-quite-flush; the third volume of "Yeomanry Constitutional Commentaries" sits a finger's-width forward of the others. A faded RUG on the wood floor, rolled at one corner and not laid flat again. A small glass-fronted cabinet showing a plain pewter tin of throat lozenges. On one wall: a single small framed sketch slightly askew — and behind it, partly visible, the chain of a silver locket. A cold hearth at left with a curl of paper in the ashes.
Through a doorway at right: a glimpse of a small bedchamber — single bed neatly made, one chair, one small dresser.
A single window faces the street; mid-morning gray light slants in.
NO PEOPLE in the room. The disturbance does the work.
Mood: a tidy man's life left exactly as he last touched it, then ransacked by someone else. Quiet, sad, faintly threatening.
Style: painterly digital fantasy illustration, cinematic interior, palette of cool morning light, faded wood, dust-grey, ink-black. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-pollow-office",
    tier: 5,
    out: "assets/illustrations/p2-pollow-office.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/gianni-ranger-.jpg",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Two reference images supplied. Identify each by features and match exactly:**
- **Selvara** (human Sorcerer PC) — hooded woman in a dark red cloak, scar across her face with one milky pale eye, blue gem pendant at her throat, holds a plain wooden spear. **Selvara is HOODED, NOT in leather kit. Do NOT render her as another Gianni.**
- **Gianni** (human Ranger PC, female) — dark hair in a single thick braid, fierce dark-lined eyes, leather cuirass over yellow-cream tunic, quiver of arrows over one shoulder.
Scene: small contract physician's office on a quiet street, late afternoon. The room is cluttered, slightly squalid but professional — an examination cot at right with a thin mattress, shelves of jars and bottled tinctures, a workbench with a brass mortar and pestle, dried herbs hanging from a beam. A small coal stove glows red at one side.
At a tall standing desk in the center: RELN POLLOW — a soft anxious man in his mid-forties, balding, ink-stained fingers, unkempt sandy beard, wearing a stained apothecary's smock over a plain shirt. He holds a slip of paper as if just lifted from the desk; his eyes are on the visitors, not the paper, and he is sweating slightly. His posture suggests a man who has rehearsed an answer he may not be allowed to give.
Standing in front of the desk facing him, fully visible to the viewer:
1. **SELVARA** at left, hood pushed back enough that her scar and milky eye catch the warm coal-stove light. She is reading Pollow's face for tells; her wooden spear is grounded beside her.
2. **GIANNI** at right, arms folded across her leather cuirass, fierce eyes fixed on Pollow. The quiver of arrows visible over her shoulder. Her presence is quiet but unmistakably dangerous.
Mood: anxious, claustrophobic. The doctor is not the conspirator; he is the next witness who will be killed if not warned. Dramatic warm afternoon window-light streams in at a low angle, picking out the dust.
Style: painterly digital fantasy illustration, palette of warm coal-stove glow, dust-light gold, jar-glass green and amber, anxious mid-tones. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-tamsin-office",
    tier: 5,
    out: "assets/illustrations/p2-tamsin-office.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Two reference images supplied. Identify each by features and match exactly:**
- **Alicia** (human Warlock PC) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, golden sword at her hip, tattoo sleeve on her left arm. **No sparkles, no glowing motes around her — render her cleanly.**
- **Cam** (halfling Rogue PC) — halfling-sized woman, long brown hair, large yellow eyes, brown leather travel clothes, brown leather satchel. **Cam is halfling height — her head is about waist-height of the humans; she stands on tiptoe or on a low stool to read at the standing desk.**
Scene: the working business office of a missing senior grain factor, on a fantasy-medieval merchant street. Mid-morning, gray autumn light through tall mullioned windows. The room is paneled in worn pale oak; one wall holds a tall standing desk with a green leather-bound ledger book open on it; the opposite wall has built-in cabinets full of tied bundles of carbons and bound annual returns. A round table near the windows holds a brass weighing scale and a small handful of grain samples in cloth bags.
At the standing desk: DORIL VETH — a stout middle-aged man in his fifties, plain green wool coat, neat short gray hair, careful clean-shaven features, gold-rimmed reading lenses pushed up onto his forehead. He is turning a page in the ledger and gesturing at a row of entries; his expression is anxious, eager to be helpful, slightly conspiratorial — a clerk who has been waiting for someone to ask the right questions.
Standing across the desk from him, leaning forward to read the ledger:
1. **ALICIA** at the desk, one hand braced on the edge, leaning to read the entries Veth is showing her. Her golden sword sheathed at her hip.
2. **CAM** beside Alicia, standing on tiptoe (she is halfling-height) to see the ledger over the desk's edge, her sharp yellow eyes tracking the lines closely — she is the one most likely to spot the discrepancy.
The room feels paused — the missing principal's (Tamsin's) empty chair behind a separate small desk in the background, neatly pushed in, a folded shawl draped over its back.
Mood: a working business with its center missing. Concerned, focused, quietly hopeful.
Style: painterly digital fantasy illustration, cool morning interior, palette of pale oak, ledger green, brass, parchment cream. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-vellin-home",
    tier: 5,
    out: "assets/illustrations/p2-vellin-home.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/party/gianni-ranger-.jpg",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module — quiet emotional set piece.
**One reference image supplied:**
- **Gianni** (human Ranger PC, female) — dark hair in a single thick braid, fierce dark-lined eyes, leather cuirass over yellow-cream tunic, quiver of arrows over one shoulder. She is NOT male.
Scene: a small modest parlor of a schoolmaster's home in a fantasy-medieval residential lane, late afternoon. The room is cozy but austere — a small low hearth with a banked fire, two worn upholstered chairs and a low table, a tall bookshelf packed with school-readers and a handful of personal volumes. A small framed portrait sits on the mantel showing a middle-aged woman and a young woman together at some past celebration.
Seated in one chair at the hearth: VELLIN MORAVEN — a quiet man in his late fifties wearing a plain dark-gray scholar's coat, gray at the temples, drawn features, a small careful posture. He has aged a year in eleven days. In his hand he holds a folded slip of paper. His eyes are on the slip, not on Gianni.
In the chair opposite, fully visible to the viewer: **GIANNI** sitting forward with her elbows on her knees, hands loosely clasped between them. She has set her quiver on the floor beside her chair as a courtesy. Her usual fierceness is muted here; she is being still on purpose, holding the silence Vellin needs. Her dark eyes are on Vellin's face, not on the slip he is reading from.
A pot of tea on the low table between them, two cups — one for Vellin, one Gianni has accepted but not yet touched.
Late autumn afternoon golden-hour light slants in through a leaded window at left, picking out the picture frame on the mantel.
Mood: heartbreak quietly carried. A grieving man asking for help in the only way he can, and a ranger who knows how to listen.
Style: painterly digital fantasy illustration, intimate interior, palette of warm hearth glow, late-afternoon gold through leaded glass, faded wallpaper, soft sorrowful tones. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p2-three-approaches",
    tier: 5,
    out: "assets/illustrations/p2-three-approaches.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/Caelith-Dunivar-Portrait.png",
      "assets/portraits/trina-alvere-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
      "assets/portraits/party/gianni-ranger-.jpg",
      "assets/portraits/party/elle-halfling-monk.jpg",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module — decision set piece.
**Eight reference images supplied. Identify each character by features and match exactly:**
- **Caelith Dunivar** (NPC) — bearded dark-haired lean man, dark scholar's coat, brass quill-pin.
- **Trina Alvere** (NPC) — brown-skinned woman in her thirties, long dark hair, faintly luminescent violet fey-markings on her arms, forest-dusk dress, silver leaf pendant.
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic, golden sword.
- **Selvara** (human Sorcerer) — hooded, dark red cloak, scar, milky pale eye, blue gem pendant.
- **Kitty** (chthonic-tiefling Druid) — ashen-grey skin, small dark horns, pale luminescent eyes, dark braids, sigil-veining at temples, dark slender tail.
- **Gianni** (human Ranger) — dark-haired with single thick braid, fierce eyes, leather cuirass, quiver.
- **Elle** (halfling Monk) — halfling-sized, yellow/saffron robes with red sash, brown hair.
- **Cam** (halfling Rogue) — halfling-sized, long brown hair, yellow eyes, brown leather.
Scene: an old upper-floor council chamber repurposed as a private meeting room, in a lavish fantasy republic guesthouse. The room has a large round oak table with NINE carved chairs ringed around it (one for each founding district). A tall stone hearth at one wall holds a fresh fire; the chamber is otherwise dim, lit by a heavy wrought-iron candelabra on the table itself.
On the table: THREE small leather folios, each closed with a brass clasp, arranged in a row. Beside them, a folded map of the eastern coast pinned with a small brass tack; a single sealed letter of introduction; a small purse of trade slugs.
Seated at the table: CAELITH DUNIVAR leaning forward with one finger resting deliberately on the central folio. Beside him TRINA ALVERE, hands folded in her lap, watching the visitors.
Across the table from them, the six-PC adventuring party (Alicia, Selvara, Kitty, Gianni, Elle, Cam) seated facing the choice. The two halflings (Elle, Cam) are on stacked cushions to reach the table. Kitty's tail visible at her hip. The empty chairs between the seated PCs carry visible weight.
Mood: pivot moment, gravity of decision. Authority, cover, or distance — and none of them is free.
Lighting: dramatic candle and hearth glow, deep shadow at the chamber's edges, the round table the only fully-lit object.
Style: painterly digital fantasy illustration, cinematic decision-scene composition, palette of candle gold, dark oak, ember-orange, deep stone shadow. NOT 19th-century oil painting. No text.`,
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

  // ============== TIER 6 — Phase 3 NPC portraits ==============
  {
    id: "p3-veska-maelan-portrait",
    tier: 6,
    out: "assets/portraits/veska-maelan-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of VESKA MAELAN, a Hardby trade-clearing notary in her mid-fifties.
Compact build, dark eyes, gray hair worn short under a soft brown cap. Plain dark wool dress, no jewelry except a small silver scale-and-scroll badge at the throat (her notarial seal of office). Reading lenses on a black silk cord around her neck. Quiet, watchful, slow-moving authority.
Three-quarter view from waist up. She is at her desk, hands resting on a small ledger; lamplight from one side. Her gaze is direct, considering.
Hardby maritime city background suggested: a leaded window with harbor masts beyond, slightly out of focus.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-anver-resh-portrait",
    tier: 6,
    out: "assets/portraits/anver-resh-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of ANVER RESH (also called "Tarsh"), a Hardby freelance broker in his fifties.
Thin, balding with a fringe of dark hair worn long. Long pale face. Yellow stains on the second and third fingers of his right hand from cheap pipe-leaf. A small clay pipe held loosely in that hand. Smoker's rasp implied in the set of the throat. Plain dark wool, a heavy wool coat over an unornamented shirt; no jewelry.
Three-quarter view from waist up. He is in a low-ceilinged tavern booth, lit by a single hanging oil lamp; the back wall behind him is dark wood and old stains. He looks directly at the viewer, faintly amused, faintly bored. He has been read at by far stranger people.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-castrian-vell-portrait",
    tier: 6,
    out: "assets/portraits/castrian-vell-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of CASTRIAN VELL, a Hardby poet and minor playwright in his late thirties.
Dark curls graying at the temples. Clean unringed hands. Wears soft dark fabrics — a deep plum waistcoat over a cream shirt, no cravat. A small emerald-and-silver pin at the collar (his only ornament). Speaks with composed sentences he has clearly written in his head before speaking; the smile he wears is half genuine, half a careful imitation of itself.
Three-quarter view from waist up. He is in his sitting room, holding a wineglass; a small shelf of his published volumes visible behind him on a wall. Warm hearth light from one side, cool window light from the other.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-solen-mereth-portrait",
    tier: 6,
    out: "assets/portraits/solen-mereth-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of SOLEN MERETH, a senior clerk at Cindren & Vhal Hardby in his late forties.
Tall, lean, balding with a fringe of dark hair, careful clean-shaven features. Wears the firm's senior-clerk livery: a dark green wool coat with a small brass crane-and-coins pin at the breast and a small additional pin denoting head-of-office. Reading lenses on a black silk cord. Speaks (when he must) in short measured sentences.
Three-quarter view from waist up. He stands at his tall standing desk in the bond-loading office; a wall of bond-loading files behind him; an open ledger and an inkwell on the desk in front. Cool morning window light. His expression is professional, careful, faintly worried — a man whose competent management of a difficult brief has begun, in the last week, to feel like a risk.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-ailen-moraven-portrait",
    tier: 6,
    out: "assets/portraits/ailen-moraven-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of AILEN MORAVEN, a sculptor's apprentice in her mid-twenties (Tamsin Moraven's daughter).
Tall, dark hair worn loose to the shoulders, pale gray eyes (her father's). Strong forearms from clay and stone work. Wears a leather work-apron over a plain shirt; sleeves rolled. A small silver locket at the throat (gift from her mother on her sixteenth birthday). Hands clay-dusted, fingernails short.
Three-quarter view from waist up. She is in her workshop corner: stone dust hangs in slanted afternoon light; a half-shaped bust visible on a turntable behind her; a chisel held in her right hand. Her expression is composed but watchful — she has guessed something is wrong at home and has not yet been told what.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-zoria-weis-portrait",
    tier: 6,
    out: "assets/portraits/zoria-weis-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of ZORIA WEIS, a Gynarchy under-clerk in her late thirties.
Plain, careful, neither tall nor short. Brown hair pinned up under a small white cap. Wears the Gynarchy under-clerk's grey-and-cream half-livery — a structured grey wool dress with cream collar and cuffs, a small civic pin at the breast. Speaks in dry careful sentences. Smiles rarely.
Three-quarter view from waist up. She stands at her desk in the Office of Mercantile Records; behind her, tall pigeonhole shelves of bound civic ledgers. A single lamp lit at her elbow. She is reading a page in front of her, glances up at the viewer with measured neutrality.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-vella-tannin-portrait",
    tier: 6,
    out: "assets/portraits/vella-tannin-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of VELLA TANNIN, a junior bond-officer at Cindren & Vhal Hardby in her mid-thirties.
Plain, careful features; auburn hair pinned back; freckles. Wears the firm's junior livery (a darker green wool coat than the senior clerks, simpler cut, no head-of-office pin — only the standard crane-and-coins pin). A small brass watch on a fob chain. Hands ink-stained from a day's bond-clearing work.
Three-quarter view from waist up. She is in a quiet bread-shop two streets from the firm at her usual lunch hour; a small plate and a teacup in front of her, an open book she is half-reading. Warm interior light. Her expression carries a quiet long-held grief — eight years of it. She looks like someone who has been waiting for the right person to ask.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-mira-cindren-portrait",
    tier: 6,
    out: "assets/portraits/mira-cindren-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MIRA CINDREN, junior partner at Cindren & Vhal Hardby in her mid-forties (Veshen Cindren's cousin).
Tall, polished, dark hair pinned in a careful merchant's coil. Wears the firm's senior livery cut for partner rank — a long dark green wool coat with a heavier brass crane-and-coins clasp at the breast and a partner's white silk neckcloth. Walks straight, speaks composedly, eyes that do not give anything away that has not been authorized.
Three-quarter view from waist up. She is in her office at the firm, hands clasped before her over a small leather portfolio. Polished oak walls behind. Cool diffuse light from a high leaded window. Her expression: courteous, prepared, plausibly innocent.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-reyna-worth-portrait",
    tier: 6,
    out: "assets/portraits/reyna-worth-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of REYNA WORTH, a Cindren-aligned overseer and contracted killer in her early forties.
Lean, hard-faced, dark close-cropped hair, a thin pale scar across the left cheek. Plain practical clothes — a brown leather jerkin over a dark linen shirt, fingerless leather gloves. A short blade at her belt. Eyes that do not look away.
Three-quarter view from waist up. She stands in the half-light of a warehouse, dust in the air; behind her a stack of bonded crates. Her expression is professional, unrushed, slightly bored — a person whose job has bored her for years and who is good at it nonetheless.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p3-tamsin-moraven-portrait",
    tier: 6,
    out: "assets/portraits/tamsin-moraven-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of TAMSIN MORAVEN, a senior Yeomanry grain factor in her mid-fifties.
Tall, capable, dark hair gone iron-gray at the temples (her daughter's hair before the gray). Wears a Yeomanry merchant's working dress — a dark green wool overdress over a plain shirt, a leather belt with a pouch and quill case, a brass measuring key on a cord at her hip. A small silver pin at the collar marking twelve years' grain-factor standing.
Three-quarter view from waist up. She stands at her tall standing desk in her counting house on Tannerway, a green-leather ledger open in front of her, a brass weighing scale and a handful of grain samples in cloth bags on the desk. Cool morning light through tall mullioned windows. Her expression: focused, capable, the careful watchfulness of a woman who has begun to suspect she is in danger.
${ART_STYLE}`,
    postProcess: null,
  },

  // ============== TIER 7 — Phase 1/2 polish portraits ==============
  {
    id: "p2-doril-veth-portrait",
    tier: 7,
    out: "assets/portraits/doril-veth-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of DORIL VETH, a Yeomanry grain-trade chief clerk in his fifties.
Stout middle-aged man, plain green wool coat, neat short gray hair, careful clean-shaven features, gold-rimmed reading lenses pushed up onto his forehead.
Three-quarter view from waist up. He stands at his tall standing desk, a green leather-bound ledger open before him, gesturing at a row of entries. Filing cabinets behind him. Cool morning light. His expression: anxious, eager to be helpful, slightly conspiratorial — a clerk who has been waiting for someone to ask the right questions.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p2-reln-pollow-portrait",
    tier: 7,
    out: "assets/portraits/reln-pollow-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of RELN POLLOW, a Loftwick contract physician in his mid-forties.
Soft, anxious man. Balding with sandy unkempt hair at the sides; an unkempt sandy beard. Ink-stained fingers. Wears a stained apothecary's smock over a plain shirt.
Three-quarter view from waist up. He stands at his cluttered standing desk; shelves of jars and bottled tinctures behind him, a small coal stove glowing red at one side, dried herbs hanging from a beam overhead. He holds a slip of paper as if just lifted from the desk. Late-afternoon window light. His expression: anxious, sweating slightly, the look of a man who has rehearsed an answer he may not be allowed to give.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p2-vellin-moraven-portrait",
    tier: 7,
    out: "assets/portraits/vellin-moraven-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of VELLIN MORAVEN, a Yeomanry schoolmaster in his late fifties (Tamsin Moraven's husband).
Quiet man, gray at the temples, drawn features (he has aged a year in eleven days). Wears a plain dark-gray scholar's coat over a darker shirt. No jewelry. Hands gentle, fingers slightly ink-stained from years of marking school papers.
Three-quarter view from waist up. He is seated in his small parlor by a low banked fire; behind him a small framed portrait on the mantel showing a woman and a young woman together. Warm hearth glow from one side. He holds a folded slip of paper in his hand and looks down at it, not at the viewer. His expression: heartbreak quietly carried.
${ART_STYLE}`,
    postProcess: null,
  },

  // ============== TIER 8 — Phase 3 set-piece scenes ==============
  {
    id: "p3-hardby-approach",
    tier: 8,
    out: "assets/illustrations/p3-hardby-approach.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
      "assets/portraits/party/gianni-ranger-.jpg",
      "assets/portraits/party/elle-halfling-monk.jpg",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module (D&D 5e / Pathfinder / Tales of the Valiant book interior style).
**Six reference images supplied — the six-PC adventuring party. Identify each by features and match exactly:**
- **Alicia** — red-haired, high ponytail, blue tunic, golden sword, tattoo sleeve on left arm. **No sparkles, no glowing motes around her — render her cleanly.**
- **Selvara** — hooded woman in dark red cloak, scar across face with milky pale eye, blue gem pendant.
- **Kitty** — chthonic-tiefling druid: ashen-grey skin, small dark horns, pale luminescent eyes, dark braided hair, dark slender tail, lynx-painted shield, woven-wood spear. **The horns and tail must be visible.**
- **Gianni** — dark hair in single thick braid, fierce dark-lined eyes, leather cuirass, quiver of arrows. (She is female.)
- **Elle** — halfling monk, **halfling height (head about waist of the humans)**, yellow/saffron robes with red sash.
- **Cam** — halfling rogue, **halfling height**, long brown hair, large yellow eyes, brown leather travel clothes.
Scene: the six-PC adventuring party arrives at the city of HARDBY by sea or by road (GM's choice based on travel approach). Mid-morning, gray autumn light over the harbor. The city is a coastal Free City — tightly packed two- and three-story stone-and-timber buildings climbing inland from a busy commercial harbor; masts of moored galleys crowd the foreground; the smell of coal smoke, tar, and low tide implied by the heavy gray air. A weathered city wall runs along the harbor's inland edge with a wide stone gate (the South Gate or the harbor gate, depending on approach) where harbor men, fishwives, and dock-warden shifts pass through.
The party stands together on the cobblestones just inside or just outside the gate, looking at the city. They are travel-worn. Hardby is louder than Loftwick was; the camera catches them noticing.
Composition: classic "we have arrived in the next city" framing — party slightly small in the foreground against the bulk of the city in the middle distance, harbor masts and tile rooftops climbing up the slope behind.
Style: painterly digital fantasy illustration, palette of cool gray morning light, weathered stone, dark wood, dull copper rooftops, a touch of harbor blue. NOT 19th-century oil painting. No text or labels.`,
    postProcess: null,
  },
  {
    id: "p3-coopered-wreck",
    tier: 8,
    out: "assets/illustrations/p3-coopered-wreck.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/anver-resh-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/Cam-Halfling-Rogue.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Four reference images supplied:**
- **Anver "Tarsh" Resh** (NPC) — thin, fifties, balding with dark hair fringe worn long, long pale face, yellow stains on his right-hand fingers from pipe smoke, plain dark wool, no jewelry.
- **Alicia** (PC) — red-haired ponytail, blue tunic, golden sword. No sparkles.
- **Selvara** (PC) — hooded, dark red cloak, scar, milky pale eye, blue gem pendant.
- **Cam** (PC) — halfling-sized, long brown hair, large yellow eyes, brown leather. **Halfling height — visibly smaller than the humans.**
Scene: a low-ceilinged sailors' tavern called THE COOPERED WRECK in Hardby's harbor district. Coal-smoke-dark room with a long bar down one side and three back booths on the opposite wall. The leftmost back booth has a single hanging oil lamp; the rest of the room is in shifting shadow. A few stevedores at the bar in the background, a one-eyed retired bosun (the proprietor) wiping a glass behind the bar.
TARSH sits in his usual back booth, leaning back, a small clay pipe held loosely in his stained hand, a cup of small beer in front of him. Across from him in the booth: ALICIA seated, holding a folded vellum document open on the table for him to read. Standing at the booth's open side, watching: SELVARA (hood pushed back, watching Tarsh's face for tells) and CAM (smaller, hands clasped behind her back, sharp yellow eyes also on Tarsh).
Mood: polite tension, the moment a broker realizes he has been brought a paper he would have preferred not to be holding. Smoke-dim atmosphere, warm lamp glow contrasted against deep shadow.
Style: painterly digital fantasy illustration, palette of warm lamp gold, dark wood, smoke gray, leather brown. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p3-cv-hardby-branch",
    tier: 8,
    out: "assets/illustrations/p3-cv-hardby-branch.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/solen-mereth-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/gianni-ranger-.jpg",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Three reference images supplied:**
- **Solen Mereth** (NPC) — late forties, tall, lean, balding, careful clean-shaven, dark green firm livery with brass crane-and-coins pin and a small head-of-office pin, reading lenses on black silk cord.
- **Alicia** (PC) — red ponytail, blue tunic, golden sword. No sparkles.
- **Gianni** (PC, female) — dark hair single braid, fierce dark-lined eyes, leather cuirass, quiver.
Scene: the BOND-LOADING OFFICE at Cindren & Vhal Hardby — a small private office at the back of the counter-room. Walnut paneling, a tall standing desk (Solen's), a wall of bond-loading files in pigeonhole shelves behind the desk, a tall locked cabinet against the back wall, a small leaded window high on one wall casting cool morning light.
SOLEN MERETH stands behind his standing desk, both hands flat on its surface, looking at the visitors with composed careful neutrality. His reading lenses sit on the desk. An open ledger and an inkwell to one side.
Across the desk from him: ALICIA standing slightly forward, asking a measured question; GIANNI behind her at the doorway, arms folded over her leather cuirass, watching Solen for any tell.
Mood: a polite professional confrontation. Cool window light from one side, warm desk-lamp light on Solen's hands. Solen knows exactly why they are here; he has not yet decided whether to lie.
Style: painterly digital fantasy illustration, intimate office interior, palette of dark walnut, deep green livery, brass, parchment cream. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p3-veska-reveal",
    tier: 8,
    out: "assets/illustrations/p3-veska-reveal.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/veska-maelan-portrait.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/alicia-warlock-blade.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module — investigative set piece.
**Three reference images supplied:**
- **Veska Maelan** (NPC) — mid-fifties, compact, dark-eyed, gray hair worn short under a soft brown cap; plain dark wool dress; small silver scale-and-scroll badge at the throat; reading lenses on a black silk cord.
- **Selvara** (PC) — hooded, dark red cloak, scar, milky pale eye, blue gem pendant.
- **Alicia** (PC) — red ponytail, blue tunic, golden sword. No sparkles.
Scene: the small ground-floor notary office at WHALEMARKET QUAY in Hardby, late evening. A single brass oil lamp on the desk provides warm gold light; the rest of the office is in shadow. A tall standing-cabinet of ledgers and copybooks against one wall, two visitor chairs, a brass-and-green-glass desk lamp shaded down. A leaded window in the back wall shows full dark outside with a single distant ship's lantern reflected on the harbor.
VESKA sits at the desk, reading lenses on her nose, leaning over the recovered evidence laid out in front of her — a folded vellum letter of credit, a clipped silver coin held to the lamp in her left hand, a small black-lacquered scroll tube, a torn ledger fragment, a strip of vellum bearing four words. Her right index finger rests on a chop she has just identified.
Standing across from her, leaning forward to listen: SELVARA (hood pushed back, focused, tracking every word); ALICIA (slightly behind Selvara, arms folded, listening hard).
Mood: the quiet investigative climax — three professionals in a lamp-lit office at night, naming people for the first time. Warm intimate lamp glow against deep shadow. Tea things on a small side table.
Style: painterly digital fantasy illustration, intimate interior, palette of warm lamp gold, deep cool shadow, leather brown, parchment cream. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p3-burglary",
    tier: 8,
    out: "assets/illustrations/p3-burglary.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/party/Cam-Halfling-Rogue.png",
      "assets/portraits/party/elle-halfling-monk.jpg",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module — heist set piece.
**Three reference images supplied:**
- **Cam** (PC, halfling rogue) — halfling height, long brown hair, large yellow eyes, brown leather travel clothes, brown leather satchel.
- **Elle** (PC, halfling monk) — halfling height, yellow/saffron robes with red sash, brown hair, agile build.
- **Selvara** (PC) — hooded, dark red cloak, scar, milky pale eye, blue gem pendant. Holds a small bullseye lantern shielded so its light spills only forward.
Scene: the lower vault of CINDREN & VHAL HARDBY at the third bell after midnight. Stone-walled, vaulted ceiling, a single iron-banded door open in the back. A side cabinet open in the foreground showing a row of three slim leather-bound ledger volumes (the second set of books). The vault's small lantern is unlit; the only light is from Selvara's shielded bullseye lantern.
CAM crouches at the open side cabinet, lifting one of the three volumes carefully; her satchel open on the stone floor beside her. ELLE stands at the open vault door, glancing out into the corridor as a lookout, perfectly balanced on the balls of her feet. SELVARA stands halfway between, holding the bullseye lantern angled so its light spills onto the cabinet for Cam without spilling backward.
Mood: tense focused silence. The kind of moment that requires perfect quiet from everyone involved.
Composition: dramatic chiaroscuro — single light source, deep cool stone shadow, the recovered evidence catching the lamplight as the climax.
Style: painterly digital fantasy illustration, heist-scene chiaroscuro, palette of warm lantern gold against deep cool stone shadow. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p3-tamsin-recovery",
    tier: 8,
    out: "assets/illustrations/p3-tamsin-recovery.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/tamsin-moraven-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/gianni-ranger-.jpg",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module — rescue set piece.
**Four reference images supplied:**
- **Tamsin Moraven** (NPC, rescued) — mid-fifties, tall, dark hair iron-gray at the temples, dark green Yeomanry merchant's overdress now travel-worn from twelve days' captivity. Tired, underfed, but standing on her own feet. The watchful careful capable woman the party has heard about.
- **Alicia** (PC) — red ponytail, blue tunic, golden sword. No sparkles.
- **Gianni** (PC, female) — dark hair single braid, leather cuirass, quiver.
- **Kitty** (PC) — chthonic-tiefling druid: **ashen-grey skin, small dark horns, dark slender tail, lynx shield, woven spear**. The horns and tail must be visible.
Scene: the small clerk's-office room in a harbor warehouse on Black Cog Lane at late night. A barred window in the back wall, a wooden door open behind the party, a thin straw mattress on the floor, a water jug by the door. One of the party's own lanterns has been brought in and set on the mattress. A small open chest of Tamsin's belongings on the floor (the captors apparently brought her a few things; the chest is the size of a hatbox).
TAMSIN stands in the center of the room, just having stood up from the mattress, one hand still pressed to the wall behind her, her other hand reaching out to take ALICIA's offered hand. Her eyes are on Alicia's face — the first kindness in twelve days. ALICIA half-kneels in front of her, her free hand gesturing back toward the open door (the way out). KITTY stands just inside the door, one ashen-grey hand on the door frame, her tail visible behind her, watching the corridor for Worth's return. GIANNI stands further out in the corridor visible through the door, an arrow nocked but not drawn, watching the warehouse's main floor.
Mood: a rescue moment, the quiet seconds before they must move quickly. Warm relief in the foreground (Tamsin and Alicia), watchful tension in the background (Kitty and Gianni at the threshold).
Style: painterly digital fantasy illustration, dramatic warm lantern glow against cool industrial-gray warehouse stone, palette of warm gold + cool blue-gray. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p3-gynarchy-registry",
    tier: 8,
    out: "assets/illustrations/p3-gynarchy-registry.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/zoria-weis-portrait.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/alicia-warlock-blade.png",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Three reference images supplied:**
- **Zoria Weis** (NPC) — late thirties, plain careful features, brown hair pinned up under a small white cap, Gynarchy under-clerk's grey-and-cream half-livery.
- **Selvara** (PC) — hooded, dark red cloak, scar, milky pale eye, blue gem pendant.
- **Alicia** (PC) — red ponytail, blue tunic, golden sword. No sparkles.
Scene: a small reading room at the back of the GYNARCHY OFFICE OF MERCANTILE RECORDS in Hardby's Old Quarter, late morning. Walnut-paneled walls. A single tall reading table at the room's center. On the table: a large bound volume open to a two-page spread of harbor commission appointment entries (rows of inked names, dates, dispositions). Two oil lamps on the table provide warm light; the rest of the room is in cool diffuse light from a high leaded window.
ZORIA stands at the head of the table, one finger pressed to a row of entries (the THREE old-house seats marked vacant). She is reading aloud in a measured voice, gesturing with her free hand at the structure of the page.
ALICIA and SELVARA stand on the opposite side of the table, leaning forward to read along; ALICIA's expression is dawning understanding; SELVARA's is hardening into focus.
Mood: the moment a slogan becomes operational law. Tight, scholarly, decisive.
Style: painterly digital fantasy illustration, intimate civic interior, palette of warm lamp gold, walnut brown, parchment cream, cool stone. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },
  {
    id: "p3-castrian-salon",
    tier: 8,
    out: "assets/illustrations/p3-castrian-salon.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/castrian-vell-portrait.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/selvara-human-sorcerer.jpg",
      "assets/portraits/party/elle-halfling-monk.jpg",
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
**Four reference images supplied:**
- **Castrian Vell** (NPC) — late thirties poet, dark curls graying at temples, plum waistcoat over cream shirt, emerald-and-silver pin at the collar, holding a wineglass.
- **Alicia** (PC) — red ponytail, blue tunic, golden sword **sheathed behind a sash for the salon — she is in semi-formal mode**. No sparkles.
- **Selvara** (PC) — hood DOWN for once, scar visible, blue gem pendant; she has dressed for a salon evening (dark wine-colored dress over her usual layers).
- **Elle** (PC, halfling monk) — halfling height, **dressed in a clean saffron salon robe** (more formal than her travel robes), brown hair brushed.
Scene: the warm sitting room of CASTRIAN VELL'S TOWNHOUSE on a salon evening. A modest hearth glows on one wall; a small narrow shelf of his published volumes visible on another. Six to eight figures arranged in loose conversational groups: a middle-aged woman in dyer's apron-marks even in her formal dress (the Salters' Quarter dyer), a thin retired ship's captain with a faded blue coat, a Gynarchy under-clerk in her after-hours civilian dress, a sculptor in a paint-marked cravat. Wine and small dishes on a sideboard.
CASTRIAN stands at the center of one conversational group, turned to introduce the party; his hand half-raised in a poet's gesture. ALICIA stands beside him, smiling a careful merchant's smile (she is in cover); SELVARA hangs back at the edge of the group near a bookshelf (she does not enjoy crowds); ELLE has already moved on to the dyer, talking energetically and gesturing at a length of wool fabric.
Mood: warm, social, faintly conspiratorial — a working evening dressed as pleasure. Soft hearth light, candle sconces on the walls.
Style: painterly digital fantasy illustration, intimate sitting-room interior, palette of warm hearth amber, dark wood, deep wine-red and forest-green dress fabrics, candle gold. NOT 19th-century oil painting. No text.`,
    postProcess: null,
  },

  // ============== TIER 9 — Phase 3 handouts ==============
  {
    id: "p3-tamsin-letter",
    tier: 9,
    out: "assets/handouts/tamsin-last-letter.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Aged parchment / vellum prop, photographed flat under soft warm light.
Hand-written in iron-gall ink with quill, in a careful Yeomanry merchant's hand — neat but tired, the writing of a woman composing it under stress. Subtle wear, fold creases, slight foxing. Edges slightly torn. The paper feels like it has been folded small and carried hidden against a body for several days before delivery.
The text, exactly as shown, with realistic line breaks for a small folded-letter sheet:

Vellin and Ailen — if you read this, I am not coming home.

I want you to know that I knew what I was doing when I asked the questions, and I would ask them again. The grain that was paid for never existed. The men who paid for it knew it never existed and bought it anyway because the paperwork is a kind of weapon, and they wanted the weapon. I followed the weapon back through three counting houses to the firm, and the firm to a name in Rel Astra, and the name to a man who has been dead, on paper, for nine years. I do not know who the man is. I know only that he is the one I was asking about when they came for me.

Vellin — there is a small lacquered box in the bottom of my wardrobe under the spare linen. Inside it, my filings on the South Province grain. Take them to Caelith Dunivar in Loftwick. He will know what to do with them. He may already know.

Ailen — your work has been the great quiet joy of my life. I have not told you this often enough.

I love you both very much. I am sorry to have left you with this.

— T.

Photographed straight-on, no perspective, no decorative borders. Plain dark surface around the parchment.`,
    postProcess: null,
  },

  // ============== TIER 10 — tokens for Phase 3 NPCs ==============
  {
    id: "p3-veska-token",
    tier: 10,
    out: "assets/tokens/veska-maelan-token.png",
    sourceFromExisting: "assets/portraits/veska-maelan-portrait.png",
    skipGeneration: true,
    postProcess: "round-token-512",
    dependsOn: "p3-veska-maelan-portrait",
    // Cool silver — civic, neutral disposition, professional gravity.
    ring: { base: "#7a7e88", highlight: "#c4c8d0", shadow: "#2a2c30" },
  },
  {
    id: "p3-anver-token",
    tier: 10,
    out: "assets/tokens/anver-resh-token.png",
    sourceFromExisting: "assets/portraits/anver-resh-portrait.png",
    skipGeneration: true,
    postProcess: "round-token-512",
    dependsOn: "p3-anver-resh-portrait",
    // Dull bronze-brown — broker, ambivalent disposition.
    ring: { base: "#7a5a36", highlight: "#b89c70", shadow: "#2a1a0c" },
  },

  // ============== TIER 11 — module banner ==============
  {
    id: "module-banner",
    tier: 11,
    out: "assets/banners/blooming-rot-2-banner.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module banner image.
Wide cinematic landscape banner. Three layered visual zones from left to right, like a triptych without dividers:
LEFT — the limestone walls of LOFTWICK at dawn, civic spires against a cool gray-pink sky, the ornate baroque guesthouse called the Little Palace just visible behind the wall.
CENTER — a long oak table with seven small evidence items laid out on numbered linen squares (a battered black spellbook, a black-lacquered scroll tube, a clipped silver coin, a torn ledger fragment, a strip of vellum reading HARBOR BEFORE THRONE, a small cloth pouch of grain, a burned dark-wood ritual focus). Brass chandelier light spilling down from above. The table edge cuts diagonally across the composition.
RIGHT — the harbor of HARDBY at sunset, dock masts crowded against an orange-red sky, a single galley sail unfurled, the silhouette of a fortified coastal town climbing inland.
The composition flows left-to-right: dawn → noon investigation → sunset departure. The implied arc of the adventure.
At the bottom edge of the composition (subtle, no text): a row of three small heraldic devices — the Yeomanry wheatsheaf, the Cindren & Vhal crane-and-three-coins, and the tower-and-three-waves countermark. Embossed in the parchment-textured lower border.
Style: painterly digital fantasy illustration, dramatic atmospheric perspective, vivid but tonally cohesive palette of dawn pink + lamp gold + sunset orange unified by the warm wood of the central table. Banner-style cinematic composition. NOT 19th-century oil painting.
No text or labels visible anywhere.`,
    postProcess: null,
  },

  // ============== TIER 12 — maps ==============
  // NOTE: gpt-image-2 is variable at strict top-down tactical maps with grid. These
  // are best-effort atmospheric / semi-tactical maps suitable as scene backdrops in
  // Foundry. For pixel-precise gridded battlemaps, prefer Dungeondraft/Dungeon Alchemist.
  {
    id: "p3-hardby-city-map",
    tier: 12,
    out: "assets/maps/hardby-city-map.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Top-down fantasy city map of HARDBY, a fortified Aerdi-coast harbor city of about 8,000 souls.
Painterly cartographic style — like a published D&D adventure module city map (Tales of the Valiant / Pathfinder city handout / Greyhawk gazetteer style). Hand-painted feel, parchment substrate, soft sepia and ink palette with limited muted color (rust roofs, gray stone, ochre roads, deep blue-green harbor water).
NOT a satellite photograph, NOT a modern street map. NOT a 19th-century engraving.

Geography (imagine north = top of the image):
- A natural deepwater HARBOR opens to the east edge of the map. Two stone breakwaters extend into the bay; lighthouse at the tip of the southern breakwater.
- The OLD CITY climbs a low headland on the south side of the harbor, walled in dark gray stone, irregular street plan winding up toward an octagonal stone keep called the GYNARCHY HOUSE at the highest point.
- The NEW CITY sprawls north of the harbor along the flat coastal plain, regular grid plan, lighter limestone walls, broader avenues.
- The DOCKS run along the southern half of the inner harbor — long rows of warehouses, two dry-docks, a dozen labeled jetties. Densest building cluster on the map.
- The MERCHANT QUARTER fills the northeast — the Cindren & Vhal counting-house complex (a square block with internal courtyard), other named compting houses, the Trade Hall.
- The CIVIC QUARTER fills the northwest — registry office, Notary's Hall, militia barracks, civic plaza.
- A BLACK COG LANE neighborhood at the south edge of the docks — rougher buildings, narrower alleys, the COOPERED WRECK tavern marked with a small sigil.
- WHITEMOOR ESTATE on the northern outskirts beyond the new city walls — a walled merchant villa with garden grounds.
- LANDWARD GATES on the west and northwest edges, with roads leading off the map (toward Loftwick / toward the inland Yeomanry).
- A small RIVER cuts through the new city, north-to-south, emptying into the harbor.

Add a tasteful compass rose in the upper-left corner. Add a small scale bar in the lower-right. NO text labels on any building or quarter — labels will be added separately in Foundry. NO modern symbols. Painted-map feel, not vector.`,
    postProcess: null,
  },
  {
    id: "p3-coopered-wreck-map",
    tier: 12,
    out: "assets/maps/coopered-wreck-interior.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of the COOPERED WRECK, a dockside tavern interior in the harbor district of HARDBY.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley / Tales of the Valiant interior style). NOT a modern architectural blueprint, NOT a 3D render.

The map is viewed straight down from above. Shows ONE FLOOR — the ground floor / common room of the tavern.
Building footprint roughly rectangular, longer east-to-west, ~50 ft × 35 ft.

Layout (imagine north = top of the image):
- MAIN ENTRANCE on the south wall (street side), a heavy iron-bound oak door.
- COMMON ROOM fills the western two-thirds — irregular arrangement of small wooden tables and benches (about eight tables visible), a long bar along the north wall with rows of clay bottles on shelves behind it, a stone hearth on the west wall with chairs pulled up to it.
- BACK ROOM (Olfard's office) is a small partitioned room in the northeast corner, accessed by a single door from behind the bar. Has a desk, a strongbox, a back door leading to a service alley on the east wall.
- KITCHEN / SCULLERY a small room along the south wall, between common room and back room, with a serving hatch onto the bar.
- A NARROW STAIR in the southeast corner climbs up to a second-floor sleeping loft (not shown on this map).
- WINDOWS only on the south wall (small, shuttered).
- Outside the building edges: cobbled dock alley on the south, a narrow service alley on the east.

Render with a soft 5 ft square grid overlaid (faint dark lines, low opacity). Painted plank floors in the common room, slate in the kitchen, threadbare patterned rug under the central tables. Warm lamp-lit atmosphere implied by the palette (amber, dark brown, deep red). NO text labels — annotations will be added in Foundry.`,
    postProcess: null,
  },
  {
    id: "p3-cv-branch-map",
    tier: 12,
    out: "assets/maps/cv-hardby-branch-interior.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down floor plan in fantasy parchment cartography style for a tabletop game. Painted-map feel similar to published adventure module handouts. Single floor, viewed straight from above.

The floor plan shows a modest stone building — about 60 by 60 feet, square in shape. North faces the top edge.

Inside the building, please draw:
- An entry vestibule at the south side with two long benches and a tall standing desk.
- A wide reception hall taking up the southern portion, with three small enclosed booths arranged along the south wall, an open visitor area in front of them, and a quiet alcove with two armchairs at the southeast corner.
- A small open-air atrium right in the middle of the building, with a stone bench and a single small tree, surrounded by a pillared walkway.
- A private study in the northeast quarter, with a writing desk, two chairs, and a small fireplace.
- A reading room in the northwest quarter, with tall bookshelves along the walls and a long study table down the center.
- A narrow service hallway running along the east wall, connecting the atrium to a small rear doorway.
- A small windowless storage room at the north wall, shown with thicker stone walls than the others.
- A small workroom for scribes near the storage room, with three writing desks.

Add a faint 5-foot square grid lightly drawn over the whole image. Use a warm muted palette of dark walnut, brass, deep red rugs, and ivory plaster. Polished wood floors. No words or letters anywhere. Painted, not vector.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p3-black-cog-warehouse-map",
    tier: 12,
    out: "assets/maps/black-cog-warehouse-interior.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of a small derelict harbor WAREHOUSE on BLACK COG LANE in HARDBY.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style). NOT modern blueprint.

Building footprint rectangular, ~40 ft × 60 ft, single story plus a partial loft.

Layout (north at top):
- LARGE SLIDING CARGO DOOR on the south wall (street side), big enough for a wagon, currently closed.
- SMALLER PERSONNEL DOOR also on the south wall, beside the cargo door.
- MAIN WAREHOUSE FLOOR fills most of the interior — open space with rows of stacked CRATES and BARRELS, some toppled, some still neatly stacked. Improvised partition walls of stacked crates create CHOKE POINTS roughly midway through the building. Spilled grain and straw on the floor.
- A SMALL PARTITIONED ROOM on the northwest corner — a former foreman's office, empty desk, broken chair, this is where TAMSIN MORAVEN is being held tied to the chair.
- A LOFT runs along the north wall, accessed by a wooden ladder — half-collapsed, suitable as elevated cover for archers.
- A REAR DOOR on the east wall opens onto a narrow service alley between buildings.
- Two small high WINDOWS on the west wall, shuttered.

Render with a faint 5 ft square grid. Color palette: rough plank floor, dust and grime, dim amber light implied by a single guttering lantern hung from a ceiling beam (visible as a small bright spot). Cluttered, broken, abandoned — clearly not in active use. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },

  // ============== TIER 13 — additional location maps (P2 & P3) ==============
  {
    id: "p3-whitemoor-estate-map",
    tier: 13,
    out: "assets/maps/whitemoor-estate-grounds.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Top-down tactical battlemap of WHITEMOOR ESTATE — a small walled coastal villa two days east of Hardby, used as a quiet detention site by Cindren-aligned interests. Includes the walled grounds and the main house ground floor.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley / Tales of the Valiant style). NOT modern blueprint, NOT photo-realistic.

The map shows the WHOLE ESTATE from above, contained within a stone perimeter wall, roughly rectangular ~150 ft × 100 ft. Imagine north = top.

Layout:
- WALLED PERIMETER on all four sides, stone wall about 8 ft tall, with iron-railing top.
- MAIN GATE on the south wall — a wrought-iron double gate, with a small GATEHOUSE (where one or two guards stay).
- A wide CARRIAGE DRIVE curves from the main gate up to the house entrance.
- The MAIN HOUSE sits on the north half of the grounds — a two-story stone manor (only the ground-floor footprint is shown), roughly 60 ft × 40 ft. Main entrance hall, dining room, sitting room, kitchen wing on the east side, study on the west side.
- A CELLAR ENTRANCE on the east side of the house leads down — Tamsin is held in a cellar room (not shown, but the entrance is marked).
- A FORMAL GARDEN in the southeast corner of the grounds — geometric hedges, a stone bench, a small ornamental pool.
- A KITCHEN GARDEN on the southwest corner — vegetables, herbs, a small shed.
- A STABLE BLOCK along the west wall — three stalls, a tack room.
- A few CYPRESS TREES along the perimeter for visual privacy.
- A small SIDE GATE on the east wall (locked, key with the housekeeper).

Render with a faint 5 ft square grid. Palette: pale stone walls, terracotta roof on the house, green of the garden, gravel of the carriage drive in warm tan. Atmosphere: prosperous but isolated, deliberately private. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p3-veska-office-map",
    tier: 13,
    out: "assets/maps/veska-notary-office-interior.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of VESKA MAELAN's NOTARY & TRADE-CLEARING OFFICE on Whalemarket Quay in HARDBY. A small professional office, ground floor only.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style).

Building footprint rectangular, ~30 ft × 40 ft.

Layout (north at top):
- FRONT DOOR on the south wall (street side) — a heavy oak door with a small painted sign showing an open scroll and a balance scale.
- PUBLIC RECEPTION ROOM in the southern half — two waiting benches against the walls, a low side table with a small vase of dried flowers, a tall narrow desk where Veska or a clerk receives visitors and accepts documents. Glass case along one wall holding the bound directory of registered chops.
- INNER OFFICE in the northern half — a long oak worktable in the center, surrounded by tall narrow lamps for close inspection work. Three walls covered with floor-to-ceiling cabinets of small numbered drawers (the document files). A heavy LOCKED CABINET against the north wall holding sensitive correspondence and current open cases. A reading chair by the small private hearth on the east wall.
- A SMALL REAR ROOM in the northwest corner — Veska's private quarters, a narrow bed, a wash-stand, a clothes-press. Door from the inner office.
- A REAR DOOR on the west wall opens to a narrow service alley.
- TWO SMALL HIGH WINDOWS on the south wall (street).

Render with a faint 5 ft square grid. Palette: warm honey-toned wood throughout, brass lamp fittings, oxblood leather chair. Atmosphere: precise, ordered, professionally calm. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p3-castrian-house-map",
    tier: 13,
    out: "assets/maps/castrian-vell-house-interior.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of CASTRIAN VELL's TOWNHOUSE in HARDBY — a Hardby merchant townhouse, ground floor and upper floor shown side by side as two halves of one image.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style).

Building footprint per floor: ~30 ft × 40 ft, two-story stone-fronted townhouse.

LEFT HALF — GROUND FLOOR (north at top):
- FRONT DOOR on the south wall, brass plate reads VELL.
- ENTRY HALL with coat-rack and a narrow side-table.
- SITTING ROOM filling the western two-thirds of the ground floor — a generous comfortable room with a stone hearth on the west wall, three settees and a scatter of armchairs arranged loosely around a central low table, a sideboard with wine and glasses, a small upright spinet against the south wall. This is where the salons happen.
- KITCHEN / SCULLERY in the northeast corner, with an external door onto the back garden.
- STUDY off the back hall in the east — Castrian's private writing room, a heavy desk facing a window onto the garden, a wall of books, a single armchair.
- INTERNAL STAIR rising near the entry.
- SMALL BACK GARDEN visible at the north edge — a stone path, a single olive tree, a wooden bench.

RIGHT HALF — UPPER FLOOR (north at top):
- THREE GUEST BEDCHAMBERS along the south side (front of house) — each with a bed, washstand, small chair, narrow window onto the street.
- CASTRIAN'S OWN BEDCHAMBER in the northwest corner — larger, with its own small fireplace.
- HOUSEKEEPER'S ROOM (Sarro Pell) in the northeast corner — small, neat, a bed, dresser, chair.
- A SMALL PRIVATE LIBRARY off the upper hall — a single armchair, a reading lamp, two walls of books.
- STAIR DOWN at the south end of the upper hall.

Faint 5 ft square grid throughout. Palette: warm wood floors, plastered walls in cream and ochre, oxblood and dark green soft furnishings, brass lamp fittings. Atmosphere: prosperous, lived-in, hospitable. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p3-gynarchy-registry-map",
    tier: 13,
    out: "assets/maps/gynarchy-registry-interior.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Top-down tactical battlemap of the HARDBY GYNARCHY REGISTRY OFFICES — a civic building of the Hardby Gynarchy where formal records of trade, citizenship, property, and credentials are filed and consulted. Ground floor only.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style).

Building footprint rectangular, ~80 ft × 50 ft. North at top.

Layout:
- GRAND ENTRANCE on the south wall — a pair of bronze double doors, opening into a wide PUBLIC ATRIUM with a checkered marble floor.
- ATRIUM has a tall arched ceiling (implied by lighter shading), a desk where applicants present credentials to a duty clerk, two long polished benches against the walls.
- PUBLIC SEARCH ROOM in the southwest quadrant — long oak tables with reading lamps, citizens consulting bound register volumes; tall shelves of public records line the western wall.
- SECURE STACKS in the northwest quadrant — restricted; a half-height GATE separates this area from the public search room. Beyond the gate: tall locked cabinets, ladder rails on the high shelves, a clerk's desk where a registrar checks credentials before retrieving a document.
- SENIOR REGISTRAR'S OFFICE in the northeast corner — heavy desk, a small private safe, two visitor chairs, door from the inner hall.
- CLERK BULLPEN along the east side — six small writing desks for the day's clerks, ink-stands, copy-stands.
- WORKROOM in the southeast corner — where new entries are inscribed and bound; tall desks, a small bookbinder's press.
- A SERVICE STAIR in the very northwest corner leads down to the deep records vault (not shown).
- An INTERNAL CORRIDOR runs east-west across the middle of the building, separating public space from working space.

Render with a faint 5 ft square grid. Palette: cool stone, marble floors, dark walnut shelving, brass lamp fittings, civic gravity. Atmosphere: hushed, official, ordered. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p2-cv-loftwick-map",
    tier: 13,
    out: "assets/maps/cv-loftwick-satellite-interior.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of the CINDREN & VHAL LOFTWICK SATELLITE OFFICE — a small branch office of the Hardby counting-house, located in Loftwick. Modest, single floor, narrow street-front.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style).

Building footprint rectangular, ~30 ft × 50 ft. North at top.

Layout:
- FRONT DOOR on the south wall, glazed in the upper half so the street can see in during business hours.
- ANTECHAMBER just inside the door — a narrow waiting bench, a coatstand, a small framed copy of the firm's Hardby charter on the wall.
- TELLER COUNTER spans the room east-to-west — a long polished oak counter with two BARRED TELLER CAGES, a swing-gate at the east end where staff pass through.
- CUSTOMER FLOOR fills the southern half between the entrance and the counter.
- MANAGER'S OFFICE behind the counter on the west side — a single private room with a desk, two visitor chairs, a small wall safe.
- CLERK STATIONS — three small writing desks behind the counter on the east side.
- SMALL STRONGROOM on the north wall — a reinforced door (single lock; this is a satellite, not a main vault), shallow stone-walled room with shelves of sealed pouches and ledger volumes.
- A REAR DOOR on the east wall opens into a small service alley.
- A STAIR in the northwest corner leads up to a closed-off second floor (not shown — used for storage and the manager's overnight cot when needed).

Render with a faint 5 ft square grid. Palette: dark walnut paneling on the lower walls, cream plaster above, brass lamp fittings, deep red runner along the customer floor. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p2-pollow-office-map",
    tier: 13,
    out: "assets/maps/pollow-office-interior.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Top-down tactical battlemap of RELN POLLOW's OFFICE in the Loftwick Audit Hall — a single working chamber and adjoining clerk's antechamber. Pollow is a senior Audit Hall functionary.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style).

Map footprint ~25 ft × 30 ft. North at top.

Layout:
- ENTRY DOOR on the south wall opens from the Audit Hall's interior corridor.
- CLERK'S ANTECHAMBER in the southern third — a narrow room with a tall writing desk for the secretary, a single visitor's chair, a wall of pigeonhole shelves for incoming and outgoing correspondence. Inner door to the office on the north wall.
- POLLOW'S OFFICE in the northern two-thirds — a heavy oak desk centered, two visitor chairs facing the desk, a reading lamp, a private hearth on the west wall (small, civic, unornamented), tall narrow windows on the north wall (overlooking an interior courtyard), a wall of locked correspondence drawers on the east wall, a single bookcase of bound case files.
- A PRIVATE STRONGBOX (visible as a small heavy iron-bound chest) sits at the desk's right hand.
- A SMALL SIDE TABLE near the chairs holds a water carafe and two glasses.

Render with a faint 5 ft square grid. Palette: dark wood floor, smoke-grey plaster walls, brass desk fittings, deep oxblood leather chairs. Atmosphere: senior civic functionary's working room — restrained, austere, lived-in. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p2-vellin-home-map",
    tier: 13,
    out: "assets/maps/vellin-moraven-home-interior.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of VELLIN MORAVEN's HOME in Loftwick — a modest two-story townhouse where Vellin lives with his daughter Ailen (when she's home). Both floors shown stacked: ground floor below, upper floor above.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style).

Each floor footprint ~25 ft × 30 ft. North at top of each.

LOWER HALF — GROUND FLOOR:
- FRONT DOOR on the south wall.
- ENTRY HALL with coat-pegs and a narrow shoe-bench.
- SITTING / DINING ROOM in the western half — a small hearth on the west wall, a worn but well-kept oak table with four chairs, two reading chairs flanking the hearth, a sideboard against the south wall.
- KITCHEN in the northeast corner — small, neat, a coal range, a prep table, a back door to a tiny walled yard.
- VELLIN'S STUDY in the southeast corner — a small writing desk under a window onto the street, a single chair, a bookshelf with worn but well-loved books.
- STAIR in the northwest corner climbs to the upper floor.
- TINY WALLED REAR YARD outside the kitchen door, with a single laundry-line and a small herb-pot.

UPPER HALF — UPPER FLOOR:
- VELLIN'S BEDCHAMBER in the southwest corner — a single bed, a chest at the foot, a wash-stand.
- AILEN'S ROOM in the southeast corner — a single bed, a small writing desk, a few books, a saddle-bag set against the wall (she travels often).
- SMALL SHARED WASHROOM in the northeast corner — a copper tub, a shaving stand.
- LINEN CUPBOARD / STORAGE in the northwest corner.
- HALL connects all four upper rooms; stair descends at the west end.

Render with a faint 5 ft square grid. Palette: light wood floors, plain cream plaster walls, modest soft furnishings in faded green and brown. Atmosphere: a quiet, private home, not wealthy but cared for. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },

  // ============== TIER 14 — Phase 4 portraits, scenes, maps ==============
  // Portraits
  {
    id: "p4-sereth-portrait",
    tier: 14,
    out: "assets/portraits/sereth-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of TARLITH VHAL SERETH, an Aerdy commercial-court advocate and senior partner of a Rel Astra counting house, in his late fifties.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting. Clean digital painterly fantasy art.

Tall, narrow-shouldered, very thin. Dark Aerdy complexion (warm brown skin). Hair gone silver-white, worn long, tied back at the nape. A clipped silver beard, neat. Dark eyes that catalogue rather than meet. He wears the dark-grey Aerdy advocate's overcoat (stiff dark broadcloth with a high collar and no ornament except the small silver bar of office at the lapel). A heavy silver seal-ring on his right hand bearing a stylized crane-and-three-coins device — the firm's seal, not personal heraldry.
He sits at a heavy oak desk in a third-floor private office; the light falls on his face from a tall narrow window slightly behind him on the right. He has a single sheet of parchment in his hand, not yet read; his other hand rests open on the desk. He is not smiling. He is not frowning. He is exactly as composed as he intends to appear.
Three-quarter view from chest up. Background: warm dark wood paneling, the spine of a four-volume set of the CODEX MERCATUM visible on a small shelf to the right.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p4-halask-portrait",
    tier: 14,
    out: "assets/portraits/halask-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of THERION HALASK, a retired Aerdy commercial-court advocate, in his mid-sixties.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting. Clean digital painterly fantasy art.

Aerdy, dark-skinned (warm dark brown), white hair worn close-cropped to the skull. A long pale linen advocate's robe, soft cream, with a faded purple-and-gold sash of an old retired bench (the sash is the kind no one in the room can quite remember the meaning of any more, and Halask wears it for exactly that reason). Reading lenses on a fine silver chain, currently pushed up on his forehead. A heavy plain silver ring on his right hand bearing his own old advocate's seal — a single open scroll above two crossed quills.
He sits at a small marble cafe table at the BRASS SEXTANT coffee-house on the third quay of Rel Astra, a small cup of strong dark coffee in front of him, an open book and a wax tablet on the table. He is looking up from the tablet, attentive but unhurried, as if a guest has just arrived at his table.
Three-quarter view from chest up. Background: dappled morning Aerdi sunlight on the cafe wall behind him, a slice of harbor visible through an arched window.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p4-astor-portrait",
    tier: 14,
    out: "assets/portraits/astor-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of COUNCILOR BELVEN ASTOR, an Aerdy harbor-ward councilor and former master mariner, in his mid-fifties.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Aerdy, weathered features from twenty years at sea, weathered tan skin, short iron-grey beard close-clipped. Dark wool coat (plain, well-cut, sea-master's old style adapted to civic dress), small enameled wave-and-anchor pin on the lapel — the sigil of a sitting Old Harbor Ward councilor. Calloused hands. A strong stance. Eyes that have read weather in every quarter of the sea.
He stands behind the customer counter of a chandler's shop (his), with rope, brass shipfittings, lamp wicks, sealed pots of pitch visible on the shelves behind him. The light is afternoon, falling through the front-shop windows. He has just looked up from a ledger.
Three-quarter view from waist up. Background: chandler's-shop interior, warm wood, brass and rope.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p4-galenix-portrait",
    tier: 14,
    out: "assets/portraits/galenix-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of LORD GALENIX NAELAX, an Aerdy noble of House Naelax, currently confined under polite house arrest to the Naelax embassy in Rel Astra. Mid-thirties.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Aerdy noble. Tall, fair-skinned for an Aerdy (warm pale beige), dark hair worn loose to the shoulders, well-trimmed dark beard. The Naelax house ring on his left hand (a stylized eagle on a black field). A smaller signet on his right hand — his mother's family's. Wears the dark Naelax house colors (deep bottle-green and black) but with restraint — the cut is restrained, no embroidery, no chains of office. A leather-bound book under his arm. He has been reading.
He stands in a long quiet gallery of the Naelax embassy interior — tall narrow windows showing afternoon light over a walled garden, a stone floor, a single old tapestry of a Naelax hunting scene visible behind him. He is not relaxed; he is composed. There is a watchfulness around the eyes.
Three-quarter view from chest up.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p4-mirelth-portrait",
    tier: 14,
    out: "assets/portraits/mirelth-portrait.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Portrait of LORD FAREN MIRELTH, an Aerdy old-house reformist politician (and secretly bankrupt Cindren-debtor) in his late forties. Bust portrait.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Aerdy old-house. Tall, fair (warm pale beige), careful smile, well-groomed dark hair greying at the temples, a thin clean-shaven face. Wears the dark Aerdy noble's coat with the modest "reformist" cut (high collar, plain cuffs, a single small enameled pin of his civic transparency committee). The smile is a public smile; the eyes are tired and just a little hunted. He is photographed (painted) in a small public reading-room, a stack of civic pamphlets on the table next to him.
Bust / three-quarter view from chest up. Background: dark wood paneling, soft daylight from a window not in shot.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p4-vesh-portrait",
    tier: 14,
    out: "assets/portraits/vesh-portrait.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Portrait of MAGISTER ANDRUNE VESH, an Aerdy academic and standard-reference legal scholar, in his late fifties. Bust portrait.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Aerdy mainstream. Medium build, balding with close-trimmed iron-grey hair at the sides, a short well-kept beard, brown skin, intelligent calm eyes behind small round reading lenses. Wears the dark robes of a senior magister of the Aerdy College of Commercial Law, with the small silver-and-pearl academic chain at the throat (his magister's distinction). Looks tired in a way that has been tired for several years. A heavy book is open in his hands — the four-volume CODEX MERCATUM, his own work.
Bust / three-quarter view from chest up. Background: a college library, deep shelves of bound volumes, warm soft library light.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p4-tenrel-portrait",
    tier: 14,
    out: "assets/portraits/tenrel-portrait.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Portrait of MISTRESS CORIATH TENREL, an Aerdy commercial-court advocate in her early forties. Bust portrait.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Aerdy. Dark-skinned (rich dark brown), sharp aquiline features, dark hair worn in the architectural style of the Aerdy commercial-court advocates (sleek up-swept and bound at the back). Wears the dark wine-colored advocate's coat with white linen at the collar, a small gold-and-jet brooch at the throat marking her standing in the court. Sharp, intelligent, ambitious eyes. She is composed and looking directly at the viewer; the smile is the smile of someone who has decided you do not yet warrant her interest.
Bust / three-quarter view from chest up. Background: a court antechamber, Aerdi columns, soft midday light from a high window.
${ART_STYLE}`,
    postProcess: null,
  },
  // Sereth confrontation scene
  {
    id: "p4-sereth-office",
    tier: 14,
    out: "assets/illustrations/p4-sereth-office.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene image. NOT 19th-century oil painting.

INTERIOR scene. Tarlith Vhal Sereth's third-floor private working office at the Cindren & Vhal Rel Astra counting house. Late afternoon, warm honey light slanting in through tall narrow windows on the right. Heavy oak desk, two visitor chairs facing it, a small private hearth glowing low, a wall of locked correspondence drawers behind the desk. The firm's seal-press on a side table. A four-volume set of leather-bound books (the CODEX MERCATUM) on a small shelf.

CHARACTERS in the room (5 total):
- TARLITH VHAL SERETH at the desk: late fifties Aerdy man, tall, very thin, silver-white long hair tied back, clipped silver beard, dark-grey advocate's overcoat, heavy silver firm-seal ring. He is composed; one hand rests open on the desk, the other holds a single folded sheet of parchment. He is the still center of the composition.
- TWO BODYGUARDS standing flat against the south wall behind Sereth, dressed in plain dark Aerdy household livery, swords scabbarded but visible, hands folded; they are watchful, not aggressive.
- ONE BODYGUARD CAPTAIN standing near the door, a Knight in fine dark mail under a tabard with the firm's crane-and-coins, sword at hip, helmet under his arm, alert; he is the only guard with his attention split between the party and Sereth.
- The PARTY (one or more PCs visible from the back/quarter, presenting documents on the desk): adventurers in travel-worn clothing, not nobility — boots, leather, a sword belt or two visible. They have just laid the indictment package on the desk: a bound notarial opinion and several loose documents. Show the back of one PC's head and shoulder, and another PC half-turned toward the camera.

Composition: cinematic, the desk and Sereth occupying the right-third of the frame, the party at the left foreground, the bodyguards at the back wall. Painterly digital fantasy illustration. Warm tonally cohesive palette: deep browns and walnut, brass and gold, the cool steel of the captain's mail, the dark grey of Sereth's coat. NO text or labels visible.`,
    postProcess: null,
  },
  // Halask + Brass Sextant scene
  {
    id: "p4-brass-sextant",
    tier: 14,
    out: "assets/illustrations/p4-brass-sextant.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene image. NOT 19th-century oil painting.

INTERIOR scene. The Brass Sextant coffee-house on the third quay of Rel Astra. Morning. Warm Aerdy sunlight pouring through tall arched windows, a slice of harbor and ship masts visible in the right window. Marble cafe tables, brass fittings, high ceilings, plastered walls hung with a few framed sea charts.

CHARACTERS (4):
- THERION HALASK at his usual table by the window: Aerdy man in his mid-sixties, dark-skinned, white close-cropped hair, pale linen advocate's robe with a faded purple-and-gold sash, reading lenses pushed up on his forehead, a small cup of dark coffee at his elbow. An open book and a wax tablet in front of him. He has just looked up; his expression is attentive, courteous, unhurried.
- TWO PARTY MEMBERS approaching his table from the left, presenting Caelith's letter of introduction. One is in front, holding the folded letter; the other a half-step behind. They wear travel-worn but clean garb appropriate to adventurers — linen shirts, leather, a sword belt, a satchel. They are visibly newcomers to Rel Astra (slightly dust-toned compared to the cafe regulars).
- The CAFE PROPRIETOR (incidental) behind a brass coffee-bar in the background, polishing a cup; he has noted the encounter without comment.

Composition: Halask in the right-center of the frame at his table; the party on the left, mid-ground, walking toward him; the proprietor in the background. Warm morning palette: cream, gold, soft Aerdy sunlight, brass, the deep green of a single potted lemon tree near the window. Painterly digital fantasy illustration. NO text or labels visible.`,
    postProcess: null,
  },
  // Naelax Embassy / Galenix audience scene
  {
    id: "p4-naelax-embassy",
    tier: 14,
    out: "assets/illustrations/p4-naelax-embassy.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene image. NOT 19th-century oil painting.

INTERIOR scene. The long quiet gallery of the Naelax embassy in Rel Astra. Late afternoon. Tall narrow windows on the left show the embassy's walled garden and the Aerdy sky beyond. A stone floor inlaid with a faded geometric Naelax pattern. A single long old tapestry on the right wall depicts a Naelax house hunt — dark greens and gold. Two heavy carved chairs and a small marble side table set out for the audience.

CHARACTERS (3):
- LORD GALENIX NAELAX standing near the windows: tall, mid-thirties Aerdy noble, fair-skinned for an Aerdy, dark hair to the shoulders, well-trimmed dark beard, dark Naelax house colors (bottle-green and black, restrained cut), the Naelax house ring on his left hand. He has set down a leather-bound book on the side table. His expression is attentive and a touch wary; this is his first private audience in months.
- ONE PARTY MEMBER seated in one of the carved chairs, presenting a folded document from the indictment package. They are in good Yeomanry traveling clothes, modest but presentable. The other party member stands at their side, listening.
- A SINGLE NAELAX HOUSEMAN at the door of the gallery, watchful but at the door's discretion (turned away to give the audience privacy); his presence reminds the viewer that the gallery is observed.

Composition: Galenix to the right of the frame, the seated party member center, the standing party member just left of center, the houseman a small figure at the far left near the door. Late-afternoon palette: warm gold from the windows, the bottle-green of Galenix's coat, the dark walnut of the chairs, the soft red of the tapestry. Painterly digital fantasy illustration. NO text or labels visible.`,
    postProcess: null,
  },
  // Harbor commission chamber scene (used for the "three seats" reveal)
  {
    id: "p4-harbor-commission",
    tier: 14,
    out: "assets/illustrations/p4-harbor-commission.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene image. NOT 19th-century oil painting.

INTERIOR scene. The Rel Astra Harbor Commission chamber: a circular Aerdy commercial chamber with seven high-backed carved chairs arranged in a semicircle around a central polished oak floor, each chair on a low stone dais, three of the chairs visibly EMPTY (a wreath of dark ribbon draped over each as a sign of vacancy). Behind the chairs, a tall arched colonnade gives onto a balcony overlooking the Old Harbor; you can see the harbor and ship masts through the arches in the background.

CHARACTERS (4 commissioners + 1 clerk):
- MISTRESS ALDAEN VETH on the senior commissioner's chair (center): a slight, severe Aerdy woman in her late sixties, white hair, dark commissioner's robes with a brass scroll-and-anchor chain at the throat. Posture upright, expression dour.
- MASTER HOLD VESHANEN seated to her right: a stout merchant in his fifties, well-dressed in dark wine-colored Aerdy fashion, a gold pin at the lapel.
- MAGISTER ELED RUTH seated two chairs to Veth's left: a thin academic in his sixties, in an academic's robes over a plain shirt, irritated expression.
- CAPTAIN VOLIN REACH seated at the far right: an Aerdy imperial officer in oxblood-and-gold uniform, sword at hip, attentive.
- THE COMMISSION CLERK at a small writing desk in the right foreground: a young Aerdy clerk recording the proceedings, quill in hand.

Composition: wide cinematic shot showing all four sitting commissioners and the three empty chairs, the colonnade behind them, the harbor visible. Painterly digital fantasy illustration. Cool stone and polished oak, dark commissioner's robes, brass and gold, the muted blue-green of the harbor framing it all. NO text or labels visible.`,
    postProcess: null,
  },
  // Tokens with rings
  {
    id: "p4-sereth-token",
    tier: 14,
    out: "assets/tokens/sereth-token.png",
    sourceFromExisting: "assets/portraits/sereth-portrait.png",
    skipGeneration: true,
    postProcess: "round-token-512",
    dependsOn: "p4-sereth-portrait",
    // Cold dark gold — senior partner, hostile
    ring: { base: "#7a5018", highlight: "#c89238", shadow: "#1a0e04" },
  },
  {
    id: "p4-halask-token",
    tier: 14,
    out: "assets/tokens/halask-token.png",
    sourceFromExisting: "assets/portraits/halask-portrait.png",
    skipGeneration: true,
    postProcess: "round-token-512",
    dependsOn: "p4-halask-portrait",
    // Soft silver — quiet ally, civic gravity
    ring: { base: "#7a7e88", highlight: "#c4c8d0", shadow: "#2a2c30" },
  },
  // Rel Astra city map
  {
    id: "p4-rel-astra-city-map",
    tier: 14,
    out: "assets/maps/rel-astra-city-map.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Top-down fantasy city map of REL ASTRA, a great Aerdy port city of approximately 50,000 souls on the eastern coast of the Sea of Gearnat.
Painterly cartographic style — like a published D&D adventure module city map (Tales of the Valiant / Pathfinder city handout / Greyhawk gazetteer style). Hand-painted feel, parchment substrate, soft sepia and ink palette with limited muted color (terracotta roofs, pale stone, ochre roads, deep blue harbor water).
NOT a satellite photograph, NOT a modern street map, NOT a 19th-century engraving.

Geography (north = top of the image):
- A large protected HARBOR opens to the east. Two long stone breakwaters with a STONE LIGHTHOUSE TOWER at the southern breakwater's tip. Imperial mooring on the north side of the harbor (three named berths with the Aerdy imperial standard); merchant quays on the south side.
- The OLD HARBOR WARD spreads along the south side of the harbor — older, denser, walled-off in pale grey stone, irregular street plan, the Goldsmiths' Quarter on the eastern side rising up a slope of four-story counting houses (one labeled with a discreet "C&V" mark to imply Cindren & Vhal Rel Astra's main building).
- The CUSTOMS QUAY on the north side of the harbor — formal Aerdy imperial style, regular columns, the imperial customs office, the Hall of the Compass (the diplomatic guesthouse) marked with a small standard.
- The OLD CITY climbs the rise west of the harbor — even older streets, three temple districts (each ringed by their own walls), a market square, the Naelax embassy compound on the western edge with its own walled garden.
- The HIGH QUARTER on the higher slopes northwest — the wealthier mercantile residences, broader avenues.
- The CITY WALLS encircle everything in two rings: the inner imperial wall (older, pale grey stone) around the Old Harbor Ward and Old City; the outer commercial wall (newer, ochre limestone) around the High Quarter and the harbor approaches. Two main GATES marked on the wall: the WEST GATE (old imperial barbican) and the SOUTH GATE (newer, commercial-traffic gate).
- A single SMALL RIVER cuts down from the northwest, crosses the city, and empties into the harbor at the western inner end.
- The HARBOR COMMISSION HALL marked as a small circular building on the harbor's edge between the Old Harbor Ward and the Customs Quay.
- A small COMPASS ROSE in the upper-left corner. A small SCALE BAR in the lower-right.

NO text labels on any building or quarter — labels will be added separately in Foundry. Painted-map feel, NOT vector. Atmosphere: a great old Aerdy port, prosperous and slow.`,
    postProcess: null,
  },
  // Sereth office tactical map
  {
    id: "p4-sereth-office-map",
    tier: 14,
    out: "assets/maps/sereth-office-third-floor.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of TARLITH VHAL SERETH'S third-floor offices at the Cindren & Vhal Rel Astra counting house. Three rooms: a formal audience room, a private working office, a small private study, plus the corridor and stairwell.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley interior style). NOT modern blueprint.

Footprint ~50 ft × 40 ft. North at top.

Layout:
- ARRIVAL STAIR at the south wall, opening into a small CORRIDOR running east-west.
- FORMAL AUDIENCE ROOM in the southwest quadrant: long oak table down the center with twelve chairs, three tall windows on the south wall, a wall of leather-bound firm history on the east wall, fireplace on the west wall (cold, decorative).
- SERETH'S PRIVATE WORKING OFFICE in the northwest quadrant: heavy desk facing south (so the light falls on the visitor, not on him), two visitor chairs, a small private hearth on the west wall, a wall of locked correspondence drawers on the north wall, a small bookcase of the CODEX MERCATUM, the firm's seal-press on a side table near the desk.
- SMALL PRIVATE STUDY in the northeast corner: a single reading chair by a small fire, side table with a carafe and one glass, a single bookcase. This room is private; only Sereth enters.
- A SECONDARY DOOR from the private office opens into the small private study.
- The CORRIDOR has the firm's seal carved into the floor at the threshold.
- A SERVICE STAIR in the southeast corner (the bodyguards' fallback position) leads down to the second floor.

Render with a faint 5 ft square grid. Palette: warm honey-toned wood floors, dark walnut paneling, brass lamp fittings, oxblood leather chairs, soft Aerdy sunlight implied through south windows. Atmosphere: senior commercial officer's stronghold — formal, comfortable, observant. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  // Harbor Commission Hall map
  {
    id: "p4-harbor-commission-map",
    tier: 14,
    out: "assets/maps/harbor-commission-hall.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Hand-painted top-down floor plan in fantasy parchment cartography style for a tabletop game. Painted-map feel similar to published adventure module handouts. Single floor, viewed straight from above.

The floor plan shows a small fantasy meeting hall — about 80 by 60 feet. North faces the top edge.

Inside the building, please draw:
- A wide rectangular foyer at the south, with a long polished bench against one wall and a tall standing desk for a clerk near the inner doorway. Main entrance at the south wall.
- A large round main hall in the center and north — circular, about 50 feet across, marble-tiled floor with a simple ship-and-anchor inlay at the center.
- Seven tall carved chairs arranged in a curve around the north half of the round hall, each chair on a small low platform.
- A row of tall pillars at the north edge of the round hall, opening onto a narrow balcony that overlooks a strip of blue-green water at the very top of the image (the harbor).
- A small private workroom in the southwest corner with two writing desks, bookshelves, and a small fireplace.
- A narrow spiral stair in the northwest corner.
- A small side door in the northeast corner.
- Two small balcony platforms hanging above the south side of the round hall, reached by short stairs from the foyer.

Add a faint 5-foot square grid lightly drawn over the whole image. Use a palette of pale marble, dark polished wood, brass, and deep red drapery. No words or letters anywhere on the map. Painted, not vector.${DOOR_RULES}`,
    postProcess: null,
  },

  // ============== TIER 15 — Whitemoor Estate upper floor + cellar ==============
  {
    id: "p3-whitemoor-upper-map",
    tier: 15,
    out: "assets/maps/whitemoor-estate-upper-floor.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of the UPPER FLOOR of WHITEMOOR ESTATE — a small walled coastal Aerdi villa, formerly a wine-house, two days east of Hardby. Currently used as a quiet detention site.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style). NOT modern blueprint. Painted-map feel.

Building footprint matches the ground floor: the upper floor of the main house, ~60 ft x 40 ft. North at top.

Layout (upper floor):
- A central UPPER HALL running east-west across the middle of the floor, lit by a tall narrow window at each end.
- THE MASTER BEDCHAMBER in the northwest corner — a wide bed, wash-stand, dressing alcove, a writing desk under a window onto the formal garden. Currently used by the OVERSEER (a hired manager retained by the firm).
- THE STEWARD'S BEDCHAMBER in the southwest corner — smaller, simpler, single bed, chair, dresser. The household's day-to-day manager.
- TWO GUEST BEDCHAMBERS along the south wall — currently both occupied by HIRED ENFORCERS. Each has a simple bed, dresser, and chair.
- A SMALL PRIVATE STUDY in the northeast corner (window onto the kitchen garden) — writing desk, single bookshelf, small private fireplace. The overseer's working room — letters, ledgers, a small lockbox.
- A LINEN AND STORAGE ROOM tucked off the upper hall, north side.
- A SMALL SHARED WASHROOM off the upper hall, south side — copper basin, dressing-bench.
- THE STAIR DOWN to the ground-floor entry hall, in the very center of the upper hall.
- A NARROW SERVICE STAIR in the southeast corner descends to the kitchen.
- A SHUTTERED CASEMENT on the north wall opens onto a small ROOFTOP TERRACE accessible only from the master bedchamber.

Render with a faint 5 ft square grid. Palette: pale plastered walls, terracotta tile floor, restrained Aerdi villa decoration in muted greens and gold, dark walnut beds and dressers. Atmosphere: comfortable but not lavish. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },
  {
    id: "p3-whitemoor-cellar-map",
    tier: 15,
    out: "assets/maps/whitemoor-estate-cellar.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Top-down tactical battlemap of the CELLAR LEVEL of WHITEMOOR ESTATE — a small walled coastal Aerdi villa, formerly a wine-house, currently a detention site for one captive.
Hand-painted fantasy cartography style suitable for a tabletop RPG (Dungeondraft / Mike Schley style). NOT modern blueprint.

Cellar footprint smaller than the floors above: ~50 ft x 35 ft. North at top.

Layout:
- CELLAR STAIRWAY descending from a side entrance in the courtyard above (rendered as a small landing in the southeast corner, with a heavy oak door at its top).
- A SHORT CORRIDOR leads west from the stair landing into the main cellar area.
- THE WINE CELLAR fills the western half — long ROWS OF WINE RACKS standing in parallel, casting good cover lines across the room. About fifty bottles still in the racks. Cool stone walls, packed-earth floor.
- A COOPER'S WORKBENCH and a single broken cask in the southwest corner.
- THE OLD VINTNER'S OFFICE in the northwest corner — a small windowless side chamber, currently set up as a watchman's room: a small table, two chairs, a heavy iron-bound chest, a hooded lantern, and a guttering candle. ONE GUARD here at all times.
- A REINFORCED HOLDING CHAMBER in the northeast corner — small (~10 x 10 ft), heavy iron-banded oak door with a small barred grille, a single low cot, a ceramic basin. THIS IS WHERE THE CAPTIVE IS HELD.
- A SECOND DOOR at the north end of the corridor leads to a UTILITY ROOM — a coal store, household tools.
- A SEALED OLD DOOR on the very east wall (locked, no longer used) was once a goods-in entrance from outside the wall — possibly forceable as an emergency exit.

Render with a faint 5 ft square grid. Palette: damp stone in cool blue-grey, packed-earth floor in warm tan, the warm amber glow of a single lantern in the watchman's room. Atmosphere: quiet, cold, lived-in only at the vintner's office. NO text labels.${DOOR_RULES}`,
    postProcess: null,
  },

  // ============== TIER 16 — round-ringed tokens for new actor NPCs ==============
  // ImageMagick-cropped from existing portraits. No API call.
  // Phase 3 NPCs:
  { id: "p3-solen-token",    tier: 16, out: "assets/tokens/solen-mereth-token.png",
    sourceFromExisting: "assets/portraits/solen-mereth-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a5018", highlight: "#c89238", shadow: "#1a0e04" } /* dark gold — compromised */ },
  { id: "p3-castrian-token", tier: 16, out: "assets/tokens/castrian-vell-token.png",
    sourceFromExisting: "assets/portraits/castrian-vell-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a7a4c", highlight: "#a8c490", shadow: "#1a2a14" } /* mossy green — host */ },
  { id: "p3-hesren-token",   tier: 16, out: "assets/tokens/hesren-vesh-token.png",
    sourceFromExisting: "assets/portraits/hesren-vesh-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#8a8470", highlight: "#d4ccae", shadow: "#2a261a" } /* tarnished brass — anxious witness */ },
  { id: "p3-ailen-token",    tier: 16, out: "assets/tokens/ailen-moraven-token.png",
    sourceFromExisting: "assets/portraits/ailen-moraven-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a5238", highlight: "#c08a64", shadow: "#1a0e08" } /* warm copper — Tamsin's daughter */ },
  { id: "p3-zoria-token",    tier: 16, out: "assets/tokens/zoria-weis-token.png",
    sourceFromExisting: "assets/portraits/zoria-weis-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#6a6a78", highlight: "#a8acb8", shadow: "#1a1a22" } /* steel grey — gynarchy clerk */ },
  { id: "p3-mira-token",     tier: 16, out: "assets/tokens/mira-cindren-token.png",
    sourceFromExisting: "assets/portraits/mira-cindren-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a3a3a", highlight: "#c46868", shadow: "#1a0808" } /* oxblood — hostile junior partner */ },
  // Phase 4 NPCs:
  { id: "p4-astor-token",    tier: 16, out: "assets/tokens/astor-token.png",
    sourceFromExisting: "assets/portraits/astor-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#3a567a", highlight: "#7898c0", shadow: "#08111a" } /* sea-blue — mariner ally */ },
  { id: "p4-galenix-token",  tier: 16, out: "assets/tokens/galenix-token.png",
    sourceFromExisting: "assets/portraits/galenix-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#3a5a3a", highlight: "#789878", shadow: "#08110a" } /* Naelax bottle-green */ },
  { id: "p4-mirelth-token",  tier: 16, out: "assets/tokens/mirelth-token.png",
    sourceFromExisting: "assets/portraits/mirelth-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a7060", highlight: "#c0b694", shadow: "#1a1610" } /* faded gold — bankrupt reformer */ },
  { id: "p4-vesh-token",     tier: 16, out: "assets/tokens/vesh-token.png",
    sourceFromExisting: "assets/portraits/vesh-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a5a72", highlight: "#9498b4", shadow: "#0a0a14" } /* muted indigo — academic */ },
  { id: "p4-tenrel-token",   tier: 16, out: "assets/tokens/tenrel-token.png",
    sourceFromExisting: "assets/portraits/tenrel-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#623038", highlight: "#a05868", shadow: "#16080a" } /* wine-dark — ambitious advocate */ },
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

  // If the job specifies referenceImages, use the /v1/images/edits endpoint with
  // multipart upload so the model grounds character likenesses in those portraits.
  const useEdits = Array.isArray(job.referenceImages) && job.referenceImages.length > 0;
  const endpoint = useEdits
    ? "https://api.openai.com/v1/images/edits"
    : "https://api.openai.com/v1/images/generations";
  console.log(`→ ${job.id}: calling gpt-image-2 (${job.size}, ${job.quality})${useEdits ? ` with ${job.referenceImages.length} reference image(s)` : ""}...`);

  let res;
  if (useEdits) {
    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("prompt", job.prompt);
    form.append("n", "1");
    form.append("size", job.size);
    form.append("quality", job.quality);
    for (const refPath of job.referenceImages) {
      const abs = path.isAbsolute(refPath) ? refPath : path.join(ROOT, refPath);
      const buf = fs.readFileSync(abs);
      const ext = path.extname(abs).replace(/^\./, "").toLowerCase();
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      form.append("image[]", new Blob([buf], { type: mime }), path.basename(abs));
    }
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: form,
    });
  } else {
    const body = {
      model: "gpt-image-2",
      prompt: job.prompt,
      n: 1,
      size: job.size,
      quality: job.quality,
    };
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gpt-image-2 ${res.status}: ${text.slice(0, 500)}`);
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
