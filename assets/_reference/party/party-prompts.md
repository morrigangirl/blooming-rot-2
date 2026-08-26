# Party Visual Bible — Blooming Rot 2

Canonical per-PC reference images and prompt blocks for AI image generation
(`scripts/generate-images.mjs`, gpt-image-2 via `/v1/images/edits`).

**Rules of use.** Any generated image that depicts a PC MUST pass that PC's
reference image via the job's `referenceImages` array AND include the likeness
block below in the prompt. The module `ART_STYLE` constant is the style
unifier — reference images supply *identity*, not style. All six PCs are
women. Group illustrations default to the ACTIVE FIVE (Cam is assumed out of
the party; see status notes) unless the GM asks otherwise. If Cam's player
returns, flip her status here and in the `PARTY` block of
`generate-images.mjs` — nothing else needs to change.

---

## Alicia Trévanne — human warlock (Pact of the Blade) — ACTIVE
Ref: `assets/_reference/party/alicia-warlock-blade.png`
Likeness: A fair-skinned young human woman with long copper-red hair worn in a
high ponytail, loose face-framing strands and a soft fringe; warm brown eyes,
composed expression. Fitted powder-blue doublet with fine gold seam-piping and
a high collar, left arm sleeved, right arm bare showing an intricate black
scrollwork tattoo running shoulder to wrist; dark leather belt; dusty-rose
glove on her sword hand. Carries a slender ornate gold-hilted blade that gives
off a faint golden radiance (her pact weapon).
Palette anchors: powder blue + gold, copper hair, rose glove.

## Cam — halfling rogue — INACTIVE (assumed out; keep likeness canonical)
Ref: `assets/_reference/party/Cam-Halfling-Rogue.png`
Likeness: A young halfling woman with warm bronze skin and very long, thick
dark-brown hair, center-parted with two slim front braids; strikingly large
amber-gold eyes, delicate features. Rust-and-amber leather-and-cloth top over
a dark maroon inset, layered fine chain necklaces with small silver rings.
Notes: reference carries a third-party watermark (lower right) — crop or
regenerate before any use that shows that corner. Her Phase 8–9 halfling-
network payoff falls back to Elle if Cam stays out (see pc-threads journal).
Palette anchors: rust/amber/maroon, bronze skin, amber eyes.

## Ellyndra "Elle" Swiftfoot — halfling monk — ACTIVE
Ref: `assets/_reference/party/elle-halfling-monk.jpg`
Likeness: A wiry halfling woman, small and quick, mid-motion whenever
possible; long wild chestnut-brown hair streaming, red ribbon streamers tied
in it; pale grey-green eyes, fierce focused brow; slightly pointed ears.
Saffron-yellow monk's tunic and loose trousers, crimson sash at the waist,
crimson wrist-wraps, soft brown boots and leg wraps.
Palette anchors: saffron yellow + crimson, chestnut hair.
Style note: her ref is loose watercolor — rely on ART_STYLE to normalize.

## Gianni Varren — human ranger — ACTIVE
Ref: `assets/_reference/party/gianni-ranger-.jpg`
Likeness: An olive-skinned human woman with near-black hair center-parted
into two long braids, loose strands at the temples; hazel-green eyes, strong
dark brows, small ear stud; direct, confident gaze. Cream homespun shirt with
rolled sleeves under a dark teal-grey embossed leather cuirass with a crossed
chest-strap and a single shoulder pauldron; a wrapped weapon stock rises over
her right shoulder.
Palette anchors: cream + dark teal leather, black braids.

## Kitty Raleigh — tiefling druid (chthonic) — ACTIVE
Ref: `assets/_reference/party/kitty-druid-cthonic-tiefling.png`
Likeness: A tiefling woman with slate grey-violet skin and faint freckles,
blank glowing white eyes (no visible iris), black hair in two very long
braids, two ram-curved tan horns sweeping back over her skull, pointed ears
with three small gold drop earrings; slender spaded tail. Moss-green laced
bodice-dress under a brown leather corset-belt with brass bosses; layered
bead-and-pendant necklaces with a small green stone; thin vine-scar tattoo
ringing her left upper arm. Carries a tall twisted wooden staff wound with
cord and an oval wooden shield painted with an ivy-wreathed lynx face.
Palette anchors: moss green + brown leather, grey-violet skin, white eyes.

## Selvara Stormborn — human sorcerer (storm) — ACTIVE
Ref: `assets/_reference/party/selvara-human-sorcerer.jpg`
Likeness: A somber pale-tan human woman with wavy chestnut hair loose under a
deep-maroon hooded cloak; mismatched storm-touched eyes — left pale blue,
right clouded white — crossed by a thin orange scar running diagonally over
the bridge of her nose and beneath the right eye. Dark blue-green embroidered
robe; cord necklace with a round lapis-blue amulet. Carries a dark wooden
spear with a leaf-shaped steel head; when casting, blue lightning crackles
in and around her free hand.
Palette anchors: maroon hood + blue-green robe, lapis amulet, blue lightning.
