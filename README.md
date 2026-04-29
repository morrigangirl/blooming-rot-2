# Blooming Rot, Part 2

A Greyhawk D&D adventure module for FoundryVTT V13, set in the pre-Greyhawk-Wars Yeomanry. Continues from *Blooming Rot, Part 1*.

- **Foundry compatibility:** V13 (verified 13.351)
- **System:** dnd5e 5.3.0 (verified)
- **Rules:** D&D 2024 ("One D&D")

## What's in Phase 1

Phase 1 covers the party's return to Loftwick after defeating (but not killing) Haskur Vandrell. It establishes:

- The opening read-aloud and scene-by-scene first evening
- **Caelith Dunivar**, Keeper of Foreign Correspondence — the NPC who lodges the party at the Little Palace, congratulates them publicly, and warns them privately
- The Little Palace itself, a compact civic guesthouse with ceremonial leftovers, fully keyed across three floors (main, second, cellar) with shipped maps and Foundry scenes on a 5-foot grid
- The evidence list from Haskur's abandoned gear, including the central clue: a Rel Astran letter of credit pre-dating the fight by six weeks
- Optional first-night complications
- The forward hook pointing east toward Rel Astra through trade and credit networks

The conspiracy is not resolved. Haskur is not the mastermind. Phase 1 establishes only that someone east of the Sheldomar Valley was financially and logistically prepared for him.

## Installation (development)

```bash
npm install
npm run build:packs
```

Then symlink this directory into your Foundry `Data/modules/` folder, or zip and install via manifest URL.

## Building & editing content

The module ships JSON sources under `packs/_source/`. Edit the JSON; rebuild with `npm run build:packs` to regenerate the LevelDB packs Foundry actually reads.

To round-trip changes made inside Foundry back to JSON, use `npm run unpack:packs`.

## Layout

```
module.json                       Foundry manifest
package.json                      build tooling
scripts/                          fvtt-cli wrappers
packs/_source/                    editable JSON (one file per top-level doc)
  phase-1-journals/
  phase-1-actors/
  phase-1-scenes/
  phase-2-journals/
  phase-2-actors/
packs/                            compiled LevelDB (regenerate after editing)
assets/
  maps/                           little-palace-{main-floor,2nd-floor,cellar}.webp; Loftwick.jpg
  portraits/                      Caelith-Dunivar-Portrait.png
  tokens/                         token art (TBD; falls back to actor img)
```

## Asset status

**In:** Three Little Palace maps (main, 2nd, cellar) at **5000 × 3750 webp**, gridless. Loftwick city map at 3072 × 4096 jpg. Portraits for Caelith Dunivar and Trina Alvere. **Four Foundry scenes** ship in the **Phase 1 — Scenes** compendium — Main Floor, Second Floor, Cellar, and Loftwick — at 100 px / 5 ft, with structural walls, doors, and ambient lights placed. Main Floor is set as the **default active scene**.

Actors ship with `prototypeToken` configured: Caelith and Trina use their portraits as token art with friendly disposition; Merev Sarth uses mystery-man with hostile disposition.

