# Remediation Plan — Phases 2–6

Working plan for the narrative/continuity/infrastructure fixes identified in the
2026-08-26 full-module review. Phases 7–9 scene packs are explicitly out of
scope (next plan). Statuses: [ ] pending · [x] done · [~] partial.

## Locked decisions (canon registry)

- **Harbor vacancies:** Phase 3's version is canon — three deaths (Olm,
  natural, 580 CY; Mirin Vesh, staircase fall, 581; Ervan Dale, brief illness,
  582), seats **First / Third / Fifth**. Phase 4's journals (stroke/drowning/
  leave-of-absence, "eighth/ninth/tenth seat") are rewritten to match.
- **Kethren Ilvath is male** everywhere. Phase 8 journals (~8 she/her
  instances) get corrected; Phases 6/7/9 already use he.
- **C&V Hardby branch address:** Counting House Lane (keyed content wins).
  The Mossen Place letter's "4 Brass Lane" is corrected.
- **Veska Maelan:** Whalemarket Quay. **Coopered Wreck:** Black Cog Lane.
  (The Mossen Place letter's two "Long Quay" references are corrected.)
- **Renames:** Loftwick solicitor "Mistress Aldaen Veth" → **Mistress Seffa
  Norrell** (kills collision with the P4 Senior Commissioner AND with P2's
  Doril Veth). Hardby grocer "Mistress Edda Halver" → **Mistress Betha
  Halver** (kills the Edda collision with P5 Councilor Edda Halvern). C&V
  Hardby vault clerk "Halver Onn" → **Berrin Onn** (kills same-city Halver
  collision with the grocer). P6 Greyhawk: "Aerel Mossen" → rename in Phase E
  (kills safe-house collision); Greyhawk "Tannerway" → rename in Phase E.
- **Party:** six PCs, all women — Alicia Trévanne, Cam, Ellyndra "Elle"
  Swiftfoot, Gianni Varren, Kitty Raleigh, Selvara Stormborn. **Cam is
  assumed out.** Combat calibration is written for FIVE PCs as primary text,
  with an italicized *(six PCs: …)* variant line. Cam's Phase 8–9
  halfling-network payoff falls back to **Elle** (documented in pc-threads);
  Cam's thread page is kept dormant, not deleted. Party level at plan time:
  halfway to 6th, mid-Phase 2.
- **Jaron Pell** is added to the C&V Hardby branch staff roster (front-desk
  bonded clerk) rather than removed from Caelith's letter.
- **Year format:** all in-world years are 3-digit CY. The 4-digit strays in
  P3/P4 (1580, 1576–82, 1556, 1462, 1571–74, 1578–81…) drop the leading 1.

## Phase 0 — Foundations [x]

- [x] Party visual bible: `assets/_reference/party/` (six canonical refs +
  `party-prompts.md` with per-PC likeness blocks).
- [x] `generate-images.mjs`: PARTY constant, `partyRefs()`,
  `activePartyRefs()` helpers; group illustrations default to the active five.
- [x] Scene-link audit (results below).
- [x] This plan committed.
- Key handling: OPENAI_API_KEY passed per-invocation only; never in the repo.

## Phase A — Stabilize Phase 2 (live phase; surgical) [x]

- [x] GM-brief note: the roadhouse "R." mark reads as a *lead*, not flavor —
  guidance for containing the detour to one session (Rosalin beat intact).
- [x] Wire all P2 scenes to journals + link pins (see audit: 8 scenes, 31 pins).
- [x] Banner on `docs/phase-2-master.md`: scene flow superseded by
  `phase-2-clean-motion.md` + shipped Movement journals.

## Phase B — Phase 3 ready before Hardby [x] — shipped v1.4.4

- [x] Address/canon sweep: Counting House Lane; Whalemarket Quay; Black Cog
  Lane (Mossen Place letter + master doc).
- [x] Jaron Pell added to branch staff (journal-phase-3-cv-branch).
- [x] Year sweep, P3 journals + master.
- [x] Rename: Seffa Norrell (solicitor), Betha Halver (grocer), Berrin Onn
  (vault clerk) — journals + masters.
- [x] Hardby City Map scene: ~14 linked pins (Mossen Place, grocer, C&V
  branch, Veska, Coopered Wreck/Black Cog, Gynarchy Registry, caravan yard,
  gates, Hall of Salt and Tide, infirmary, Ailen's workshop…).
- [x] Wire remaining P3 scenes to journals; link Mossen Place floor pins (20).
- [x] Combat recalibration for 5 PCs w/ italic 6-PC variants: Whitemoor
  blades, clock-5 squad attack, calibration note in arrival GM brief.
- [x] pc-threads: Cam dormancy + Elle fallback note (do here so it ships
  before it matters).
- **Release checkpoint: v1.4.4** (Phases 0+A+B together).

## Phase C — Phase 4 coherent before Rel Astra [x] — shipped v1.4.5

- [x] Harbor-vacancy harmonization to P3 canon (Three Seats journal, Halask
  briefing, candidate dossiers; seat numbering First/Third/Fifth).
- [x] Year sweep, P4 journals + master.
- [x] NEW optional combat beat: interceptable chandlery arson (segment-3
  witness-pressure event) — one journal page, calibrated 5 PCs @ ~7th level,
  italic 6-PC variant.
- [x] Path-3 calibration note gains a five-PC line.
- [x] Rel Astra city map: an unwired map already existed (assets/maps/) — new
  pinned scene built on it; no generation needed. Labeled Hardby variant
  produced (deterministic PIL labels over the original; AI text passes kept
  misspelling/duplicating labels) and set as the city scene background.
- [x] Wire P4 scenes to journals + pins.
- **Release checkpoint: v1.4.5.**

## Phase D — Phase 5 scenes [x] — shipped v1.4.6

- [x] GENERATE + build: Quill Street rooms battlemap (the phase's only
  combat); Aldea's cottage (double-serves P6 Vector B); Sera's shop and the
  Council chamber stay theatre-of-the-mind (skipped by design; Sera's shop
  is pinned on the city map instead).
- [x] Courier-chain pins on the Loftwick city scene (dead-drop, Cooper's lane
  crossing, courier desk, Quill Street, Hall of Bonds).
- [x] Wire P5 scene(s) to journals.
- **Release checkpoint: v1.4.6.**

## Phase E — Phase 6 closed out [x] — shipped v1.4.7

- [x] Kethren pronoun sweep (P8 journals + P8 master — freebie outside 2–6).
- [x] Renames: Aerel Mossen → new surname; Greyhawk Tannerway → new street.
- [x] CORRECTION: Verth, Iren, and Vone already exist as fully-arted actors
  in phase-5-actors (introduced as P5 Vector contacts) — the P6 master's
  claim that all twelve figures live in phase-6-actors was the error. No
  generation needed; review finding withdrawn.
- [x] Wire Dren Marsh's existing custom token (P3 actor).
- [x] GENERATE: Greyhawk full city map (+ scene, pinned: Brass Crow, Hand of
  Coals, Kestrel & Reed, Velash's shop, Vone's archive, Korre's street,
  derelict bathhouse).
- [x] Manifest audit: 405 jobs, 1 missing output — a filename mismatch
  (the-little-palace-entrance.png vs job path); file renamed to match. All
  other outputs exist.
- [x] Wire P6 scenes to journals + pins.
- **Release checkpoint: v1.4.7.**

## Scene-link audit (2026-08-26)

Of 34 Phase 2–6 scenes, **33 had no journal link**; 51 pins existed with no
journal/page target (text labels only); 17 scenes had no pins at all. The
only wired scene was Records Alcove (C&V Loftwick), fixed in v1.4.2.
Wiring is distributed across Phases A–E per the phase each scene belongs to.

## Deferred (next plan)

Phases 7–9 scene packs (Tarnsmere surface + threshold complex + Stair
Gallery; Witness Station Seven; the cairn field sites); P7–9 pin wiring;
Cam-portrait watermark cleanup if her player returns.
