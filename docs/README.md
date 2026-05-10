# Blooming Rot 2 — GM Prep Documents

This directory holds GM-facing PDF documents generated from the module's
journal text, actor biographies, illustrations, and portraits. **They are
not part of the shipped Foundry module** — they live here so you can copy
them to wherever you read GM prep (Drive, paper printout, tablet, etc.).

## What's here

| File | Pages | Size | What it is |
|---|---:|---:|---|
| `blooming-rot-2-gm-prep.pdf` | ~340 | ~40 MB | The full thing: cover, overview, all 5 phases, full sandbox reference, every NPC profile |
| `phase-1-gm-prep.pdf` | ~25 | ~2 MB | Phase 1 — Loftwick's Return |
| `phase-2-gm-prep.pdf` | ~55 | ~7 MB | Phase 2 — The Dead Man's Receipts |
| `phase-3-gm-prep.pdf` | ~75 | ~11 MB | Phase 3 — The Hardby Investigation |
| `phase-4-gm-prep.pdf` | ~55 | ~8 MB | Phase 4 — The Rel Astra Confrontation |
| `phase-5-gm-prep.pdf` | ~60 | ~6 MB | Phase 5 — The Small Matter |
| `sandbox-gm-prep.pdf` | ~75 | ~8 MB | Sandbox & Downtime — 4 cities + ~30 anchor NPCs |

All seven PDFs share the same source content; the per-phase files are
just convenient extracts for session prep.

## How to use

- **Before the campaign:** read Phases 1 and 2 plus the Sandbox Reference. The first three sessions are tightly scripted; everything after grows from how players handle them.
- **Before each session:** re-read the phase chapter for that session's expected scene. The flow diagram tells you which scene branches off where.
- **Decision callouts** are bordered cream-tinted boxes inline with narrative — every important branch the GM needs to be ready for is flagged this way.
- **Read-aloud blocks** are tan-tinted blocks designed to be read at the table verbatim (or paraphrased).
- **NPC profiles** include portraits, archetype + CR, and a paragraph on role and motivation. Combat NPCs include their full stat block (HP, AC, attacks, features).

## How these are generated

```bash
.venv-docs/bin/python scripts/build-gm-prep-pdf.py
```

The generator reads:

- `packs/_source/phase-{1,2,3,4,5}-journals/*.json` — narrative HTML
- `packs/_source/phase-{1,2,3,4,5}-actors/*.json` — NPC stat blocks + biographies
- `packs/_source/sandbox-actors/*.json` — sandbox NPCs
- `packs/_source/sandbox-journals/*.json` — sandbox / downtime text
- `assets/portraits/*.{png,webp}` — per-NPC portraits
- `assets/illustrations/*.png` — scene illustrations

It writes seven PDFs into this directory. Images are resized and
JPEG-compressed in-place under `.build/pdf-thumbs/` (cached across runs).

## What's NOT in here

These docs **contain spoilers** — the antagonists, the Quiet Patroness,
the true identity of "E." All player-facing materials live in the Foundry
module itself (`packs/`) and the released module zip.

## License

Same as the rest of the module. The PDFs reproduce text and art written
for this module; reused elements (PHB/DMG/MM stat block references,
public-domain Greyhawk place names) are credited inline where relevant.