**Still TBD:** dedicated round / cropped token art (currently the actors' prototype tokens scale the portrait into the token frame; works fine, but a tighter crop would render cleaner).

**Grid alignment.** Maps are at 100 px / 5 ft natively at their shipped 5000 × 3750 size. The grid is already aligned on import. You'll only need **Configure Scene → Grid → Align Grid Tool** if you replace the maps with new artwork.

## Phase 1 journal index

- **Return to Loftwick** — opening read-aloud, GM summary, scene sequence, first-night complications, forward hook
- **Caelith Dunivar** — NPC profile, public congratulations, private warning, evidence list
- **Little Palace** — keyed location overview (M1–M12 main floor, U1–U6 second floor, C1–C7 cellar) and the Map Index for the three shipped scenes. Includes the GM-only **C7 Old Service Tunnel** hook

## What's in Phase 2 — *The Dead Man's Receipts*

Phase 2 turns Haskur's gear into an investigation that reveals a multi-year conspiracy with active nodes in Rel Astra, Hardby, and Loftwick itself. It does **not** resolve the conspiracy and does **not** make Haskur the mastermind.

The horror is administrative: forged paperwork, a quietly-murdered clerk, a missing grain factor, polite political pressure, and a professional thief sent for evidence rather than blood.

- **Caelith reveals himself** as the Yeomanry's *Hand of the Duke* — the spymaster role the Duchy maintains no formal title for. He gives the party the brass-token credential and a witness, **Trina Alvere**.
- **Trina Alvere** — patron of the arts, Caelith's private advisor, and (in fact) a 10th-level Archfey Warlock pacted to **Tasha / Iggwilv as the Quiet Patroness**. She is a friend to the party and a quiet mentor to the party's Warlock, **Alicia**. Phase 2 does not reveal her patron's identity. Full statblock and Alicia mentor notes shipped.
- **Seven new evidence items** uncovered in daylight examination: the burned spell focus, false letter of passage (agricultural assessor cover), clipped coin with eastern countermark, black-lacquered scroll tube with abjuration seal, the vellum strip *HARBOR BEFORE THRONE*, the ledger fragment (`VANDRELL settled / MORAVEN delayed / GILST transferred`), and the hidden seed pouch tying Haskur to a false-crop scheme.
- **Three converging threads**: **Cindren & Vhal, Bonded Factors** (suspicious but not yet proven guilty; offices in Rel Astra, Hardby, and a Loftwick satellite); **Merro Gilst** (a quietly-murdered Loftwick bonds clerk on the firm's shadow payroll); **Tamsin Moraven** (a missing grain factor who was investigating false crop receipts).
- **Optional investigation** of Gilst's rented room above a Wick Lane stationer — the searcher missed three things, including a Hardby-chopped bank instrument that proves Gilst was on Cindren & Vhal's retainer.
- **Political pressure** from **Arthen Moll**, Deputy Voice of Civic Reconciliation — a sincere, well-dressed man with a 1,200 gp bribe and a faction motion in his back pocket.
- **A retrieval attempt** by **Merev Sarth**, professional thief (CR 4) — contracted to steal or destroy evidence, not to kill. She is hard, fast, and pragmatic; she will surrender if cornered.
- **Three travel approaches** the party can take east — Official Delegation (legal, slow, visible), Commercial Cover (medium, plausible, requires discipline), Quiet Pursuit (fast, no protection if caught).
- **Pressure Clock** — a six-segment escalation mechanic that closes Phase 2 around the party if they delay or act too publicly.
- **Ending read-aloud** that points toward Rel Astra without proving Haskur is there.

## Phase 2 journal index

- **Phase 2 — The Morning Evidence Review** — opening read-aloud, Caelith's *Hand of the Duke* reveal, the seven-item daylight evidence list with skill check DCs
- **Phase 2 — Investigation** — the Records Alcove research scene, Cindren & Vhal firm dossier, Merro Gilst dossier, Gilst's Rented Room (optional), Tamsin Moraven dossier
- **Phase 2 — Political and Criminal Interruptions** — Arthen Moll's pressure visit, Merev Sarth's retrieval attempt
- **Phase 2 — Departure** — three travel approaches, the Pressure Clock, ending read-aloud
- **Trina Alvere** — profile and Mentor Notes for Alicia (shipped under Phase 2 Journals)

## Phase 2 NPCs

- **Trina Alvere** — Warlock 10 (Archfey, pact: Tasha / Iggwilv as the Quiet Patroness). CR 7, AC 14, HP 70. CHA 20, save DC 16, spell attack +8. Two 5th-level Pact slots. *Eldritch Blast* + *Agonizing Blast*; *misty step*, *hypnotic pattern*, *dimension door*, *greater invisibility*, *hold monster*, plus *Misty Visions* and *Mask of Many Faces* at will. Will not fight in Phase 2.
- **Merev Sarth** — professional thief, CR 4, AC 15, HP 65. Sneak Attack +14 (4d6), Cunning Action, Uncanny Dodge, Evasion. On a retrieval contract, not a kill contract; surrenders rather than dies if cornered.
