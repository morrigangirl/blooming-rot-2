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
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic with gold piping, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands, NOT a weapon at hip), tattoo sleeve on left arm.
- **Selvara** (human Sorcerer) — hooded, dark red cloak, scar across face with one milky pale eye, blue gem pendant, holds a tall wooden staff.
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
- **Alicia** (PC, human Warlock) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, holds a closed book with a colorful artistically stylized cover (her sorcerer-companion's notebook; she is no longer Pact-of-the-Blade), tattoo sleeve on her left arm, pink/lavender glove on right hand.
- **Selvara** (PC, human Sorcerer) — hooded woman in a dark red cloak, scar across her face with one milky pale eye, blue gem pendant, holds a tall wooden staff.
- **Kitty** (PC, chthonic-tiefling Druid) — ashen-grey skinned tiefling, small dark horns curving back from her temples, pale luminescent eyes, dark hair in long braids, dark sigil-veining at the temples, slender dark tail visible at her hip, woven-wood spear, oval shield painted with a lynx face.
- **Gianni** (PC, human Ranger) — dark-haired woman, hair in a thick single braid, fierce dark-lined eyes, leather cuirass over a yellow-cream tunic, quiver of arrows visible at one shoulder.
- **Elle** (PC, halfling Monk) — halfling-sized woman in flowing yellow/saffron robes with a red sash, brown hair, agile build.
- **Cam** (PC, halfling Rogue) — halfling-sized woman, long brown hair, large yellow eyes, brown leather travel clothes.
Scene: the formal civic welcome of the adventuring party on the red-carpeted limestone steps of an ornate guesthouse called the Little Palace, late afternoon, autumn light.
At the top of the steps under a baroque columned portico stands CAELITH DUNIVAR with both hands raised palms-out in a ceremonial gesture, mid-speech.
Halfway down the steps, between Caelith above and the crowd below: ALL SIX PCs of the adventuring party in a loose semicircle, weary from the road, facing a Yeomanry COUNCIL PAGE who hands each of them a small wooden token. **The COUNCIL PAGE is a young human in dark Yeomanry livery (dark coat with green sash) holding a small flat polished wooden tray. On the tray: six round wooden disc tokens the size of a large coin, each pressed with a red wax seal showing the Yeomanry wheatsheaf. The tokens are CLEARLY WOODEN DISCS WITH WAX SEALS — not pastries, not biscuits, not food.** The page holds the tray with both hands at chest height; one PC at a time steps forward to take a token.\nEVERY ONE of the six PCs must be visibly present and distinct, and **none of the PCs is holding the tray** — it is in the council page's hands only:
1. ALICIA front-left, the red-haired warlock holding a CLOSED BOOK with a colorful artistically stylized cover and the tattoo sleeve on her left arm.
2. SELVARA behind Alicia, the hooded sorcerer in the dark red cloak, scar and milky pale eye visible.
3. KITTY in the center back, the chthonic-tiefling druid — the two small dark horns curving back from her temples must be clearly visible above her braided dark hair, dark slender tail at her hip, lynx shield slung on her back.
4. GIANNI to Kitty's right, the dark-haired ranger with the single thick braid and the quiver of arrows.
5. ELLE in the front-center, the halfling monk in flowing yellow/saffron robes with red sash — visibly small (halfling height, head about waist-height of the humans).
6. CAM in the front-right, the halfling rogue with long brown hair, large yellow eyes, brown leather travel clothes — also visibly halfling-sized.
**IMPORTANT: render Alicia cleanly — no floating particles, no glowing sparkles, no swirling motes around her. Her weapon is a slim GOLD METAL RAPIER, not magical-glowing. Treat her as a normal red-haired human warrior, no magical aura.**
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
- **Alicia** (human Warlock) — red-haired woman, high ponytail, blue tunic with gold piping, closed book with a colorful artistically stylized cover (Alicia is now Pact-of-the-Tome rather than Pact-of-the-Blade — show the BOOK, not a weapon), tattoo sleeve on her left arm.
- **Selvara** (human Sorcerer) — hooded woman, dark red cloak, scar across her face with one milky pale eye, blue gem pendant.
Scene: late evening, Caelith Dunivar's wood-paneled second-floor study in a fantasy republic guesthouse. Intimate, conspiratorial atmosphere.
At a heavy dark-oak desk facing the viewer sits CAELITH DUNIVAR. A small framed eighth-century ribbon-and-medallion hangs above the desk. He has just placed a flat brass token on the desk between himself and the visitors — the token shows a quill above a closed gate (the Hand of the Duke insignia). His expression is grave but trusting.
Across from him, in two visitors' chairs: ALICIA leaning forward to look at the token, her closed stylized book held loosely in her hands; SELVARA beside her, hood pushed back slightly, watching Caelith carefully with her one good eye. Both lean in.
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
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic with gold piping, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands, NOT a weapon).
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
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic with gold piping, holding a CLOSED BOOK with a colorful artistically stylized cover (the book is her sorcerer-companion focus, NOT a weapon), tattoo sleeve on left arm.
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
3. **ALICIA** front-left of the party group — red ponytail, blue tunic with gold piping, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands, NOT a weapon at her hip), tattoo sleeve on left arm. **No sparkles, no glowing motes around her — render her cleanly.**
4. **SELVARA** beside Alicia. **Selvara is a HOODED SORCERER, NOT a leather-clad ranger. Do NOT render her as another Gianni.** She wears a heavy DARK RED CLOAK with the HOOD UP framing her face; she does NOT wear leather armor; she does NOT carry a quiver. Her face shows a long thin RED SCAR running across one eye, and that eye is MILKY PALE / blind-looking. A round BLUE GEM PENDANT hangs at her throat. She holds a tall plain wooden staff. **There is exactly ONE Selvara and exactly ONE Gianni — they look completely different. If two characters in your output look like Gianni (both with leather and quiver), you have failed this prompt — one of them is supposed to be the hooded scarred sorceress.**
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
- **Alicia** (human Warlock PC, Trina's mentee) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands, NOT scabbarded at her hip), tattoo sleeve on her left arm.
Scene: a small hidden records alcove behind a paneled door in the library of a fantasy republic guesthouse, mid-morning. Two walls lined floor-to-ceiling with leather-bound civic records — bound charter rolls, ledgers, treasury registers, commercial-marks volumes. A single brass oil lamp on a small reading table provides warm light; the rest of the alcove glows in soft gold.
At the reading table: TRINA ALVERE — one finger flat on a page of an open volume, looking up to comment. Across from her, ALICIA cross-referencing a different bound volume on a small writing slope. There is a quiet mentor-and-student warmth between them; Trina watches Alicia read with the patience of someone who has been waiting for this exact moment of focus. Alicia's closed stylized book sits on the table beside her chair.
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
- **Alicia** (human Warlock PC) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands, NOT a weapon at her hip), tattoo sleeve on her left arm. **Render her clean — no glowing motes, no sparkles, no magical particles. The book is a mundane physical object with a beautiful cover, not magical.**
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
- **Selvara** (human Sorcerer PC) — hooded woman in a dark red cloak, scar across her face with one milky pale eye, blue gem pendant at her throat, holds a tall plain wooden staff. **Selvara is HOODED, NOT in leather kit. Do NOT render her as another Gianni.**
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
- **Alicia** (human Warlock PC) — red-haired woman, hair in a high ponytail, blue tunic with gold piping, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands, NOT a weapon at her hip), tattoo sleeve on her left arm. **No sparkles, no glowing motes around her — render her cleanly.**
- **Cam** (halfling Rogue PC) — halfling-sized woman, long brown hair, large yellow eyes, brown leather travel clothes, brown leather satchel. **Cam is halfling height — her head is about waist-height of the humans; she stands on tiptoe or on a low stool to read at the standing desk.**
Scene: the working business office of a missing senior grain factor, on a fantasy-medieval merchant street. Mid-morning, gray autumn light through tall mullioned windows. The room is paneled in worn pale oak; one wall holds a tall standing desk with a green leather-bound ledger book open on it; the opposite wall has built-in cabinets full of tied bundles of carbons and bound annual returns. A round table near the windows holds a brass weighing scale and a small handful of grain samples in cloth bags.
At the standing desk: DORIL VETH — a stout middle-aged man in his fifties, plain green wool coat, neat short gray hair, careful clean-shaven features, gold-rimmed reading lenses pushed up onto his forehead. He is turning a page in the ledger and gesturing at a row of entries; his expression is anxious, eager to be helpful, slightly conspiratorial — a clerk who has been waiting for someone to ask the right questions.
Standing across the desk from him, leaning forward to read the ledger:
1. **ALICIA** at the desk, one hand braced on the edge, leaning to read the entries Veth is showing her. She holds a closed book with a colorful stylized cover at her side.
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
- **Alicia** (human Warlock) — red-haired, high ponytail, blue tunic, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands, NOT a weapon).
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
- **Alicia** — red-haired, high ponytail, blue tunic, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands), tattoo sleeve on left arm. **No sparkles, no glowing motes around her — render her cleanly.**
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
- **Alicia** (PC) — red-haired ponytail, blue tunic, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands). No sparkles.
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
- **Alicia** (PC) — red ponytail, blue tunic, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands). No sparkles.
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
- **Alicia** (PC) — red ponytail, blue tunic, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands). No sparkles.
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
- **Alicia** (PC) — red ponytail, blue tunic, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands). No sparkles.
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
- **Alicia** (PC) — red ponytail, blue tunic, holding a CLOSED BOOK with a colorful artistically stylized cover (cradled in her hands). No sparkles.
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
- **Alicia** (PC) — red ponytail, blue tunic, closed stylized book **held cradled in both hands at the salon a sash for the salon — she is in semi-formal mode**. No sparkles.
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

NO grid lines on the map. Painted plank floors in the common room, slate in the kitchen, threadbare patterned rug under the central tables. Warm lamp-lit atmosphere implied by the palette (amber, dark brown, deep red). NO text labels — annotations will be added in Foundry.`,
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

NO grid lines on the map. Use a warm muted palette of dark walnut, brass, deep red rugs, and ivory plaster. Polished wood floors. No words or letters anywhere. Painted, not vector.${DOOR_RULES}`,
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

