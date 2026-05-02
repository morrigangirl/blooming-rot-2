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
**EXACTLY EIGHT distinct people in this scene — no extras, no background figures, no servants, no clerks. Two NPCs at the table and SIX PCs standing at the table's near end. Render each as listed:**
At the far end of the table:
1. **CAELITH DUNIVAR** seated, leaning over the burned spell focus with one gloved finger touching it. He is the only bearded man in the scene.
2. **TRINA ALVERE** seated beside Caelith, a small porcelain cup of pale tea balanced on one knee, watching the door. Her violet fey-markings should glow faintly on her arm in the chandelier light.
At the table's near end (the side closer to the viewer), standing in a loose group, all just entered:
3. **ALICIA** front-left of the party group — red ponytail, blue tunic with gold piping, golden sword at her hip, tattoo sleeve on left arm. **No sparkles, no glowing motes around her — render her cleanly.**
4. **SELVARA** beside Alicia, hood up — dark red cloak, scar across face with milky pale eye, blue gem pendant.
5. **KITTY** in the party group, the chthonic-tiefling druid — **the two small dark horns curving back from her temples MUST be clearly visible**, ashen-grey skin, pale luminescent eyes, dark braided hair, dark slender tail at her hip. She carries her woven-wood spear.
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
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
Scene: small contract physician's office on a quiet street, late afternoon. The room is cluttered, slightly squalid but professional — an examination cot at right with a thin mattress, shelves of jars and bottled tinctures, a workbench with a brass mortar and pestle, dried herbs hanging from a beam. A small coal stove glows red at one side. Smell-cues in the composition: the bottles, the herbs, ink-stained papers stacked on a tall standing desk.
At the standing desk: RELN POLLOW — a soft anxious man in his mid-forties, balding, ink-stained fingers, an unkempt sandy beard, wearing a stained apothecary's smock over a plain shirt. He holds a slip of paper as if just lifted from the desk; his eyes are on the visitor, not the paper, and he is sweating slightly. His posture suggests a man who has rehearsed an answer he may not be allowed to give.
In the foreground (back of frame): two adventurers, only their shoulders and one extended hand visible, asking a question.
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
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module.
Scene: the working business office of a missing senior grain factor, on a fantasy-medieval merchant street. Mid-morning, gray autumn light through tall mullioned windows. The room is paneled in worn pale oak; one wall holds a tall standing desk with a green leather-bound ledger book open on it; the opposite wall has built-in cabinets full of tied bundles of carbons and bound annual returns. A round table near the windows holds a brass weighing scale and a small handful of grain samples in cloth bags.
At the standing desk: DORIL VETH — a stout middle-aged man in his fifties, plain green wool coat, neat short gray hair, careful clean-shaven features, gold-rimmed reading lenses pushed up onto his forehead. He is turning a page in the ledger and gesturing at a row of entries; his expression is anxious, eager to be helpful, slightly conspiratorial — a clerk who has been waiting for someone to ask the right questions.
Across from him, two adventurers leaning over the ledger to read.
The room feels paused — the missing principal's empty chair behind a separate small desk in the background, neatly pushed in, a folded shawl draped over its back.
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
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure module — quiet emotional set piece.
Scene: a small modest parlor of a schoolmaster's home in a fantasy-medieval residential lane, late afternoon. The room is cozy but austere — a small low hearth with a banked fire, two worn upholstered chairs and a low table, a tall bookshelf packed with school-readers and a handful of personal volumes. A small framed portrait sits on the mantel showing a middle-aged woman and a young woman together at some past celebration.
Seated in one chair at the hearth: VELLIN MORAVEN — a quiet man in his late fifties wearing a plain dark-gray scholar's coat, gray at the temples, drawn features, a small careful posture. He has aged a year in eleven days. In his hand he holds a folded slip of paper. His eyes are on the slip, not on the visitors.
In the chair opposite, an adventurer leans forward (only their shoulders and hands visible — leave the focus on Vellin).
A pot of tea on the low table, a single empty cup beside it.
Late autumn afternoon golden-hour light slants in through a leaded window at left, picking out the picture frame on the mantel.
Mood: heartbreak quietly carried. A man who is asking for help in the only way he can, and is afraid the help will come too late.
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
  console.log(`→ ${job.id}: calling gpt-image-1.5 (${job.size}, ${job.quality})${useEdits ? ` with ${job.referenceImages.length} reference image(s)` : ""}...`);

  let res;
  if (useEdits) {
    const form = new FormData();
    form.append("model", "gpt-image-1.5");
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
      model: "gpt-image-1.5",
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
