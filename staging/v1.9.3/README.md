# v1.9.3 staging

Nothing in this folder ships. The build reads only `packs/_source`, `module.json` and `README.md`, so files here stay inert until they're moved into place.

## Ankheg Elder ("the old one", Fallow Ford)

- **`fvtt-Actor-ankheg-elder.json`** is for importing into a world now. It's built from the world's Monster Manual ankheg export, nine changes and nothing else. It keeps the Monster Manual art and statblock embed, so the world needs `dnd-monster-manual` active. Its token ring is acid green, which tells it apart from the other five.
- **`actor-ankheg-elder.json`** is the pack source for `travel-1-actors` (`BR2T1ActAnkElder`). It uses module art and module ids/`_key`s, and has no midi-qol fields and no Monster Manual embed. It passed `validate-pack-keys` and a compile round trip.

Changes from the Ankheg:

- 65 hp (`6d10 + 32`), which is the Enemies table's flat +20.
- Acid Spray recharges on a 5–6.
- Bite damage is **Slashing**. The world export said Piercing, but the 2024 Monster Manual (p. 18) and SRD 5.2 both print Slashing.
- CR 2 / 450 XP is unchanged, matching the Enemies table.

The art is generate-images **tier 48**: `assets/portraits/ankheg-elder-portrait.png` and `assets/tokens/ankheg-elder-token.png`. Both files are generated but not yet committed.

### To put it in 1.9.3

1. Move `actor-ankheg-elder.json` into `packs/_source/travel-1-actors/`.
2. On the Fallow Ford Enemies page, the "This module ships no beast or monstrosity actors — 155 of its 157 NPCs…" paragraph stops being true. Say that the old one ships as `@UUID[Compendium.blooming-rot-2.travel-1-actors.Actor.BR2T1ActAnkElder]{Ankheg Elder}` and the other five still come from a monster compendium, then recount the NPC figures.
3. In `docs/travel-intermission-1-master.md`, change `travel-1-actors` (7 NPCs) to 8, and update the "Ankhegs and sharks are not shipped as actors" bullet.
4. Commit the tier-48 jobs, which sit in the working copy of `scripts/generate-images.mjs` next to the uncommitted `--refine` work, along with the two images.
5. Bump the version, build packs, validate keys, and build the release.