NO grid lines on the map. Color palette: rough plank floor, dust and grime, dim amber light implied by a single guttering lantern hung from a ceiling beam (visible as a small bright spot). Cluttered, broken, abandoned — clearly not in active use. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: pale stone walls, terracotta roof on the house, green of the garden, gravel of the carriage drive in warm tan. Atmosphere: prosperous but isolated, deliberately private. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: warm honey-toned wood throughout, brass lamp fittings, oxblood leather chair. Atmosphere: precise, ordered, professionally calm. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: warm wood floors, plastered walls in cream and ochre, oxblood and dark green soft furnishings, brass lamp fittings. Atmosphere: prosperous, lived-in, hospitable. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: cool stone, marble floors, dark walnut shelving, brass lamp fittings, civic gravity. Atmosphere: hushed, official, ordered. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: dark walnut paneling on the lower walls, cream plaster above, brass lamp fittings, deep red runner along the customer floor. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: dark wood floor, smoke-grey plaster walls, brass desk fittings, deep oxblood leather chairs. Atmosphere: senior civic functionary's working room — restrained, austere, lived-in. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: light wood floors, plain cream plaster walls, modest soft furnishings in faded green and brown. Atmosphere: a quiet, private home, not wealthy but cared for. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: warm honey-toned wood floors, dark walnut paneling, brass lamp fittings, oxblood leather chairs, soft Aerdy sunlight implied through south windows. Atmosphere: senior commercial officer's stronghold — formal, comfortable, observant. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Use a palette of pale marble, dark polished wood, brass, and deep red drapery. No words or letters anywhere on the map. Painted, not vector.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: pale plastered walls, terracotta tile floor, restrained Aerdi villa decoration in muted greens and gold, dark walnut beds and dressers. Atmosphere: comfortable but not lavish. NO text labels.${DOOR_RULES}`,
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

NO grid lines on the map. Palette: damp stone in cool blue-grey, packed-earth floor in warm tan, the warm amber glow of a single lantern in the watchman's room. Atmosphere: quiet, cold, lived-in only at the vintner's office. NO text labels.${DOOR_RULES}`,
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

  // ============== TIER 17 — Phase 5 portraits, scenes, handouts, P4 re-rolls ==============
  // Portraits (7)
  {
    id: "p5-ostren-pell-portrait",
    tier: 17,
    out: "assets/portraits/ostren-pell-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of OSTREN PELL, a Loftwick civic clerk in his early thirties, the leak in Caelith Dunivar's correspondence office.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Yeomanry, fair-skinned, thin build, prematurely receding sandy-brown hair worn slightly long at the back to compensate. Ink-stained fingertips visible on his right hand. Wears a respectable but worn brown clerk's coat with a small enameled Audit Hall pin (silver wheatsheaf on a dark-green field) at the collar. The collar is set noticeably higher than the next person's would be — a thin further layer of privacy. He looks tired in a way that has been tired for two years.
He stands at a small writing desk in a quiet wood-paneled office; a folded letter is in his left hand, his right hand resting flat on the desk over a closed correspondence-cabinet drawer. Late-afternoon light falls from a window behind him. He has just looked up; his expression is the small frozen attentiveness of a man who is afraid he will be asked a specific question. There is no aggression in him.
Three-quarter view from waist up. Background: dark wood paneling, a wall of pigeonhole shelves with rolled correspondence visible in some, a small candlestick burning on the desk.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p5-aldea-veren-portrait",
    tier: 17,
    out: "assets/portraits/aldea-veren-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MISTRESS ALDEA VEREN, a half-elven retired scholar of pre-Aerdy paleography and sealing materials, who looks late forties but is older.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Half-elven. Fair skin with a faint warm olive cast. Dark-hazel hair worn loose to the shoulders, lightly streaked with silver at the temples. Slightly elongated ear-tips, subtle but visible. Plain grey wool dress, a heavy dark-brown leather apron worn over it (workshop-stained, well-cared-for). Reading lenses on a fine silver cord around her neck, currently pushed up onto her forehead. A small dark silver ring on her left hand bearing a worn device that may once have been a scroll-and-quill.
She stands at a stone workbench in her cottage workshop. The workbench is covered with an array of small wax samples, a folded vellum document, an iron-gall inkpot, two thin reading lenses on small brass stands, and a pale candle burning in a stoneware holder. A great horned owl is visible perched on a beam in the upper background, watchful but unbothered. A brindle dog is sleeping at her feet, only the back of its head visible.
Three-quarter view from waist up; her hands are over the workbench, holding one of the wax samples between two fingers, examining it. Her expression is composed and slightly distant — the face of someone listening to what an object is telling her.
Atmosphere: warm woodsmoke, golden afternoon light through a small western window, the slightly fey sense that the room is more attentive than rooms usually are. NO floating particles, NO glowing magic effects — the fey-tinge is in the stillness, not in light show.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p5-ortwell-brane-portrait",
    tier: 17,
    out: "assets/portraits/ortwell-brane-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of COUNCILMAN ORTWELL BRANE, a Loftwick Yeomanry civic functionary in his mid-fifties, the principled architect of the Civic Reconciliation Closure motion.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Yeomanry, fair-skinned, tall, clean-shaven, iron-grey hair worn short. Hands that have done office work for thirty years and field work before that — visible knuckles, broad palms. Plain dark Yeomanry councilor's coat (heavy wool, dark grey-green, high collar, brass buttons) with the small bronze wheatsheaf pin of seated office at the lapel. No other ornament.
He stands at the base of the steps of the Loftwick Council Chamber, a folded copy of the Closure motion held loosely in his right hand. The light is mid-afternoon, falling across the pale limestone of the Civic Way. His expression is careful and a little weary; he is not happy with the position he is in but he believes he has chosen it correctly. His eyes are direct.
Three-quarter view from waist up. Background: the pale limestone of the Council Chamber's outer wall, a small group of out-of-focus clerks in the middle distance, the long shadow of the Chamber's portico falling across the steps.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p5-edda-halvern-portrait",
    tier: 17,
    out: "assets/portraits/edda-halvern-portrait.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Bust portrait of COUNCILOR EDDA HALVERN, a Loftwick Yeomanry councilor in her mid-sixties, widow of a militia officer, formerly the southern districts' militia paymaster.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Yeomanry, weathered fair skin, short build (shoulders square in the frame), iron-grey hair worn under a plain widow's cap (dark wool, no embellishment except a small pewter pin in the shape of the southern-district arms). Plain dark wool dress, militia-paymaster boots that have outlasted their original use just visible in the lower frame. Strong jaw, pursed mouth, calm grey eyes that look at the viewer directly and assessingly.
She is photographed (painted) in a small council antechamber, a stack of paymaster ledgers visible on a side table behind her right shoulder. She has just turned her head to acknowledge the viewer; one hand rests on the corner of the ledger stack, the other at her side.
Bust view from upper chest up. Background: dark wood paneling, dim warm interior light from a window not in shot.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p5-mairra-voss-portrait",
    tier: 17,
    out: "assets/portraits/mairra-voss-portrait.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Bust portrait of COUNCILOR MAIRRA VOSS, a Loftwick Yeomanry councilor in her late fifties, formerly a trade-clearing notary in Loftwick.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Yeomanry, fair-skinned, sandy hair gone mostly grey and worn in a single thick braid down her back (a portion visible over her left shoulder). Reading lenses on a black silk cord around her neck, currently down on her chest. Dark wool councilor's coat over a notary's high-collared cream linen shirt. A small silver scale-and-scroll badge at her throat — her old notarial seal of office. Composed, intelligent, slightly skeptical expression. Eyes that read documents for a living.
She is photographed (painted) in a small private library, a wall of bound ledger volumes visible behind her in soft focus. One hand rests on the spine of an open volume on a small reading stand to her side.
Bust view from upper chest up. Background: warm walnut bookshelves, a single brass reading lamp providing warm light from the right.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p5-marshal-rennic-thale-portrait",
    tier: 17,
    out: "assets/portraits/marshal-rennic-thale-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MARSHAL RENNIC THALE, a Loftwick Yeomanry militia commander in his late forties.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Yeomanry, weathered fair skin, broad-shouldered, dark-blond hair cropped short with a clearly visible white scar along the hairline above his left ear (an old head wound). Clean-shaven. Plain Yeomanry militia coat (heavy dark-blue wool with bronze buttons) over a chain hauberk visible at the collar and cuffs. The marshal's bronze gorget at his throat — polished but unornamented. Carries a heavy clasp-knife on his belt and a longsword scabbarded across his back, the hilt visible over his right shoulder.
He stands at the entrance to the Loftwick city barracks, his hands clasped loosely behind his back. The light is early-morning, falling from his right. His expression is the level professional attention of a career officer who has decided you are worth listening to but has not yet decided you are worth helping.
Three-quarter view from waist up. Background: pale limestone barracks wall, a small Yeomanry standard hanging slack from a flagstaff in the middle distance, two militia troopers in plain coats moving past in soft focus.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "p5-vesten-quill-portrait",
    tier: 17,
    out: "assets/portraits/vesten-quill-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of VESTEN QUILL, a courier handler in his late thirties operating in Loftwick under the cover identity of a quiet northern lawyer.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Lean, sharp-faced. Pale skin, dark hair worn short and combed flat, a thin dark beard outlining the jaw. Soft mouth, hard eyes. Wears a dark-grey northern lawyer's coat (long, plain, well-cut, the kind of coat a lawyer wears who does not want to be remembered). A thin silver chain around his neck disappears into his collar — at the end is a small whistle (not visible in the portrait but inferred). Hands resting open on the arms of a writing chair; a scimitar's hilt visible in a scabbard leaning against the chair's right side.
He sits at a small writing desk in a sparsely-furnished rented room above a printer's shop. The room is lit by a single brazier on the floor to his left and a single tallow candle on the desk. A folded packet sits on the desk in front of him, unopened. He has just looked up at the viewer.
Three-quarter view from waist up. Background: bare wooden walls, a narrow shuttered window behind him with the dark beyond it, the faint smell of printer's ink implied by the orange-tinged candlelight.
${ART_STYLE}`,
    postProcess: null,
  },
  // Scene illustrations (5)
  {
    id: "p5-civic-office-guarded",
    tier: 17,
    out: "assets/illustrations/p5-civic-office-guarded.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: ["assets/portraits/Caelith-Dunivar-Portrait.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

INTERIOR scene. The Civic Office of the Little Palace in Loftwick. Late afternoon, warm honey light slanting through a single tall narrow window on the right wall. Heavy dark-oak desk, two visitor chairs facing it (currently empty), a small private hearth glowing low, a wall of locked correspondence drawers behind the desk, a small bookshelf of bound case files. A brass quill-pin's outline visible on the desk in faint dust where it usually rests.

THE FIGURE in the room (1):
- CAELITH DUNIVAR (reference image provided): late fifties Yeomanry man, tall, lean, gray hair worn short, dark wool civic dress with the BRASS QUILL PIN MISSING from his lapel collar. He is standing at the desk, one hand on its edge, the other holding a single folded sheet. He is looking past the viewer toward the door (which is barred from inside — the iron bar visible across the doorway in the foreground). His expression is composed and tired. The room is quieter than it should be.

Composition: cinematic, the desk and Caelith occupying the right two-thirds of the frame, the barred door at the left foreground. Painterly digital fantasy illustration. Warm tonally cohesive palette: dark walnut, brass, honey light, the cool steel of the door bar. NO text or labels visible. The militia at the door (outside the frame) implied by a single dark figure visible through the door's small barred grille.`,
    postProcess: null,
  },
  {
    id: "p5-debrief-table",
    tier: 17,
    out: "assets/illustrations/p5-debrief-table.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: ["assets/portraits/Caelith-Dunivar-Portrait.png", "assets/portraits/party/Cam-Halfling-Rogue.png", "assets/portraits/party/kitty-druid-cthonic-tiefling.png", "assets/portraits/party/alicia-warlock-blade.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

INTERIOR scene. The Strong Room of the Little Palace, mid-morning Day 2 of Phase 5. A long oak table in the center of the room, with three sets of papers laid out on linen squares: the party's Rel Astra evidence (left), Caelith's own files (center), and a still-sealed packet with WOODLAND-GREY WAX (right, distinct, unopened, with a thin silver-grey wax cord tied around it). Bread, cheese, and a small pewter pitcher of ale on the table's far end.

CHARACTERS (4):
- CAELITH DUNIVAR (reference image #1) at one end of the table, seated, taking notes on a single page in a precise hand. Late fifties, lean, gray hair, dark wool civic dress, the brass quill pin still missing from his lapel. He is listening, not speaking.
- CAM (reference image #2): the party's HALFLING ROGUE, at the long left side of the table, half-standing on a tall chair to see the papers, leather travel-clothes, a small Yeomanry-style courier satchel at his hip, gesturing at one of the documents while speaking. CRITICAL: Cam is a HALFLING — short, three-and-a-half feet tall, with halfling proportions. If Cam looks like a tall human, you have failed this prompt.
- KITTY (reference image #3): the party's CHTHONIC TIEFLING DRUID, seated on a long bench across the table from Cam. CRITICAL: Kitty is a chthonic tiefling. She has clearly visible HORNS curving back from her temples, ASHEN-GREY skin, a long TAIL visible behind her, and faint dark SIGIL-VEINING at her temples and along her forearms. She wears a dark druid's robe and a circlet of dark wood. She is leaning forward, examining the wax on the still-sealed Trina packet. If Kitty looks like a normal dark-haired human, you have failed this prompt.
- ALICIA (reference image #4): the party's WARLOCK with a blade pact, standing behind Cam's chair, one hand on the chair's back. She is reading the document Cam is gesturing at. Render Alicia cleanly — no floating particles, no glowing sparkles, no swirling motes around her. Her weapon is a slim GOLD METAL RAPIER, scabbarded at her hip, not magical-glowing.

Composition: cinematic wide shot, the table running diagonally across the frame, Caelith on the right, Kitty on the left, Cam mid-frame, Alicia behind Cam. The unopened Trina packet is the visual focus, its woodland-grey wax distinct from the warmer browns of the rest of the room. Warm honey lamplight from above, soft cool morning light from a high window on the back wall. Painterly digital fantasy illustration. NO text or labels visible.`,
    postProcess: null,
  },
  {
    id: "p5-aldea-cottage",
    tier: 17,
    out: "assets/illustrations/p5-aldea-cottage.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: ["assets/portraits/aldea-veren-portrait.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

EXTERIOR / INTERIOR transitional scene at dusk. A small stone cottage in a sheltered fold of the Stark Mounds foothills, surrounded by scrubby beech and silver birch. A workshop adjoins the cottage on the south side, its single tall window glowing warm gold from within. A small herb garden behind the cottage; a slow stream below it running clear, catching the last light. A stone path winds from the visible foreground to the cottage door.

THE FIGURE (1):
- MISTRESS ALDEA VEREN (reference image): half-elven, looks late forties, dark-hazel hair to the shoulders streaked with silver, plain grey wool dress, dark-brown leather apron, reading lenses pushed up on her forehead. She stands at the workshop window from the inside, framed by it, examining a folded vellum sample by candlelight. Her face is in three-quarter view, attentive, slightly distant. She has just noticed the viewer's approach.

ENVIRONMENT details:
- A small gathering of three or four small birds on the windowsill, unbothered by Aldea's movement.
- A great horned owl visible on the workshop roof.
- A brindle dog at the door of the cottage, looking up the path toward the viewer with calm interest, not barking.
- A bundle of correspondence visible on her worktable inside, faintly silhouetted by the candle.

Composition: wide cinematic landscape shot. The cottage and workshop occupy the right two-thirds of the frame; the path and a silhouette of beech in the foreground occupy the left. Aldea is a small bright figure framed by the workshop window. Atmosphere: woodsmoke, last light, profound quiet. NO floating sparkles or magical particles — the fey-tinge is in the stillness and the unbothered animals. Cool blue-violet sky, warm gold from the window. Painterly digital fantasy illustration. NO text or labels visible.`,
    postProcess: null,
  },
  {
    id: "p5-greyhawk-sighting",
    tier: 17,
    out: "assets/illustrations/p5-greyhawk-sighting.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

EXTERIOR scene. The door of a small Foreign Quarter counting-house in Greyhawk City called THE BRASS CROW. Late afternoon. Cobbled street wet from a recent rain. The counting-house door is brass-bound oak, with a small brass figure of a crow above the lintel. The lane is narrow and the buildings on either side lean inward; the light is a wedge of late sun coming through the gap.

CHARACTERS (2 visible to viewer; the witness POV is the camera):
- HASKUR VANDRELL, a man in his fifties, in worn Aerdy travel clothes — long dark wool coat, weathered boots, no visible weapon, a satchel over one shoulder. He is dark-haired, going to grey at the temples, clean-shaven. His face is in three-quarter view. He is not the focus of the conversation; he is leaning slightly to listen to the younger man.
- THE YOUNGER MAN, in his mid-twenties, in unfamiliar GREY-AND-BONE travelling clothes (a long grey cloak with bone-colored trim, dark trousers, soft boots). His skin is fair but not Aerdy or Yeomanry in cast (slightly grey-toned, hard to place). His hair is silver-pale, worn to the shoulders. His eyes are pale. His face is in profile to the viewer; he is the one speaking. His gait, even at rest, is subtly wrong — the way he stands is balanced on the balls of his feet, with a slight forward lean that is not the lean of a man who has been on the road for weeks.

WITNESS POV: across the street, framed by the doorway of a baker's shop on the opposite side, a small loaf of bread on a sill in the foreground. The sense is one of being unobserved.

Composition: cinematic, the two figures center-frame at the counting-house door, the foreground baker's-shop doorway dark and slightly out-of-focus, the wet cobbles reflecting the wedge of late sun. Warm late-afternoon palette: oxblood for Haskur, cool grey-and-bone for the younger man, the gold of the brass crow above the lintel as a strong accent. Painterly digital fantasy illustration. NO text or labels visible (the &quot;BRASS CROW&quot; sign is implied but blurred / not legible).`,
    postProcess: null,
  },
  {
    id: "p5-courier-dead-drop",
    tier: 17,
    out: "assets/illustrations/p5-courier-dead-drop.png",
    size: "1024x1536",
    quality: "high",
    referenceImages: ["assets/portraits/party/Cam-Halfling-Rogue.png", "assets/portraits/party/kitty-druid-cthonic-tiefling.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

INTERIOR scene. The civic copy room behind the Audit Hall annex, very late at night. A small windowless workroom with a low ceiling, a long oak copy-desk along one wall, ink-pots and quills neatly racked, ledger-binder's tools on a side table. The far wall is unrendered stone, original to the building, with a regular pattern of bricks. Third from the bottom, fourth from the left, ONE BRICK is slightly different — its mortar is shadow-thin and the brick face is slightly rough where it has been removed and replaced many times. A single hooded lantern set on the copy-desk is the only light source.

CHARACTERS (2):
- CAM (reference image #1): the party's HALFLING ROGUE, crouched at the brick wall with the brick removed, in the act of extracting a small folded paper packet from the cavity behind it. CRITICAL: Cam is a HALFLING — short, three-and-a-half feet tall, with halfling proportions. He is in dark leather, his courier satchel set down beside him on the floor. His expression is concentrated. If Cam looks like a tall human, you have failed this prompt.
- KITTY (reference image #2): the party's CHTHONIC TIEFLING DRUID, standing watch at the doorway behind Cam, half-turned to listen for footsteps in the corridor outside. CRITICAL: Kitty is a chthonic tiefling. She has HORNS curving back from her temples, ASHEN-GREY skin, a TAIL visible behind her, and dark SIGIL-VEINING faintly visible at her temples in the lantern-light. She wears a dark druid's traveling cloak. If Kitty looks like a normal dark-haired human, you have failed this prompt.

ENVIRONMENT details:
- Faint fingerprint dust visible on the brick edge — the kind of detail that says &quot;rogue's tool kit recently used.&quot;
- The hooded lantern casting strong directional light, with deep shadows in the corners.
- A small open ledger on the copy-desk in the foreground, the page caught mid-copy.

Composition: vertical portrait orientation, Cam crouched in the lower-right at the brick, Kitty standing in the upper-left at the doorway, the lantern providing the light source from the right. Cool dark palette overall — deep blues and shadow — with a single warm pool of amber from the lantern. Painterly digital fantasy illustration. NO text or labels visible.`,
    postProcess: null,
  },
  // Handouts (6)
  {
    id: "p5-caelith-memorandum-handout",
    tier: 17,
    out: "assets/handouts/p5-caelith-memorandum.png",
    size: "1024x1536",
    quality: "high",
    prompt: `${HANDOUT_STYLE}

A half-page parchment memorandum in Caelith Dunivar's hand. Light parchment color, dark iron-gall ink. Title at the top reading "DEBRIEF — DAY TWO" in a precise hand, with a small line beneath. Below the title, four short numbered sections, each three to four lines. The text reads (transcribe legibly, using period-correct script):

"1. The Closure motion. Brane has the votes for the binding ballot on the ninth day from this. Office under Council review until then.
2. The leak. Pell. Sister Sera. Held in place. Channel still open.
3. Trina's correspondent. Packet opened in your presence. Three observations recorded. See: Aldea's reply.
4. Vandrell. Brass Crow, Greyhawk City, five days ago. Younger man. Gait not Aerdi, not Yeomanry. Trail cooling."

A small initial signature at the bottom: "— C." in the same hand. A faint thumb-smudge of ink at the lower-left corner. No decorative borders. Slight wear at the folds. Photographed straight-on under soft warm light against a plain dark wood surface.`,
    postProcess: null,
  },
  {
    id: "p5-aldea-reply-handout",
    tier: 17,
    out: "assets/handouts/p5-aldea-reply.png",
    size: "1024x1536",
    quality: "high",
    prompt: `${HANDOUT_STYLE}

A full-page parchment letter in a measured, slightly antique hand (Mistress Aldea Veren's). Aged vellum, slightly yellowed at the edges, dark iron-gall ink. The text reads (transcribe legibly, period-correct paleography style with subtle elven inflection on certain letterforms):

"To Mistress Trina Alvere, by the courier she trusts.

I have read what you sent me. I will tell you what I saw, in the order I saw it.

THE WAX. The wax on your samples matches no recipe in my reference set — Aerdy, Rel Astran, Keoish, or Yeomanry, current or historical. It is harder than any I know, with a higher beeswax-to-resin ratio than any surface manufactory I have documented. This wax was made somewhere I have not seen, by a process I have not read.

THE HAND. The letter forms are consistent with surface court scripts. The underlying stroke order is not. Where one is taught to begin certain ascenders with an upward pull, this writer begins with a downward push and corrects on the upstroke. This is a hand trained by reading court scripts, not by being taught them. The teacher and the student were not in the same room.

THE GEOGRAPHY. The earliest dated marginalia (Hardby, Lent 1574) was placed on Rel Astran-milled paper of autumn 1573, sealed with the wax above. I have cross-referenced every relevant departure register. The writer was not in any port any of us has ever sailed at the time this annotation was placed. I will not speculate further.

I am yours in old correspondence,
— A."

A small woodland-grey wax seal at the bottom, broken cleanly. The letter has been folded twice; the fold lines are visible. Slight foxing at the edges. Photographed straight-on under soft warm light against a plain dark wood surface. No decorative borders.`,
    postProcess: null,
  },
  {
    id: "p5-false-packet-menu-handout",
    tier: 17,
    out: "assets/handouts/p5-false-packet-menu.png",
    size: "1024x1536",
    quality: "high",
    prompt: `${HANDOUT_STYLE}

A clean parchment "choice card" in Caelith Dunivar's hand. Cream parchment, dark iron-gall ink. Title at the top reading "FALSE-PACKET MENU — CHOOSE ONE" in a precise hand. Below the title, five short numbered sections separated by thin horizontal lines. Each section has the lie in slightly larger text and the consequence in smaller subtext.

The text reads (transcribe legibly):

"1. 'Haskur is in Rel Astra.' — Conspiracy redirects east. Greyhawk pursuit eased.
2. 'The party is pursuing the wood correspondent.' — Aldea is endangered. Time bought elsewhere. (DO NOT use if Vector B is intended.)
3. 'The party has no usable evidence from Sereth.' — Conspiracy de-prioritises us. Witnesses become more accessible.
4. 'The party intends to expose Galenix Naelax.' — Naelax embassy briefly active. (Niche; betrayal of any prior briefing.)
5. 'The party is returning to Hardby.' — Loftwick observation thins for 4–6 days. Window for counter-leak."

At the bottom, a single line in smaller hand: "Choose one. I will write the packet." Initial signature: "— C." A faint X-mark column down the right side of the choices, blank — for the player to mark their choice. No decorative borders. Slight wear at the folds. Photographed straight-on under soft warm light against a plain dark wood surface.`,
    postProcess: null,
  },
  {
    id: "p5-greyhawk-affidavit-handout",
    tier: 17,
    out: "assets/handouts/p5-greyhawk-affidavit.png",
    size: "1024x1536",
    quality: "high",
    prompt: `${HANDOUT_STYLE}

A full-page parchment witness affidavit, in a strong simple military hand (Tellan Verth's, retired Yeomanry militia sergeant). Dated five days before the party's return to Loftwick. Parchment color slightly cooler than the others; dark iron-gall ink. The text reads (transcribe legibly):

"AFFIDAVIT OF TELLAN VERTH
Late of the Yeomanry Militia, southern districts. Resident at the Foreign Quarter, Greyhawk City.

I do hereby witness, on my oath:

That on the date 17th of Coldeven, in the year of the campaign now closing, at approximately the eleventh bell of morning, in the lane known as Tinker's Way in the Foreign Quarter of Greyhawk City, I observed the man known to me as HASKUR VANDRELL, lately of the Vandrell matter and presumed by the Yeomanry to be at large.

He was at the door of the counting-house called The Brass Crow.

He was in conversation with a younger man whom I did not recognize. The younger man was perhaps twenty-five years of age, of medium height, fair of skin but not Aerdi or Yeomanry in cast, with silver-pale hair worn to the shoulders. He wore travelling clothes of grey-and-bone colour I have not seen before.

The younger man's gait, even at rest, was not Aerdi and not Yeomanry. I cannot say more precisely. I was a militia sergeant for twenty-two years and I trust this observation.

The two men entered The Brass Crow together. I did not follow.

I attest the foregoing on my oath, this date.

— Tellan Verth, Sergt. (rtd.), 22nd Foot"

A small smudged official seal at the bottom right. The parchment has been folded twice; the fold lines are visible. Slight wear at the right edge. Photographed straight-on under soft warm light against a plain dark wood surface. No decorative borders.`,
    postProcess: null,
  },
  {
    id: "p5-closure-motion-handout",
    tier: 17,
    out: "assets/handouts/p5-closure-motion.png",
    size: "1024x1536",
    quality: "high",
    prompt: `${HANDOUT_STYLE}

A full-page CIVIC DOCUMENT in formal Yeomanry council hand. Heavier paper than the parchments above (a more rigid civic-register stock), dark formal ink, with a small Council seal at the upper right. Title at the top reading "MOTION OF CIVIC RECONCILIATION CLOSURE — YEAR'S CLOSE" in a careful clerical hand, slightly larger than the body.

The text reads (transcribe legibly, formal civic register):

"BE IT KNOWN to the Council Chamber of the Yeomanry, sitting in regular session at Loftwick, that the following motion has been entered into the public record by Councilman ORTWELL BRANE, with co-sponsorship of Councilor EDDA HALVERN, on this day, and shall stand for binding vote at the conclusion of the mandatory fourteen-day review period:

I. The matter of the Vandrell investigation, having occupied the Audit Hall and the Hand of the Duke since the year past, and having yielded such material as the Audit Hall now holds and shall continue to hold for the historical record, is hereby DECLARED RESOLVED for civic purposes, and the formal correspondence powers of the Hand of the Duke pertaining to it are SUSPENDED.

II. The Audit Hall's foreign-inquiry budget, being eight thousand gold pieces annually, is hereby REDIRECTED: five thousand to the southern district militia paymaster's account, and three thousand returned to the general civic fund.

III. All correspondence, files, and working papers held by the Hand of the Duke pertaining to the above matter shall be SUBJECT TO COUNCIL REVIEW upon written request of any sitting councilor.

IV. This motion shall not bar private inquiry by individuals not employed in civic capacity, but shall withdraw all civic resources, sanction, and authority from any further pursuit of the matter.

So moved.

— Ortwell Brane, Councilman
— Edda Halvern, Councilor (co-sponsor)"

The Council seal is visible at the upper right — a small wheatsheaf within a circle. Slight wear at the corners. Photographed straight-on under soft warm light against a plain dark wood surface. No decorative borders.`,
    postProcess: null,
  },
  {
    id: "p5-courier-receipt-handout",
    tier: 17,
    out: "assets/handouts/p5-courier-receipt.png",
    size: "1024x1024",
    quality: "high",
    prompt: `${HANDOUT_STYLE}

A small folded courier receipt — about a third the size of a standard handout sheet — in a quick informal hand. Cheap rough paper, dark ink, slightly creased from being folded into a lead pipe. Three lines of text only, very brief:

"17 Coldeven.
3 pp.
— V."

That is the entire visible content. The receipt is small, square-ish, with one rough edge where it has been torn from a larger sheet. A small dark wax mark in the corner — not a true seal, just a thumbprint of dark candle-wax used to seal the fold. The paper has the slightly damp curl of paper that has been inside a lead pipe.

Photographed straight-on under soft warm light against a plain dark wood surface. No decorative borders. The receipt should look insignificant and yet, on close reading, completely damning.`,
    postProcess: null,
  },
  // Phase 4 illustration re-rolls (4) — party emphasis with Cam and Kitty
  {
    id: "p4-sereth-office-reroll",
    tier: 17,
    out: "assets/illustrations/p4-sereth-office.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: ["assets/portraits/sereth-portrait.png", "assets/portraits/party/Cam-Halfling-Rogue.png", "assets/portraits/party/kitty-druid-cthonic-tiefling.png", "assets/portraits/party/alicia-warlock-blade.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

INTERIOR scene. Tarlith Vhal Sereth's third-floor private working office at the Cindren & Vhal Rel Astra counting house. Late afternoon, warm honey light slanting in through tall narrow windows on the right. Heavy oak desk, two visitor chairs facing it, a small private hearth glowing low, a wall of locked correspondence drawers behind the desk. The firm's seal-press on a side table. A four-volume set of leather-bound books (the CODEX MERCATUM) on a small shelf.

CHARACTERS in the room (5 total):
- TARLITH VHAL SERETH (reference image #1) at the desk: late fifties Aerdy man, tall, very thin, silver-white long hair tied back, clipped silver beard, dark-grey advocate's overcoat, heavy silver firm-seal ring. He is composed; one hand rests open on the desk, the other holds a single folded sheet of parchment. He is the still center of the composition, but he is no longer the focus.
- CAM (reference image #2): the party's HALFLING ROGUE, FRONT AND CENTER at the desk, standing on a small chair pulled up to the desk's edge so he can see the documents. He is in dark leather travel-clothes with a Yeomanry-style courier satchel at his hip; he is laying out the indictment package on the desk — a bound notarial opinion and several loose documents — with both hands. CRITICAL: Cam is a HALFLING — short, three-and-a-half feet tall, with halfling proportions. If Cam looks like a tall human, you have failed this prompt.
- KITTY (reference image #3): the party's CHTHONIC TIEFLING DRUID, standing at Cam's right shoulder, also front-and-center, watching Sereth's face for any reaction. CRITICAL: Kitty is a chthonic tiefling. She has clearly visible HORNS curving back from her temples, ASHEN-GREY skin, a long TAIL visible behind her, and faint dark SIGIL-VEINING at her temples and along her forearms. She wears a dark druid's robe and a circlet of dark wood. If Kitty looks like a normal dark-haired human, you have failed this prompt.
- ALICIA (reference image #4): the party's WARLOCK with a blade pact, mid-ground behind Cam and Kitty, watching the door. Render Alicia cleanly — no floating particles, no glowing sparkles, no swirling motes around her. Her weapon is a slim GOLD METAL RAPIER, scabbarded at her hip, not magical-glowing.
- TWO BODYGUARDS standing flat against the south wall behind Sereth, dressed in plain dark Aerdy household livery, swords scabbarded but visible, hands folded; they are watchful, not aggressive. (Render as two indistinct figures; they are background.)

Composition: cinematic, the desk and Sereth occupying the right-third of the frame, Cam and Kitty front-and-center at the desk's foreground edge, Alicia mid-ground, the bodyguards at the back wall. Painterly digital fantasy illustration. Warm tonally cohesive palette: deep browns and walnut, brass and gold, the cool steel of guard mail, the dark grey of Sereth's coat. NO text or labels visible.`,
    postProcess: null,
  },
  {
    id: "p4-brass-sextant-reroll",
    tier: 17,
    out: "assets/illustrations/p4-brass-sextant.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: ["assets/portraits/halask-portrait.png", "assets/portraits/party/Cam-Halfling-Rogue.png", "assets/portraits/party/kitty-druid-cthonic-tiefling.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

INTERIOR scene. The Brass Sextant coffee-house on the third quay of Rel Astra. Morning. Warm Aerdy sunlight pouring through tall arched windows, a slice of harbor and ship masts visible in the right window. Marble cafe tables, brass fittings, high ceilings, plastered walls hung with a few framed sea charts.

CHARACTERS (3):
- THERION HALASK (reference image #1) at his usual table by the window: Aerdy man in his mid-sixties, dark-skinned, white close-cropped hair, pale linen advocate's robe with a faded purple-and-gold sash, reading lenses pushed up on his forehead, a small cup of dark coffee at his elbow. He is taking a folded letter from CAM with one hand, his expression attentive and unhurried.
- CAM (reference image #2): the party's HALFLING ROGUE, standing at Halask's table, handing CAELITH'S LETTER OF INTRODUCTION across the table to Halask with both hands. He is in clean travel-clothes (linen shirt, leather vest, his courier satchel at his hip). CRITICAL: Cam is a HALFLING — short, three-and-a-half feet tall, with halfling proportions. He has to reach up slightly to lay the letter on the table from his side. If Cam looks like a tall human, you have failed this prompt.
- KITTY (reference image #3): the party's CHTHONIC TIEFLING DRUID, seated on a low chair at the table beside Cam, drinking from a small cup of dark coffee with both hands cupped around it. She is watching Halask's face for his reaction. CRITICAL: Kitty is a chthonic tiefling. She has HORNS curving back from her temples, ASHEN-GREY skin, a TAIL visible curled around the chair leg, and faint dark SIGIL-VEINING at her temples. She wears a dark druid's traveling robe. If Kitty looks like a normal dark-haired human, you have failed this prompt.

INCIDENTAL: the cafe proprietor visible in the background behind a brass coffee-bar, polishing a cup. He is mostly out of focus.

Composition: Halask in the right-center of the frame at his table, Cam standing at the table's left edge handing the letter, Kitty seated to Cam's right with her coffee. Warm morning palette: cream, gold, soft Aerdy sunlight, brass, the deep green of a single potted lemon tree near the window. Painterly digital fantasy illustration. NO text or labels visible.`,
    postProcess: null,
  },
  {
    id: "p4-naelax-embassy-reroll",
    tier: 17,
    out: "assets/illustrations/p4-naelax-embassy.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: ["assets/portraits/galenix-portrait.png", "assets/portraits/party/Cam-Halfling-Rogue.png", "assets/portraits/party/kitty-druid-cthonic-tiefling.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

INTERIOR scene. The long quiet gallery of the Naelax embassy in Rel Astra. Late afternoon. Tall narrow windows on the left show the embassy's walled garden and the Aerdy sky beyond. A stone floor inlaid with a faded geometric Naelax pattern. A single long old tapestry on the right wall depicts a Naelax house hunt — dark greens and gold. Two heavy carved chairs and a small marble side table set out for the audience. A single tall candle on the side table, burning straight, the flame perfectly still.

CHARACTERS (3):
- LORD GALENIX NAELAX (reference image #1) standing near the windows: tall, mid-thirties Aerdy noble, fair-skinned for an Aerdy, dark hair to the shoulders, well-trimmed dark beard, dark Naelax house colors (bottle-green and black, restrained cut), the Naelax house ring on his left hand. He has set down a leather-bound book on the side table. His expression is attentive and a touch wary; this is his first private audience in months.
- CAM (reference image #2): the party's HALFLING ROGUE, seated in one of the carved chairs, presenting an open folder of the indictment package to Galenix across the small table. He is in good Yeomanry traveling clothes — a clean linen shirt, leather vest, modest formal pin at his collar. CRITICAL: Cam is a HALFLING — short, three-and-a-half feet tall, with halfling proportions. The chair is too large for him; his feet do not touch the floor. If Cam looks like a tall human, you have failed this prompt.
- KITTY (reference image #3): the party's CHTHONIC TIEFLING DRUID, standing at Cam's shoulder behind the chair. She is reading the candle's behavior in the gallery's still air — her gaze is on the flame, her head slightly tilted, a faint druidic attention to small omens. CRITICAL: Kitty is a chthonic tiefling. She has HORNS curving back from her temples, ASHEN-GREY skin, a TAIL visible behind her, and faint dark SIGIL-VEINING at her temples. She wears a dark druid's traveling robe. If Kitty looks like a normal dark-haired human, you have failed this prompt.

(No houseman in this composition — the audience is genuinely private.)

Composition: Galenix to the right of the frame, Cam seated mid-frame, Kitty standing at Cam's shoulder, the candle on the side table between Cam and Galenix. The flame is the visual focus of Kitty's attention. Late-afternoon palette: warm gold from the windows, the bottle-green of Galenix's coat, the dark walnut of the chairs, the soft red of the tapestry. Painterly digital fantasy illustration. NO text or labels visible.`,
    postProcess: null,
  },
  {
    id: "p4-harbor-commission-reroll",
    tier: 17,
    out: "assets/illustrations/p4-harbor-commission.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: ["assets/portraits/party/Cam-Halfling-Rogue.png", "assets/portraits/party/kitty-druid-cthonic-tiefling.png", "assets/portraits/party/alicia-warlock-blade.png"],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

INTERIOR scene. The Rel Astra Harbor Commission chamber: a circular Aerdy commercial chamber with seven high-backed carved chairs arranged in a semicircle around a central polished oak floor, each chair on a low stone dais, three of the chairs visibly EMPTY. Behind the chairs, a tall arched colonnade gives onto a balcony overlooking the Old Harbor; you can see the harbor and ship masts through the arches in the background.

PUBLIC OBSERVERS' GALLERY: A small balcony platform hangs above the south side of the round chamber, accessed by a short flight of stairs from below. THE PARTY IS IN THIS GALLERY, watching the proceedings from above. They are not the focus of the composition; they are witnesses to the institution.

CHARACTERS in the gallery (3):
- CAM (reference image #1): the party's HALFLING ROGUE, leaning against the gallery rail, peering down at the commissioners with his sharp rogue's attention. CRITICAL: Cam is a HALFLING — short, three-and-a-half feet tall, with halfling proportions. He stands on a low bench against the gallery rail to see over it. If Cam looks like a tall human, you have failed this prompt.
- KITTY (reference image #2): the party's CHTHONIC TIEFLING DRUID, standing at Cam's right at the gallery rail, watching the proceedings with quiet intensity. CRITICAL: Kitty is a chthonic tiefling. She has HORNS curving back from her temples, ASHEN-GREY skin, a TAIL visible behind her, and faint dark SIGIL-VEINING at her temples. She wears a dark druid's robe and a small grey cloak draped over her shoulders. If Kitty looks like a normal dark-haired human, you have failed this prompt.
- ALICIA (reference image #3): the party's WARLOCK with a blade pact, standing at Cam's left, slightly behind, watching one of the senior commissioners specifically. Render Alicia cleanly — no floating particles, no glowing sparkles, no swirling motes around her. Her weapon is a slim GOLD METAL RAPIER, scabbarded at her hip, not magical-glowing.

CHARACTERS in the chamber (4 commissioners + 1 clerk):
- MISTRESS ALDAEN VETH on the senior commissioner's chair (center): a slight, severe Aerdy woman in her late sixties, white hair, dark commissioner's robes with a brass scroll-and-anchor chain at the throat. Posture upright, expression dour.
- MASTER HOLD VESHANEN seated to her right: a stout merchant in his fifties, well-dressed in dark wine-colored Aerdy fashion, a gold pin at the lapel.
- MAGISTER ELED RUTH seated two chairs to Veth's left: a thin academic in his sixties, in an academic's robes over a plain shirt, irritated expression.
- CAPTAIN VOLIN REACH seated at the far right: an Aerdy imperial officer in oxblood-and-gold uniform, sword at hip, attentive.
- THE COMMISSION CLERK at a small writing desk in the right-mid foreground of the chamber floor: a young Aerdy clerk recording the proceedings, quill in hand.

Composition: wide cinematic shot. The chamber occupies most of the frame; the commissioners visible in the lower two-thirds, the colonnade behind them, the harbor visible through the arches. The PUBLIC GALLERY runs across the upper-left of the frame, with Cam, Kitty, and Alicia visible at the rail looking down. The party is small in the composition (they are not the focus; they are observers); but they are clearly distinct and clearly present. Painterly digital fantasy illustration. Cool stone and polished oak, dark commissioner's robes, brass and gold, the muted blue-green of the harbor framing it all. NO text or labels visible.`,
    postProcess: null,
  },

  // ============== TIER 18 — Phase 5 ringed tokens (post-process from portraits) ==============
  { id: "p5-ostren-pell-token",            tier: 18, out: "assets/tokens/ostren-pell-token.png",
    sourceFromExisting: "assets/portraits/ostren-pell-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a6a48", highlight: "#b09a70", shadow: "#1a1408" } /* desaturated brass — leak */ },
  { id: "p5-aldea-veren-token",            tier: 18, out: "assets/tokens/aldea-veren-token.png",
    sourceFromExisting: "assets/portraits/aldea-veren-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#4a7a6a", highlight: "#7ab098", shadow: "#0a1a14" } /* mossy verdigris — wood correspondent */ },
  { id: "p5-ortwell-brane-token",          tier: 18, out: "assets/tokens/ortwell-brane-token.png",
    sourceFromExisting: "assets/portraits/ortwell-brane-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a5a5a", highlight: "#9a9a9a", shadow: "#1a1a1a" } /* civic dark steel — principled antagonist */ },
  { id: "p5-marshal-rennic-thale-token",   tier: 18, out: "assets/tokens/marshal-rennic-thale-token.png",
    sourceFromExisting: "assets/portraits/marshal-rennic-thale-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a4a28", highlight: "#c08864", shadow: "#1a0c08" } /* military bronze — militia commander */ },
  { id: "p5-vesten-quill-token",           tier: 18, out: "assets/tokens/vesten-quill-token.png",
    sourceFromExisting: "assets/portraits/vesten-quill-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a3838", highlight: "#c46a6a", shadow: "#1a0808" } /* dark oxblood — hostile courier handler */ },
  { id: "p5-edda-halvern-token",           tier: 18, out: "assets/tokens/edda-halvern-token.png",
    sourceFromExisting: "assets/portraits/edda-halvern-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a6a30", highlight: "#c4a868", shadow: "#1a1408" } /* restrained gold — Closure co-sponsor */ },
  { id: "p5-mairra-voss-token",            tier: 18, out: "assets/tokens/mairra-voss-token.png",
    sourceFromExisting: "assets/portraits/mairra-voss-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a7a4c", highlight: "#a8c490", shadow: "#1a2a14" } /* sage green — sympathetic councilor */ },

  // ============== TIER 19 — Party arrival + Rel Astra & Hardby district maps ==============
  // Party arrival illustration (1 job, Customs Quay arrival under Diplomatic Carriage)
  {
    id: "p4-rel-astra-arrival",
    tier: 19,
    out: "assets/illustrations/p4-rel-astra-arrival.png",
    size: "1536x1024",
    quality: "high",
    referenceImages: [
      "assets/portraits/party/Cam-Halfling-Rogue.png",
      "assets/portraits/party/kitty-druid-cthonic-tiefling.png",
      "assets/portraits/party/alicia-warlock-blade.png",
      "assets/portraits/party/elle-halfling-monk.jpg",
      "assets/portraits/party/gianni-ranger-.jpg",
      "assets/portraits/party/selvara-human-sorcerer.jpg"
    ],
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG adventure scene. NOT 19th-century oil painting.

EXTERIOR scene. The Customs Quay of Rel Astra in mid-morning. The diplomatic carriage has just rolled through the Customs Quay gate; the party has dismounted and is gathering on the cobbled quay. A small Aerdy delegation (one liveried Aerdy herald in oxblood-and-gold, plus two civic functionaries in dark wool) waits formally at the right edge of frame, the herald just completing a bow. Behind the delegation, the Hall of the Compass (a three-story Aerdi guest residence) rises in pale stone with a wide arched portico. Beyond it, a strip of harbor visible with two Aerdi imperial galleys at moorings, masts crowded against a clear morning sky. Yeomanry Council standard mounted on the lead carriage; Aerdy imperial standard flying above the customs gate.

THE FULL PARTY (6 PCs, all visible, gathered loosely as a delegation in the LEFT TWO-THIRDS of the frame — they are the focus, not the delegation). Each PC must be rendered with their distinguishing features. The reference images you have been given are the source of truth. If you cannot render a PC from their reference image, do not replace them with a generic adventurer; render them in shadow rather than render them wrong.

CRITICAL OVERALL: There are exactly 6 PCs in this scene. Three are women with reddish/auburn hair (Elle, Selvara, Alicia) — they must each be visually distinct. Two are halflings (Cam and Elle) — they must both be clearly halfling-proportioned (3.5 feet tall, halfling head shape, halfling hands). One is a chthonic tiefling (Kitty). DO NOT replace any PC with a generic adventurer. DO NOT render Cam or Elle as tall humans. DO NOT render Selvara as a man. DO NOT render Gianni as a man.

- CAM (reference image #1): HALFLING ROGUE — a young halfling woman. Long flowing dark-brown hair (loose, not braided). LARGE GOLDEN-YELLOW EYES (very distinctive — like amber). Smooth pale skin. Wears a brown leather rogue's tunic. Three-and-a-half feet tall — clearly halfling-proportioned, with halfling head and hands. Holds a small Yeomanry courier satchel. Stands at the FRONT-LEFT of the party group, looking back toward the camera. CRITICAL: If Cam looks like a tall human, you have failed this prompt. CRITICAL: Cam's eyes are golden-yellow.

- ELLE (reference image #4): HALFLING MONK — a halfling woman. Long wild AUBURN-BROWN hair (untied, loose around her shoulders). BRIGHT GOLDEN-YELLOW MONK ROBES tied with a deep RED SASH at the waist. Three-and-a-half feet tall — clearly halfling-proportioned. Standing in a relaxed but balanced monk stance, hands free. Stands at Cam's LEFT (front-center-left of the group). CRITICAL: If Elle looks like a tall human, you have failed this prompt. CRITICAL: Elle wears YELLOW robes with a RED SASH, not blue or grey or any other color.

- KITTY (reference image #2): CHTHONIC TIEFLING DRUID — a tiefling woman with GREY-BLUE ASHEN skin, large dark HORNS curving back from her temples, PALE/WHITE eyes, long DARK BRAIDED HAIR with side braids. Wears a sleeveless GREEN druid's top over leather gear, a skirt or wrap below. A long TAIL is visible behind her. She carries a TALL DARK WOODEN STAFF in one hand and a ROUND WOODEN SHIELD in the other (the shield's face painted with a stylized LYNX). Stands at the CENTER-BACK of the group, slightly taller than Cam and Elle. CRITICAL: If Kitty looks like a normal dark-haired human, you have failed this prompt. CRITICAL: Kitty's skin is grey-blue and she has horns and a tail.

- ALICIA (reference image #3): WARLOCK — a human woman. RED-AUBURN hair worn loose to her shoulders. FRECKLED FAIR SKIN. Wears a SLEEVELESS LIGHT-BLUE TUNIC with a brown belt, and dark fitted trousers/leggings. Long DARK SCROLLWORK TATTOOS visible down her bare RIGHT ARM (her warlock pact marks). Carries NO WEAPON. Instead, she holds in BOTH HANDS a CLOSED BOOK with an ARTISTICALLY STYLIZED COLORFUL COVER — the cover painted with rich saturated colors and an ornate non-literal pattern (think illuminated medieval book of hours / arcane grimoire / artist's portfolio: deep blues, oxblood reds, gold leaf accents, hand-painted geometric or floral motif, no readable text). The book is held cradled-flat in her arms, slightly inclined toward the viewer so the cover is visible. CRITICAL: Alicia is NOT holding a sword, NOT holding a rapier, NOT holding any weapon. She holds the book, only the book. RENDER ALICIA CLEANLY — no floating particles, no glowing sparkles, no swirling motes around her. The book is a mundane physical object with a beautiful cover, NOT a glowing magical tome. Stands at the CENTER of the group beside Selvara. CRITICAL: If Alicia has a sword or rapier in this image, you have failed this prompt. If Alicia has glowing magic around her, you have failed this prompt.

- GIANNI (reference image #5): HUMAN RANGER — a human woman. DARK BLACK HAIR worn in long BRAIDED PIGTAILS framing her face. GREY-GREEN INTENSE EYES (smouldering, watchful). Wears dark LEATHER ARMOR over a cream linen shirt. A LONGBOW strapped across her back; a QUIVER at her hip. Stands at the RIGHT side of the party group, her attention on the surrounding rooftops and the customs-quay perimeter (a ranger watching the angles). CRITICAL: Gianni is a WOMAN with black braided pigtails, not a man.

- SELVARA (reference image #6): HUMAN SORCERER — a human woman. AUBURN-REDDISH HAIR worn long, partly hidden under a DEEP-RED HOODED CLOAK (hood pushed back to reveal her face). Wears a DEEP TEAL/GREEN long-sleeved DRESS under the cloak, with a single BLUE STONE PENDANT on a thin chain at her throat. PALE BLUE EYES, FRECKLED SKIN, and a faint distinctive SCAR running across the bridge of her nose. Carries a TALL WOODEN STAFF in her right hand, butt-down on the cobbles (her sorcerer's focus). Stands at the CENTER-BACK of the group beside Alicia, slightly behind Kitty. CRITICAL: Selvara is a HUMAN WOMAN with a DEEP-RED HOODED CLOAK and a STAFF. CRITICAL: If Selvara looks like Gianni or Cam, you have failed this prompt — she is a human woman with auburn hair, a red hooded cloak, and a staff.

COMPOSITION: cinematic wide shot. The party occupies the LEFT TWO-THIRDS of the frame as the focus; the Aerdi delegation occupies the RIGHT THIRD as background. Warm Aerdy morning palette: cream limestone, brass, oxblood-and-gold of the herald's livery, the cool blue-green of harbor water. Yeomanry-Council and Aerdy-imperial standards visible. NO text or labels visible.

This is the moment of arrival under formal diplomatic accreditation. The mood is alert and weary; the party has traveled eight days and is dressed for the road, but they have arrived in good order and are presenting themselves as a delegation. Painterly digital fantasy illustration.`,
    postProcess: null,
  },
  // Rel Astra district maps (4 jobs)
  {
    id: "p4-rel-astra-customs-quay-district",
    tier: 19,
    out: "assets/maps/rel-astra-customs-quay-district.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette consistent with classic fantasy gazetteer cartography.

The map shows ONE DISTRICT of a great Aerdy port city — the CUSTOMS QUAY DISTRICT of Rel Astra. North faces the top edge.

Geography:
- The district sits along the NORTH SIDE of the city's main harbor. The harbor opens to the east; a strip of blue-green harbor water occupies the lower-third of the map.
- THREE LONG STONE PIERS extend south into the harbor: the IMPERIAL MOORINGS, marked by tall flagstaffs flying the Aerdy imperial standard. Aerdy galleys (rendered as small painted ship icons) are moored at the piers.
- The CUSTOMS HOUSE — a large pale-stone building with a wide colonnaded facade — sits at the head of the central pier. Its rear faces the district's main street.
- The HALL OF THE COMPASS — a three-story Aerdi guest residence with a wide arched portico — sits two streets inland from the customs house. It is the diplomatic guesthouse.
- The HARBOR COMMISSION HALL — a small circular building with a domed roof — sits between the Customs Quay and the Old Harbor Ward to the south. (The southern edge of the map.)
- A wide CEREMONIAL AVENUE runs east-west through the district, lined with pale stone civic buildings and small civic gardens.
- Smaller streets branching off the avenue contain merchant offices, a small Aerdi imperial chapel, a pair of inns, and a row of brokers' offices that handle imperial-customs documentation for visiting traders.
- The ARRIVAL GATE on the western edge of the map (at the left) where the carriage road from inland enters the district.

LABELING: A small parchment cartouche in the upper-left corner reads "CUSTOMS QUAY — REL ASTRA" in elegant fantasy-script (use clear readable lettering, NOT decorative blackletter). Major buildings are marked with small numbered circles (1 through 8) in dark ink — the buildings themselves are NOT labeled directly, only numbered for the GM's key. A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: pale stone buildings, warm tan ceremonial avenue, blue-green harbor water, brass and oxblood ceremonial accents on the imperial moorings, soft sepia overall. NO grid lines on the map. NO labels on individual buildings — only the numbered markers. Painted, not vector.`,
    postProcess: null,
  },
  {
    id: "p4-rel-astra-old-harbor-ward",
    tier: 19,
    out: "assets/maps/rel-astra-old-harbor-ward.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette.

The map shows ONE DISTRICT of a great Aerdy port city — the OLD HARBOR WARD of Rel Astra. North faces the top edge.

Geography:
- The district sits along the SOUTH SIDE of the city's main harbor. A strip of blue-green harbor water occupies the upper-third of the map (with several MERCHANT QUAYS rendered as long stone piers reaching out into the water; small painted ship icons at most berths).
- The district is WALLED OFF in pale grey stone — the OLD HARBOR WARD's defensive wall runs along the southern and eastern edges, with two named GATES marked by small open archways: the WATER GATE (north, opening onto the harbor) and the LANDWARD GATE (south, opening to the city's interior).
- The street plan is IRREGULAR — narrow lanes winding between two- and three-story stone-fronted buildings. The district is the city's commercial heart; many of the buildings are merchant offices, ship-fitters, sail-makers, and the offices of the various trading companies that work the Aerdi coast.
- The HARBOR COMMISSION HALL — a small circular building with a domed roof — sits at the northern edge of the district where it meets the harbor (a bridge between the Old Harbor Ward and the Customs Quay across the water).
- A WAVE-AND-ANCHOR SQUARE — a small public square with a stone fountain — sits in the center of the district. BELVEN ASTOR's chandlery (the Wave-and-Anchor) faces this square.
- The GOLDSMITHS' QUARTER rises on a low ridge at the eastern edge of the map, marked by taller four-story buildings with brass-trimmed signage.
- A small CHAPEL with a bell-tower in the southwest corner.

LABELING: A small parchment cartouche in the upper-left corner reads "OLD HARBOR WARD — REL ASTRA" in elegant fantasy-script (use clear readable lettering). Major locations are marked with small numbered circles (1 through 10) in dark ink. The two gates are labeled by small text labels in the cartouche key style. A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: pale grey stone walls, terracotta roofs, warm tan streets, blue-green harbor water, oxblood ceremonial accents, soft sepia overall. NO grid lines on the map. NO labels on individual buildings except the gates — only the numbered markers. Painted, not vector. The district should feel walled and dense, like a maritime old-town.`,
    postProcess: null,
  },
  {
    id: "p4-rel-astra-goldsmiths-quarter",
    tier: 19,
    out: "assets/maps/rel-astra-goldsmiths-quarter.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette.

The map shows ONE DISTRICT of a great Aerdy port city — the GOLDSMITHS' QUARTER of Rel Astra. North faces the top edge.

Geography:
- The district sits on a LOW RIDGE on the eastern slope above the harbor. The harbor is visible as a strip of blue-green water at the very bottom edge of the map (south).
- The street plan is GRIDDED but slightly canted — three main streets (running east-west) crossed by four cross-streets (running north-south). Streets are wider than the Old Harbor Ward's, lined with FOUR-STORY COUNTING-HOUSES in dark stone with brass-bound facades.
- THE CINDREN & VHAL REL ASTRA OFFICES — a four-story brownstone-fronted commercial building — sit on the central east-west street, with a brass plate beside the door. (Marked as a numbered location.)
- Other named counting-houses include the GOLDSMITHS' HALL (the quarter's guild hall, a larger building with a stepped roof), the MERCHANTS' EXCHANGE (a square-fronted hall with a small public court), and a row of smaller private banking houses.
- A pair of CIVIC FOUNTAINS in small plazas at street intersections.
- At the eastern edge of the district, the LITTLE TEMPLE OF ZILCHUS (god of trade and commerce; a small dignified building with brass-bound doors).
- The GOLDSMITHS' GATE on the west side, opening into the Old Harbor Ward.

LABELING: A small parchment cartouche in the upper-left corner reads "GOLDSMITHS' QUARTER — REL ASTRA" in elegant fantasy-script. Major locations are marked with small numbered circles (1 through 10) in dark ink. The Goldsmiths' Gate has a small text label in the cartouche key style. A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: dark stone facades, brass-trimmed signage, warm tan streets, deep walnut and brass accents (the wealth of the quarter), blue-green harbor water at the bottom edge, soft sepia overall. NO grid lines on the map. NO labels on individual buildings except the gate — only the numbered markers. Painted, not vector. The district should feel prosperous, dignified, and architecturally taller than its neighbors.`,
    postProcess: null,
  },
  {
    id: "p4-rel-astra-old-city",
    tier: 19,
    out: "assets/maps/rel-astra-old-city.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette.

The map shows ONE DISTRICT of a great Aerdy port city — the OLD CITY of Rel Astra. North faces the top edge.

Geography:
- The district climbs the rise WEST of the harbor. The harbor is visible only as a thin strip of blue-green water at the lower-right corner of the map. The Goldsmiths' Quarter is visible at the lower-right (south-southeast) as a denser district of four-story buildings.
- The OLD CITY is the oldest part of Rel Astra — irregular tangled street plan, two- and three-story buildings in pale stone with terracotta roofs. Streets narrower than the Goldsmiths' Quarter, twisting up the rise.
- THREE TEMPLE DISTRICTS, each ringed by their own low walls and centered on a small temple precinct:
  - The TEMPLE OF HEIRONEOUS (god of valor; a square fortress-like building with a small court of arms). Northwest corner of the map.
  - The TEMPLE OF PHOLTUS (god of light and law; a tall white-stone building with a single high tower). Center-west.
  - The TEMPLE OF NEROULL (god of death and the harvest; a low domed building set in a small dark grove). Northeast corner.
- A central MARKET SQUARE near the southern edge of the map — the Old City's daily market, with stalls and a small public well.
- The NAELAX EMBASSY COMPOUND on the western edge of the map — a walled compound with a single grand main building and a walled garden behind it (the embassy where Lord Galenix Naelax is currently in polite house arrest).
- The WEST GATE of the city walls visible on the far western edge of the map (at the left edge of the frame), a wide open archway with a small barbican.
- A small WINDING ROAD threads up from the harbor, through the district, to the West Gate.

LABELING: A small parchment cartouche in the upper-left corner reads "OLD CITY — REL ASTRA" in elegant fantasy-script. Major locations are marked with small numbered circles (1 through 10) in dark ink. The West Gate and the three temples have small text labels in the cartouche key style (TEMPLE OF HEIRONEOUS, TEMPLE OF PHOLTUS, TEMPLE OF NEROULL, WEST GATE). A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: pale stone walls, terracotta roofs, warm tan streets, the deep green of the embassy garden and the temple grove, soft sepia overall. NO grid lines on the map. Only the named locations have text labels; everything else uses numbered markers. Painted, not vector. The district should feel old, mixed-use, and slightly worn at the edges.`,
    postProcess: null,
  },
  // Hardby district maps (4 jobs)
  {
    id: "p3-hardby-temple-district",
    tier: 19,
    out: "assets/maps/hardby-temple-district.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette.

The map shows ONE DISTRICT of HARDBY (a small Free City on the Wooly Bay) — the TEMPLE PRECINCT, situated in the upper Old City near the Gynarchy House. North faces the top edge.

Geography:
- The district climbs a slope. The southern edge of the map (lower) is the Old City's lower terraces; the northern edge (upper) approaches the Gynarchy House (visible as a corner of a large stone building at the very top edge of the map).
- The street plan is an irregular fan radiating out from a central TEMPLE SQUARE — a paved cobblestone plaza with a stone well in the center.
- Around the Temple Square, four named temples (each a small dignified building, each in a slightly different architectural style):
  - The TEMPLE OF PROCAN (god of the seas, primary patron of Hardby's harbor trade; a stone building with a copper-sheathed dome turning green with age). Northwest of the square.
  - The TEMPLE OF XERBO (god of trade and rivers; a smaller stone hall with a brass anchor over the door). Northeast of the square.
  - The TEMPLE OF EHLONNA (an Old Faith shrine to the goddess of meadows and woodlands; a small wood-and-stone building with a green-tile roof and a small herb garden). Southwest of the square.
  - The HALL OF THE OPEN HAND (a small civic shrine to the Gynarchy's patron-goddesses, more of a meeting hall than a true temple; a long low building with an arched colonnade). Southeast of the square.
- A small CHARITY HOSPICE on the eastern edge of the district, run jointly by the temples (where the Hardby poor receive medical care).
- A small CEMETERY on the western edge, terraced into the slope, with a low stone wall.
- The TEMPLE GATE — a small archway in a low wall — separates the district from the Gynarchy House precinct above.

LABELING: A small parchment cartouche in the upper-left corner reads "TEMPLE PRECINCT — HARDBY" in elegant fantasy-script. The four named temples and the Hall of the Open Hand have small text labels in the cartouche key style. Other buildings (clergy houses, the hospice, the cemetery) have small numbered circles (1 through 6). A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: pale stone, copper-and-green dome, terracotta roofs, the soft green of the Ehlonna shrine garden, the warm sepia of the cobblestones, soft pale-blue Hardby morning sky implied by the palette. NO grid lines on the map. Only the named temples and gate have text labels; everything else uses numbered markers. Painted, not vector. The district should feel quiet and contemplative — the kind of place a stranger comes for a moment of advice from a clergy of three different faiths.`,
    postProcess: null,
  },
  {
    id: "p3-hardby-marketplace",
    tier: 19,
    out: "assets/maps/hardby-marketplace.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette.

The map shows ONE DISTRICT of HARDBY (a small Free City on the Wooly Bay) — the GREATER MARKET, situated at the boundary between the Old City and the New City near the harbor. North faces the top edge.

Geography:
- The district is roughly L-shaped, anchored by a large central MARKET SQUARE (paved with worn cobblestones, with a stone WELL in the center and a small CIVIC PLATFORM on its eastern edge where the day-master cries the prices).
- Around the central square, rows of PERMANENT MARKET STALLS in three sizes — small wooden stalls (food and small goods), medium wooden stalls (cloth, leather, tools), and a few stone-fronted SHOPS with fixed addresses (the wealthier vendors).
- The FISHMONGERS' ROW runs along the southern edge — a long line of stalls and small smokehouses; the smell of fish and smoke is implied by the dark stone of the smokehouses.
- The MEAT-AND-GRAIN ROW runs along the eastern edge — covered stalls with permanent slate roofs, a small slaughtering yard at the very southeast corner.
- The MONEY-CHANGERS' ALCOVE on the northern edge — a dignified row of small private booths where the merchants of the Greater Market change Hardby coin to Aerdy or Yeomanry coin and back. A few private guards posted.
- The MARKET WATCH POST in the northwest corner — a small civic guard post staffed by Hardby city watch.
- Two named INNS on the western edge: the BLACKWELL INN (a three-story timber-fronted inn for traveling merchants) and the GREEN MAGPIE (a smaller, rougher inn for day-laborers and casual visitors).
- The MARKET GATE in the south — the formal entrance to the market from the docks.
- The NEW CITY ENTRY in the north — a wide opening into the broader New City streets.

LABELING: A small parchment cartouche in the upper-left corner reads "GREATER MARKET — HARDBY" in elegant fantasy-script. The two named inns, the Market Gate, and the Market Watch Post have small text labels in the cartouche key style. Stall rows are labeled by their general category (FISHMONGERS' ROW, MEAT-AND-GRAIN ROW, MONEY-CHANGERS' ALCOVE) in smaller text. Other buildings have small numbered circles (1 through 8). A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: warm worn cobblestones, painted timber stalls in red and ochre, dark stone smokehouses, slate roofs on the meat-and-grain row, brass-and-pewter glints on the money-changers' booths, soft sepia overall. NO grid lines on the map. The labels listed above are visible on the map; everything else uses numbered markers. Painted, not vector. The district should feel busy and lived-in — the visual equivalent of the smell of fish, smoke, hot bread, and old leather.`,
    postProcess: null,
  },
  {
    id: "p3-hardby-docks-district",
    tier: 19,
    out: "assets/maps/hardby-docks-district.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette.

The map shows ONE DISTRICT of HARDBY (a small Free City on the Wooly Bay) — the DOCKS DISTRICT, the working harbor heart of the city. North faces the top edge.

Geography:
- The lower half of the map (south) is the HARBOR WATER — blue-green, with about a dozen long stone piers extending into it. Small painted ship icons at most berths (cogs, coastal galleys, fishing boats). A LIGHTHOUSE marks the tip of the easternmost breakwater (a small stone tower with a brass-bound lantern at its top).
- The upper half of the map (north) is the dock-side BUILT DISTRICT.
- WAREHOUSES along the dock-side — long stone-walled buildings, slate roofs, wide cargo doors. Some warehouses are clearly newer (pale stone, well-maintained), others are visibly derelict (darker, with broken roof tiles). One of the derelict warehouses (in the lower-left of the built district) is MARKED WITH A SMALL DARK SIGIL — this is the Black Cog Lane warehouse where Tamsin Moraven was held on the Quiet Pursuit path.
- The COOPERED WRECK TAVERN is marked at the head of BLACK COG LANE (a narrow alley running into the docks from the western edge of the district). The tavern has a small painted sign above its door (a barrel and a sinking ship — visible at this scale as a small dark mark).
- The DOCKMASTER'S OFFICE — a dignified two-story building with a small public clock-face on its front wall — sits at the center of the dock-side, between the warehouses.
- The HARDBY OUTER HARBOR AUTHORITY — a small civic building with the Hardby Gynarchy badge at its lintel (the open hand on a green field) — sits at the eastern edge.
- The FISHMONGERS' QUAY at the western edge, where the morning catch is unloaded and walked up to the Greater Market.
- The SHIP-FITTERS' YARD at the eastern edge, with two small dry-docks.
- WHALEMARKET QUAY in the upper-center — a smaller commercial quay with VESKA MAELAN's notary office marked (a small building with a painted sign of a scroll-and-scale).
- The HARBOR GATE in the south-center — the formal entrance to the docks from the city's interior.

LABELING: A small parchment cartouche in the upper-left corner reads "DOCKS DISTRICT — HARDBY" in elegant fantasy-script. The Coopered Wreck, the Dockmaster's Office, the Harbor Authority, Whalemarket Quay, the Lighthouse, and the Harbor Gate have small text labels in the cartouche key style. Other buildings have small numbered circles (1 through 12). A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: dark stone warehouses, slate roofs, weathered wooden piers, blue-green harbor water (slightly murky in the lee of the breakwater), the brass-and-amber of the lighthouse lantern at the harbor mouth, the warm tan of the dock-side streets, soft sepia overall. NO grid lines on the map. The named locations have text labels; everything else uses numbered markers. Painted, not vector. The district should feel working-class, maritime, and slightly dangerous after dark.`,
    postProcess: null,
  },
  {
    id: "p3-hardby-merchant-quarter",
    tier: 19,
    out: "assets/maps/hardby-merchant-quarter.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Hand-painted top-down fantasy district map in cartographic style for a tabletop role-playing game. Painted-map feel like a published adventure module city handout (Mike Schley / Tales of the Valiant city handout style). Parchment substrate, sepia-and-warm-color palette.

The map shows ONE DISTRICT of HARDBY (a small Free City on the Wooly Bay) — the MERCHANT QUARTER, the city's commercial-office district. North faces the top edge.

Geography:
- The district sits in the New City north of the harbor, an orderly grid of three main streets running east-west crossed by four cross-streets running north-south.
- Buildings are PROSPEROUS THREE-STORY STONE-FRONTED OFFICES with brass-trimmed signage, dignified facades, and small cobblestone forecourts where staff and clients alight from carriages.
- A square three-story stone building with a small interior courtyard sits prominently on the central east-west street — a brass plate beside its door bears a stylized device of a crane above three coins. Marked as a numbered location.
- Other named buildings include the HARDBY TRADE HALL (the merchants' guild hall, larger than its neighbors, with a small public courtroom for trade arbitration), the COASTAL SHIPPERS' EXCHANGE (a hall facing onto a small public square), and a row of smaller private brokers' offices.
- A pair of small CIVIC FOUNTAINS at street intersections.
- The HARDBY GYNARCHY REGISTRY OFFICES on the northern edge — a dignified civic building with the Gynarchy badge above the door (the open hand on a green field).
- A few QUIET INNS along the southern edge of the district (where visiting traders lodge) — the BRASS LANTERN and the MERCHANT'S REST.
- The MERCHANT GATE in the south, opening to the docks via a short ceremonial avenue.
- The NEW CITY GATE in the north, opening to the broader New City residential districts.

LABELING: A small parchment cartouche in the upper-left corner reads "MERCHANT QUARTER — HARDBY" in elegant fantasy-script. The Hardby Trade Hall, the Coastal Shippers' Exchange, the Gynarchy Registry, the two named inns, and the two gates have small text labels in the cartouche key style. Other buildings have small numbered circles (1 through 10). A small COMPASS ROSE in the upper-right corner. A small SCALE BAR ("100 ft") in the lower-right corner.

Palette: pale stone facades with brass trim, terracotta roofs, warm tan streets, deep walnut and brass civic accents, the soft green of small civic gardens, soft sepia overall. NO grid lines on the map. The named locations have text labels; everything else uses numbered markers. Painted, not vector. The district should feel prosperous, ordered, and slightly cooler in temperament than the docks below.`,
    postProcess: null,
  },

  // ============== TIER 20 — Sandbox anchor NPC portraits (22 jobs) ==============
  // ---- LOFTWICK ----
  {
    id: "sbx-loftwick-mira-welk-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/mira-welk-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MISTRESS MIRA WELK, a Loftwick fence and pawnshop owner in her sixties, half-orc with halfling ancestry on her mother's side.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Half-orc with halfling-mother heritage — built like neither parent: medium-tall but stocky, broad-shouldered, with subtle half-orc tusks just visible at the corners of her mouth and slightly elongated ears with a halfling-like point. Skin warm-tan with a hint of green undertone. Hair dark-iron-grey, gone grey at the temples, worn in a thick braid down her back. Strong calloused hands with a single brass thumb-ring. A simple dark wool dress under a heavier brown wool work-apron. A small brass scale-and-anchor pin at her collar — the mark of her trade.
She stands behind the polished walnut counter of her Wick Lane pawnshop, a brass weight-scale visible beside her on the counter, a wall of pigeonhole shelves with pawned items behind. Late-afternoon light from a small front window. She is examining a small object in her hand with an appraiser's care; her expression is professional, unhurried, faintly amused.
Three-quarter view from waist up. Background: dark walnut shelving, brass fittings, a single brass kettle on a side stove.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-loftwick-brother-ashan-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/brother-ashan-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of BROTHER ASHAN VELL, a Yeomanry monk in his fifties, formerly a militia drill-sergeant before he took monastic vows. Of the Cloister of the Open Way, attached to a temple of Phaulkon (god of the open sky).
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Stout middle-aged human, Yeomanry-born, fair-skinned weathered tan from outdoor practice. BALD, broad-shouldered, thick-armed in the way a former soldier ages. Plain monk's robes in dark blue-grey wool tied with a sash of pale undyed linen. A small wooden Phaulkon symbol (a stylized hawk with spread wings) on a leather cord at his throat. Calloused hands held loosely at his sides. Slow, measured expression — neither stern nor soft, the face of a teacher who has been patient with many students.
He stands in the sand-floored sparring courtyard of the Cloister, an open sky visible above him with a single hawk circling at distance. The courtyard's stone walls are pale Loftwick limestone. A practice staff is leaning against the wall behind him.
Three-quarter view from waist up. Background: pale stone walls, sand-floor, the sky and circling hawk visible above.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-loftwick-mother-felun-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/mother-felun-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MOTHER FELUN, an old Flan hedge-druid in her late seventies, lives at the Reedrush wetland southwest of Loftwick.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late seventies, human Flan ancestry. Skin weathered DARK BROWN-TAN like driftwood, deep crow's-feet at her eyes, the long-faced lined beauty of someone who has been outdoors most of her life. Long iron-grey hair pulled back loosely with a leather thong. Wears a plain BROWN WOOL DRESS, simple and well-worn. A single distinctive necklace at her throat: small bones strung on a leather cord — visibly a rabbit jaw, an otter vertebrae, a kingfisher skull (each gathered, never killed; small enough to look like keepsakes rather than trophies). A short willow walking-staff in her right hand.
She stands at the edge of the Reedrush wetland at first light: tall reeds in soft blue-green, willows behind her bent over still water, a marsh-harrier circling distantly above. Mist on the water. The light is dawn-cold and pale.
Three-quarter view from waist up. Background: reeds, willows, the misted water, the distant harrier.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-loftwick-sergeant-hurst-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/sergeant-hurst-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of SERGEANT DORAL HURST, a retired Yeomanry militia archer in his late fifties, runs the Southwall archery yard in Loftwick.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late fifties, human Yeomanry. Fair-skinned, weathered tan, lined face. Iron-grey beard worn close-cropped, matching short hair. Stands with a slight favor on his left leg (an old knee that no longer holds him in a long march). Dressed in a plain Yeomanry militia coat — heavy dark-green wool with brass buttons, the small bronze archer's pin at his lapel. Strong calloused archer's hands. Holds a practice longbow in his left hand, butt-down on the sand.
He stands on the sand-floored Southwall archery yard, three straw-butt firing-targets visible in the distance behind him, a small armory shed to one side. The light is mid-morning, falling from his right.
Three-quarter view from waist up. Background: the archery yard's sand floor, the distant butts, a single Yeomanry standard hanging slack from a flagstaff.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-loftwick-master-ferrick-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/master-ferrick-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MASTER OLEN FERRICK, a retired Yeomanry academician and scholar of magical theory in his late sixties, keeps a private reading room behind a Loftwick bookbinder's shop.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late sixties, human Yeomanry. Fair-skinned, lined. BALD on top of his head with a fringe of grey hair around the sides. A SINGLE THICK GREY BEARD worn full and slightly square — a beard he is in the habit of pulling thoughtfully when working through a problem. Dark scholar's robes over a plain linen shirt; an old reader's lens on a black silk cord around his neck, currently down on his chest. A heavy bronze academician's pin at his lapel.
He sits at a polished walnut reading table in his private reading room, an open folio volume in front of him, a small cup of tea at his elbow, a brass reading-lamp providing warm directional light from the right. The wall behind him is lined with bound volumes. He has just looked up from his reading; his expression is attentive, slightly distracted, kindly.
Three-quarter view from waist up. Background: the dark-walnut reading table, bound volumes on the wall behind, soft warm lamplight.
${ART_STYLE}`,
    postProcess: null,
  },
  // ---- HARDBY ----
  {
    id: "sbx-hardby-hesp-olfair-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/hesp-olfair-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of HESP OLFAIR, a one-eyed Hardby fence in his late forties, runs a pawn-and-fence operation in the Salters' Quarter.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late forties, human Hardby-born. Weathered fair skin with a sailor's tan. ONE EYE — left eye is missing, covered with a simple leather patch worn diagonally across his face from a tavern accident in his twenties. Dark-brown hair gone grey at the temples, cropped short. A short grey-streaked beard. Wears a dark Hardby merchant's coat with a single brass-and-coral pin at the lapel (subtle — the mark of an old Salters' Quarter family). His one eye is sharp and amused; the patched side does not move.
He stands behind the counter of his pawn-and-fence shop, a small set of brass scales beside him on the counter, a heavy iron gate visible behind him at the back of the shop. Late-afternoon light from a small barred window.
Three-quarter view from waist up. Background: dark wooden shelving, the iron gate, a single oil-lamp.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-hardby-sister-wren-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/sister-wren-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of SISTER WREN, an old Flan monk and lay-keeper of an Ehlonna shrine in Hardby's Temple Precinct, in her late seventies.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late seventies, human Flan. Skin weathered DARK BROWN-TAN, deeply lined, a face that has seen many seasons in the same garden. WHITE hair worn in a long thin braid down her back. Slight build but visibly weathered to a knot of muscle and bone — she has been practicing Old Faith breathing forms for seventy years and it shows. Wears a plain undyed linen wrap over a faded green tunic, with a single small Ehlonna leaf-symbol at her throat (carved from oak). No shoes — bare-footed in the temple garden. Her hands are clasped loosely in front of her.
She stands at the edge of a small stone-walled temple garden in the Old City of Hardby — a single cypress tree visible behind her, soft sand floor, a small herb-garden in the foreground. Light is morning-cool, falling from her right.
Three-quarter view from waist up. Background: the cypress, the stone walls, the herb-garden.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-hardby-helka-fenn-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/helka-fenn-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of HELKA FENN, a wisewoman in her mid-sixties, lives in a stilt-house in the salt-fens east of Hardby.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Mid-sixties, human Suel-Flan-mixed ancestry. Skin warm-bronze with sun-creases, the lived-in face of someone who has spent her life on the salt-fens. Iron-grey hair pulled back into a thick knot at the nape of her neck. Wears a plain dark-blue wool overdress with rolled sleeves, over a faded undershirt; a length of cord at her waist. Carries a tall WILLOW STAFF in her right hand — the wood pale and worn smooth from years of use. A single small bronze ring on her left hand.
She stands on the worn-plank deck of her stilt-house at the edge of the salt-fens. Reed-thatched roof above her, salt-marsh stretching away behind into dawn mist. A tame heron is visible perched on the deck's rail to her right. Cool morning light, blue-grey sky.
Three-quarter view from waist up. Background: reed-thatched roof, salt-marsh receding into mist, the heron on the rail.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-hardby-captain-fels-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/captain-fels-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of CAPTAIN TARLIN FELS, a Hardby city watch captain in her mid-forties, runs the west-gate watch-yard.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Mid-forties, human Hardby-born woman. Olive-tan skin, dark hair worn cropped short under a Hardby city watch helm currently in the crook of her arm (not on her head). Distinctively missing the lower half of her LEFT EAR — the upper half is intact, the lower half clearly gone from a southern-district bandit incident years ago. The scar is healed but visible. Strong jaw, weathered face, intelligent eyes. Wears a Hardby city watch coat — dark teal-and-brass, with the captain's brass gorget at her throat (an open-hand device, the Gynarchy's mark). A short-sword scabbarded at her hip.
She stands in the small courtyard of the west-gate watch-yard, a covered shooting range visible behind her, a small Hardby standard hanging from a flagstaff at the courtyard's center. Mid-morning light from her left.
Three-quarter view from waist up. Background: pale stone walls, the covered shooting range, the standard.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-hardby-mistress-korr-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/mistress-korr-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MISTRESS VELLA KORR, a retired Hardby trade-clearing notary in her late fifties, hosts the Scribe's Tea Society at her tea-house.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late fifties, human Hardby-born. Fair skin, sandy hair gone half-grey, worn neatly pinned up. Wears a notary's high-collared cream linen blouse under a dark teal-grey overdress, with a small silver scale-and-scroll badge at her throat (her old notarial seal of office, kept past retirement). Reading lenses on a fine silver chain at her neck. Her hands are warm-brown-stained (years of tea-handling and ink). Calm, intelligent expression.
She stands behind the counter of her tea-house, a small brass tea-kettle on a low brazier beside her, shelves of tea-canisters visible on the back wall. A single small porcelain cup is set on the counter in front of her, ready for a guest. Late-afternoon warm interior light.
Three-quarter view from waist up. Background: the tea-house counter, dark walnut shelving with tea-canisters, brass kettle.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-hardby-vell-marad-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/vell-marad-portrait.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Bust portrait of VELL MARAD, a Hardby sorcerer and member of the Scribe's Tea Society, in his early fifties.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Early fifties, human Hardby-born. Fair skin, dark hair gone grey at the temples, worn loose to the shoulders. A short trimmed dark beard going grey. Slightly distracted, intelligent expression — the look of someone whose mind is occasionally somewhere else. Wears a Hardby scholar's coat (medium-grey wool with a single small brass pin at the lapel). Carries a small bound notebook in his left hand, a quill behind his ear. Reading lenses pushed up on his forehead.
He stands at a side-table in Mistress Korr's tea-house upper library, a small folio volume open in front of him. Soft afternoon library light from a high window.
Bust view from upper chest up. Background: walnut bookshelves, soft afternoon light.
${ART_STYLE}`,
    postProcess: null,
  },
  // ---- REL ASTRA ----
  {
    id: "sbx-rel-astra-rinya-dane-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/rinya-dane-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of RINYA DANE, an Aerdy half-elf fence in her late forties (looks early thirties due to half-elven longevity), runs a fence-and-pawn shop in Rel Astra's Old Harbor Ward.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Half-elf, Aerdy heritage. Looks thirty though she is forty-eight. Slim build, sharp angular features (mother was human Aerdy, father elven). Subtly elongated ear-tips, just visible. Skin warm-tan with a hint of olive. Long dark-auburn hair worn pulled back into a single sleek tail. Sharp dark-hazel eyes, polite without warmth. Wears a tailored dark Aerdy walking-coat (deep grey-green wool with bronze buttons) over a linen blouse. A small brass scale-and-anchor pin at her collar — the mark of Old Harbor Ward fences. A heavy silver thumb-ring on her right hand.
She stands behind a polished walnut counter in her shop, a brass scale beside her, a wall of small drawers and small numbered pigeonholes behind her. The light is afternoon, falling from a single tall window to her left.
Three-quarter view from waist up. Background: warm walnut shelving, brass fittings, the tall narrow window.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-rel-astra-brother-ostrik-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/brother-ostrik-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of BROTHER OSTRIK VAERIN, a militant brother of Heironeous in his mid-fifties, oversees the Heironeous training yard in Rel Astra's Old City.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Mid-fifties, human Aerdy. Tall for an Aerdy (broad-shouldered, built solid). Dark-tan skin. Short iron-grey hair, a short military beard. Distinctive: MISSING the small finger of his LEFT HAND (lost to a southern Aerdy campaign) — visible as he holds his hand at his side. Wears the dark-oxblood Heironeous training tunic (sleeveless, heavy linen, with the silver Heironeous lightning-bolt symbol embroidered on the chest), over plain dark trousers. Cinched at the waist with a leather belt; a wooden practice sword scabbarded at his hip. Calm, plain-spoken expression.
He stands in the sand-floored Heironeous training yard, a tall practice post visible behind him, the temple's pale stone wall in the further distance. Late-afternoon Aerdy light, warm gold from his right.
Three-quarter view from waist up. Background: training yard sand, practice post, pale stone wall.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-rel-astra-edril-thence-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/edril-thence-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of EDRIL THENCE, an old Aerdy druid in his late seventies, keeps the Three-Tree Grove on the Aerdy coast north of Rel Astra.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late seventies, human Aerdy. Tall and lean, weathered. Skin warm-tan, deeply lined. WHITE hair worn long to the shoulders, with a long well-kept WHITE BEARD. Wears a faded OXBLOOD-AND-CREAM linen robe (the colors slightly washed-out from years in the sun), tied at the waist with a hand-twisted leather cord. A single piece of polished sea-driftwood worn as a pendant at his throat. Holds a tall driftwood walking-staff in his right hand. Calm, slightly distant expression — the look of someone who has been listening to tides for fifty years.
He stands in the Three-Tree Grove — three twisted cypress-and-olive trees framing him, a small private spring visible at his feet, the Aerdy coast and sea visible distantly through a gap in the cliffs behind. Mid-afternoon coastal light.
Three-quarter view from waist up. Background: the three trees, the spring, the distant sea.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-rel-astra-lieutenant-mada-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/lieutenant-mada-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of LIEUTENANT KORVEN MADA, an Aerdy imperial archer in his late thirties, seconded to the customs garrison's training annex in Rel Astra.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late thirties, human Aerdy. DARK-SKINNED (deep brown), lean, athletic build. Short black hair worn close-cropped under his helm (currently in the crook of his arm). A short trim mustache. Confident, disciplined expression. Wears the Aerdy IMPERIAL uniform: dark oxblood-and-gold tabard over chain hauberk, the imperial archer's lieutenant's badge at his throat (a stylized arrow above a sun-disk). A composite recurve bow strapped across his back; a small quiver of arrows at his hip. A long-handled imperial-pattern dagger scabbarded at his belt.
He stands in the Aerdy imperial garrison's training annex — sand-floored shooting yard, three target butts visible behind him, an imperial standard hanging from a flagstaff. The light is early-morning, the harbor visible distantly to his left.
Three-quarter view from waist up. Background: sand-floor, target butts, imperial standard, distant harbor.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-rel-astra-magister-vaden-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/magister-vaden-portrait.png",
    size: "1024x1024",
    quality: "high",
    prompt: `Bust portrait of MAGISTER ILEN VADEN, a junior magister of the Aerdy College of Commercial Law (with a quiet arcane chair) in his mid-forties.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Mid-forties, human Aerdy. Lean build. Warm-tan skin. Dark hair gone slightly grey at the temples, worn neatly combed. Clean-shaven. Wears the dark Aerdy magister's robes (deep purple-black wool with cream linen at the high collar), with a small silver-and-pearl academic chain at his throat (the College's distinction). Reading lenses pushed up on his forehead. Holds a small folio volume in his left hand, a quill in his right. Quietly intelligent, attentive expression.
He stands in the College's quiet annex — a small reading room with tall narrow shelves of bound volumes behind him, a single brass reading-lamp on the table to his right providing warm directional light.
Bust view from upper chest up. Background: walnut bookshelves, brass lamp.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-rel-astra-veth-avir-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/veth-avir-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of MISTRESS VETH-AVIR, an old Aerdy archivist of pact-related correspondence in her late seventies, keeps a private archive in Rel Astra's Old City.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late seventies, human Aerdy. WHITE hair worn pulled back into a single neat coil at the nape. Pale fair skin, deeply lined. Sharp pale-blue eyes that have read manuscripts for sixty years. Wears austere dark linen robes — almost black, with cream linen at the cuffs and high collar. A single small bronze ring on her right hand bearing a worn device (a sword crossed with a quill — the archive's old emblem). No other ornament. Holds a sealed correspondence packet in her left hand.
She stands in her private archive's reading room. The walls are lined floor to ceiling with shelves of sealed correspondence — small stacks of folded letters and pact-related documents in numbered pigeonhole shelves. A single tall candle on a side table provides the only warm light; the room is otherwise cool and shadowed. The archive's atmosphere is hushed.
Three-quarter view from waist up. Background: numbered pigeonhole shelves of sealed correspondence, the single candle.
${ART_STYLE}`,
    postProcess: null,
  },
  // ---- GREYHAWK CITY ----
  {
    id: "sbx-greyhawk-skarrel-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/skarrel-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of SKARREL, a halfling fence in his forties, runs the Folded Cup pawn-and-fence operation in Greyhawk City's Foreign Quarter.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Halfling man, indeterminate age (probably forties). CRITICAL: he is a HALFLING — three-and-a-half feet tall with halfling proportions, halfling head shape, halfling hands. Originally from Elmshire south of Greyhawk; settled in the city. Curly brown hair gone slightly grey at the sides. A neat short trimmed brown beard. Hazel eyes, sharp and friendly. Wears a Foreign Quarter halfling's coat — warm tan-and-rust wool with brass buttons, a small leather pouch at his belt, a brass-and-iron necklace of small charm-coins at his throat (the receiver's mark, common to Greyhawk fences). A small silver thumb-ring.
He stands on a wooden stool behind the counter of the Folded Cup (the stool brings him to counter-height). Brass scales beside him, a wall of pigeonhole shelves behind. The shop is lit by a single brass oil-lamp providing warm interior light. Late evening.
Three-quarter view from waist up. CRITICAL: If Skarrel looks like a tall human, you have failed this prompt.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-greyhawk-kell-marrow-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/kell-marrow-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of KELL MARROW, a retired Greyhawk pugilist in his late fifties, runs the Gravestone sporting yard in the Garden Quarter.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late fifties, human Greyhawk-born. Olive-tan skin. BROAD-SHOULDERED, thick-armed in the way an old fighter ages — clearly muscular but slightly thickened. Dark-grey hair worn close-cropped, with a similar short beard. A flattened nose (broken multiple times in his career). A small visible scar through his left eyebrow. Walks with a slight limp on his left leg from an old fight. Wears a plain Greyhawk linen tunic, sleeves rolled, with a heavy leather work-belt. A small bronze pugilist's medal at his collar.
He stands at the edge of the Gravestone's covered ring — sand-floored sparring circle visible behind him, raised wooden seating in the further background, late-afternoon light from above. He has just raised a hand, a small acknowledgment to a sparring student off-frame.
Three-quarter view from waist up. Background: the sparring ring, sand floor, raised seating.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-greyhawk-brisa-wood-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/brisa-wood-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of BRISA WOOD, a hedge-witch in her mid-fifties, keeps a small herb-stall under the Ash Tree at the eastern edge of Greyhawk City's Foreign Quarter.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Mid-fifties, human Flan-Suel-mixed ancestry. Skin warm-bronze, weathered, lined at the eyes. Long graying-dark hair worn loose with a single small braid at one side. Wears plain Greyhawk linen — a faded forest-green wrap dress, with a heavier brown wool overcloak. A distinctive HERB-BUNDLE worn at her throat (small bundle of dried lavender, sage, and a single sprig of mistletoe, tied with a leather cord). Calm, watchful expression, the kind of patience a city-hedge-witch develops over decades. Carries a small wicker basket of herb-bundles in her left hand.
She stands at the foot of the ASH TREE — a single old ash with grey-silver bark and broad branches reaching up out of the frame. The tree grows in an empty city lot, surrounded by Foreign Quarter buildings visible in the distance. A small wooden stall with hanging dried herbs is set up behind her. Soft afternoon light, slightly hazy.
Three-quarter view from waist up. Background: the ash tree's bark, the herb-stall, distant Foreign Quarter buildings.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-greyhawk-sergeant-vandros-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/sergeant-vandros-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of SERGEANT BREL VANDROS, a Greyhawk City Watch sergeant in his late forties, runs the Foreign Quarter watch station's day-shift.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Late forties, human Greyhawk-born. Skin medium tan, weathered. Short iron-grey hair, a stubbled beard going grey. Distinctively MISSING the small finger and ring finger of his RIGHT HAND (visible at his side; clean amputation, healed long ago — left-handed since). Wears the Greyhawk City Watch uniform: a heavy dark-blue coat with brass buttons and the city's gryphon device at the lapel, a sergeant's brass collar-pin, and a sword-belt with a short-sword on the LEFT hip (he draws with his left hand). Practical, tired, intelligent expression.
He stands at the front of the Foreign Quarter watch station — a small civic building with the Greyhawk gryphon over the door, narrow street and Foreign Quarter buildings visible behind. Mid-morning street activity in the further distance. Late-spring light.
Three-quarter view from waist up. Background: the watch station's facade, the Foreign Quarter street.
${ART_STYLE}`,
    postProcess: null,
  },
  {
    id: "sbx-greyhawk-iren-velash-portrait",
    tier: 20,
    out: "assets/portraits/sandbox/iren-velash-portrait.png",
    size: "1024x1536",
    quality: "high",
    prompt: `Portrait of IREN VELASH, a half-Suel manuscript dealer in her mid-fifties, runs a small manuscript shop in Greyhawk City's Garden Quarter.
Modern high-fantasy illustration / digital concept art for tabletop RPG (D&D 5e / Tales of the Valiant book interior style). NOT 19th-century oil painting.

Mid-fifties, half-Suel ancestry. Pale fair skin (Suel paleness, less common in Greyhawk than human-mixed populations). Long pale-blonde hair gone slightly silver, worn in a single thick braid down her back. Cool grey eyes — quiet, honest, not friendly. Wears a Garden Quarter scholar's overdress (deep green wool with bronze buttons) over a cream linen blouse. Reading lenses on a thin silver chain around her neck, currently down on her chest. A single bronze pin at her throat — a stylized open book with a quill. Stained ink-fingertips on her right hand. Calm, focused expression.
She stands at the worn wooden counter of her manuscript shop. Walls lined floor-to-ceiling with bound folios and rolled scrolls in wooden racks. A small open folio is on the counter in front of her, a quill held loosely in her right hand mid-annotation. Soft warm afternoon light from a high window.
Three-quarter view from waist up. Background: the wall of bound folios, the open volume on the counter, soft afternoon light.
${ART_STYLE}`,
    postProcess: null,
  },

  // ============== TIER 21 — Sandbox atmospheric location scenes (4 jobs) ==============
  {
    id: "sbx-loftwick-reedrush-scene",
    tier: 21,
    out: "assets/illustrations/sbx-loftwick-reedrush.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG sandbox-layer atmospheric scene. NOT 19th-century oil painting.

EXTERIOR scene at first light. THE REEDRUSH — a small wetland a mile southwest of Loftwick. Tall reeds in soft blue-green stand thick along still water; a stand of willow trees behind them lean over the marsh, branches trailing into the surface. Mist rises in small drifts from the water. A pair of marsh-harriers circles in the pale dawn sky.

Mother Felun is visible in the middle distance — a small figure in a brown wool dress at a low stone bench almost lost in the reeds, her bone necklace just visible at her throat. She is sitting still, watching the water. The light is dawn-cold, pale-blue sky going to soft pink at the eastern horizon.

Composition: wide cinematic landscape shot. The reeds and willows occupy the foreground; Mother Felun in the mid-ground; the dawn sky and circling harriers in the background. Painterly digital fantasy illustration. Atmosphere: profound quiet, the sense of a place that has been undisturbed for generations. NO floating sparkles or magical particles. Cool blue-pink palette overall, with the warm brown of Mother Felun's dress as the only saturated color in the frame.`,
    postProcess: null,
  },
  {
    id: "sbx-hardby-helka-stilt-house-scene",
    tier: 21,
    out: "assets/illustrations/sbx-hardby-helka-stilt-house.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG sandbox-layer atmospheric scene. NOT 19th-century oil painting.

EXTERIOR scene in early-morning mist. HELKA'S STILT-HOUSE — a small reed-thatched dwelling on raised wooden pilings standing two body-heights above the salt-fen surface, half a day's walk east of Hardby. The dwelling has a covered porch wrapping its front side, with a worn-plank deck. A reed-thatched roof slopes steeply down on all sides.

A tame heron is perched on the deck's rail, looking out across the fens. Salt-marsh stretches away in all directions — soft green-grey reeds, patches of standing water reflecting the pale morning sky, a few distant cypress-stumps. A faint path of wooden walking-planks zigzags away from the stilt-house through the marsh.

Helka Fenn is visible standing at the edge of her porch in the middle distance — a small figure in a dark-blue overdress with her willow staff, watching the morning. The light is dawn-cool, blue-grey going to pale gold at the horizon.

Composition: wide cinematic landscape shot. The stilt-house and porch occupy the right-mid-ground; the salt-fen extends to the horizon on the left. Painterly digital fantasy illustration. Atmosphere: an outpost of one woman's careful tending in a vast indifferent marsh. NO floating sparkles or magical particles. Cool grey-green-blue palette, with the warm thatch of the roof as the only warm tone.`,
    postProcess: null,
  },
  {
    id: "sbx-rel-astra-three-tree-grove-scene",
    tier: 21,
    out: "assets/illustrations/sbx-rel-astra-three-tree-grove.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG sandbox-layer atmospheric scene. NOT 19th-century oil painting.

EXTERIOR scene in mid-afternoon Aerdy coastal light. THE THREE-TREE GROVE — a small grove on the Aerdy coast a mile north of Rel Astra. Three twisted ancient trees frame the scene: two cypress (dark spires) and one olive (silver-green canopy), their roots gripping a fold of weathered cliff-stone. Between them, a small private spring wells up from a stone basin set into the ground; the water is clear, the basin rimmed with smooth river-pebbles.

Beyond the grove, the Aerdy sea is visible through a gap in the cliffs to the right — a strip of deep blue-green water reaching to a soft pale horizon. A pair of sea-otters can be glimpsed swimming in the distance.

Edril Thence is visible in the mid-ground — an old white-bearded druid in faded oxblood-and-cream linen, leaning on his driftwood staff at the edge of the spring. He is looking down at the water, listening rather than speaking.

Composition: wide cinematic landscape shot. The three trees frame the spring in the center foreground; the cliff-fold and sea visible to the right; Edril stands as a small figure beside the spring. Painterly digital fantasy illustration. Atmosphere: ancient, quiet, coastal. The grove is inhabited but uncrowded. NO floating sparkles or magical particles. Warm Aerdy afternoon palette: cypress green, olive silver, weathered cliff-stone gold, deep blue-green sea, the soft cream of Edril's robe.`,
    postProcess: null,
  },
  {
    id: "sbx-greyhawk-ash-tree-scene",
    tier: 21,
    out: "assets/illustrations/sbx-greyhawk-ash-tree.png",
    size: "1536x1024",
    quality: "high",
    prompt: `Modern high-fantasy illustration / digital concept art for a tabletop RPG sandbox-layer atmospheric scene. NOT 19th-century oil painting.

EXTERIOR scene in soft late-afternoon city light. THE ASH TREE — a single old ash tree growing in an empty city lot at the eastern edge of Greyhawk City's Foreign Quarter. The tree is tall and broad, with grey-silver bark and pale-green spring leaves; its branches reach up beyond the top of the frame. The empty lot is a small irregular space the city has not built on for forty years — packed earth, a few tufts of grass, a small worn stone bench at the tree's base.

Foreign Quarter buildings rise on three sides of the lot in the middle distance — three- and four-story stone-and-timber buildings with shuttered windows and warm interior light just beginning to glow as evening approaches. The Foreign Quarter's narrow streets meet the lot at two corners.

Brisa Wood's small wooden stall is set up under the tree — a low wooden table with hanging dried herb-bundles, a small wicker basket of fresh herbs, and a hand-lettered sign too small to read. Brisa herself is visible at the stall, a small figure in a dark-green wrap dress, arranging her herbs. A single small grey city-cat sits on the bench at the tree's base, watching her work.

Composition: wide cinematic landscape shot. The ash tree dominates the center; the empty lot in the foreground; Foreign Quarter buildings on three sides; soft evening light from the upper-left. Painterly digital fantasy illustration. Atmosphere: a small surviving wildness inside a large old city. NO floating sparkles or magical particles. Late-afternoon palette: grey-silver bark, pale-green leaves, warm-tan packed earth, soft grey city stone, the warm interior glow just beginning at the building windows.`,
    postProcess: null,
  },

  // ============== TIER 22 — Sandbox anchor ringed tokens (22 jobs, post-process) ==============
  // Loftwick (5)
  { id: "sbx-mira-welk-token",          tier: 22, out: "assets/tokens/sandbox/mira-welk-token.png",
    sourceFromExisting: "assets/portraits/sandbox/mira-welk-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a6a48", highlight: "#b09a70", shadow: "#1a1408" } /* tarnished brass — fence */ },
  { id: "sbx-brother-ashan-token",      tier: 22, out: "assets/tokens/sandbox/brother-ashan-token.png",
    sourceFromExisting: "assets/portraits/sandbox/brother-ashan-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a5a72", highlight: "#9498b4", shadow: "#0a0a14" } /* monk grey-blue */ },
  { id: "sbx-mother-felun-token",       tier: 22, out: "assets/tokens/sandbox/mother-felun-token.png",
    sourceFromExisting: "assets/portraits/sandbox/mother-felun-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#6a5a3a", highlight: "#a89878", shadow: "#1a1208" } /* bone-and-driftwood */ },
  { id: "sbx-sergeant-hurst-token",     tier: 22, out: "assets/tokens/sandbox/sergeant-hurst-token.png",
    sourceFromExisting: "assets/portraits/sandbox/sergeant-hurst-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#4a5a3a", highlight: "#8a9a78", shadow: "#0a1208" } /* Yeomanry militia green */ },
  { id: "sbx-master-ferrick-token",     tier: 22, out: "assets/tokens/sandbox/master-ferrick-token.png",
    sourceFromExisting: "assets/portraits/sandbox/master-ferrick-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a3a18", highlight: "#9a7848", shadow: "#1a0e04" } /* dark walnut */ },
  // Hardby (6)
  { id: "sbx-hesp-olfair-token",        tier: 22, out: "assets/tokens/sandbox/hesp-olfair-token.png",
    sourceFromExisting: "assets/portraits/sandbox/hesp-olfair-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#8a7038", highlight: "#c4a868", shadow: "#1a1408" } /* Hardby brass */ },
  { id: "sbx-sister-wren-token",        tier: 22, out: "assets/tokens/sandbox/sister-wren-token.png",
    sourceFromExisting: "assets/portraits/sandbox/sister-wren-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#4a5a3a", highlight: "#7a8a68", shadow: "#0a1208" } /* Old Faith green */ },
  { id: "sbx-helka-fenn-token",         tier: 22, out: "assets/tokens/sandbox/helka-fenn-token.png",
    sourceFromExisting: "assets/portraits/sandbox/helka-fenn-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a6a7a", highlight: "#94a4b8", shadow: "#0a1018" } /* salt-fen blue-grey */ },
  { id: "sbx-captain-fels-token",       tier: 22, out: "assets/tokens/sandbox/captain-fels-token.png",
    sourceFromExisting: "assets/portraits/sandbox/captain-fels-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#1a3a5a", highlight: "#5878a0", shadow: "#08111a" } /* Hardby civic deep blue */ },
  { id: "sbx-mistress-korr-token",      tier: 22, out: "assets/tokens/sandbox/mistress-korr-token.png",
    sourceFromExisting: "assets/portraits/sandbox/mistress-korr-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a6a4a", highlight: "#b8a888", shadow: "#1a1408" } /* tea-house warm cream */ },
  { id: "sbx-vell-marad-token",         tier: 22, out: "assets/tokens/sandbox/vell-marad-token.png",
    sourceFromExisting: "assets/portraits/sandbox/vell-marad-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#4a3a5a", highlight: "#8478a4", shadow: "#0a081a" } /* scholarly purple */ },
  // Rel Astra (6)
  { id: "sbx-rinya-dane-token",         tier: 22, out: "assets/tokens/sandbox/rinya-dane-token.png",
    sourceFromExisting: "assets/portraits/sandbox/rinya-dane-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#6a7878", highlight: "#a4b8b8", shadow: "#0a1212" } /* cool silver */ },
  { id: "sbx-brother-ostrik-token",     tier: 22, out: "assets/tokens/sandbox/brother-ostrik-token.png",
    sourceFromExisting: "assets/portraits/sandbox/brother-ostrik-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#7a3838", highlight: "#c46a6a", shadow: "#1a0808" } /* Heironeous oxblood */ },
  { id: "sbx-edril-thence-token",       tier: 22, out: "assets/tokens/sandbox/edril-thence-token.png",
    sourceFromExisting: "assets/portraits/sandbox/edril-thence-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#3a6a5a", highlight: "#78a898", shadow: "#08120e" } /* coastal verdigris */ },
  { id: "sbx-lieutenant-mada-token",    tier: 22, out: "assets/tokens/sandbox/lieutenant-mada-token.png",
    sourceFromExisting: "assets/portraits/sandbox/lieutenant-mada-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#8a5018", highlight: "#c89238", shadow: "#1a0e04" } /* Aerdy imperial gold */ },
  { id: "sbx-magister-vaden-token",     tier: 22, out: "assets/tokens/sandbox/magister-vaden-token.png",
    sourceFromExisting: "assets/portraits/sandbox/magister-vaden-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#3a2a5a", highlight: "#7868a4", shadow: "#08051a" } /* College deep purple */ },
  { id: "sbx-veth-avir-token",          tier: 22, out: "assets/tokens/sandbox/veth-avir-token.png",
    sourceFromExisting: "assets/portraits/sandbox/veth-avir-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#3a3a4a", highlight: "#7a7a90", shadow: "#08080e" } /* archive shadow */ },
  // Greyhawk (5)
  { id: "sbx-skarrel-token",            tier: 22, out: "assets/tokens/sandbox/skarrel-token.png",
    sourceFromExisting: "assets/portraits/sandbox/skarrel-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#6a4a28", highlight: "#a87858", shadow: "#1a0c08" } /* halfling-warm brown */ },
  { id: "sbx-kell-marrow-token",        tier: 22, out: "assets/tokens/sandbox/kell-marrow-token.png",
    sourceFromExisting: "assets/portraits/sandbox/kell-marrow-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#4a4a4a", highlight: "#8a8a8a", shadow: "#0a0a0a" } /* pugilist iron */ },
  { id: "sbx-brisa-wood-token",         tier: 22, out: "assets/tokens/sandbox/brisa-wood-token.png",
    sourceFromExisting: "assets/portraits/sandbox/brisa-wood-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a6a4a", highlight: "#94a888", shadow: "#0a1208" } /* ash-tree silver-green */ },
  { id: "sbx-sergeant-vandros-token",   tier: 22, out: "assets/tokens/sandbox/sergeant-vandros-token.png",
    sourceFromExisting: "assets/portraits/sandbox/sergeant-vandros-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#5a5a6a", highlight: "#94949c", shadow: "#0a0a14" } /* Foreign Quarter civic gray */ },
  { id: "sbx-iren-velash-token",        tier: 22, out: "assets/tokens/sandbox/iren-velash-token.png",
    sourceFromExisting: "assets/portraits/sandbox/iren-velash-portrait.png", skipGeneration: true,
    postProcess: "round-token-512",
    ring: { base: "#6a5a3a", highlight: "#a89878", shadow: "#1a1208" } /* manuscript vellum brown */ },
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
