# Blooming Rot, Part 2

A Greyhawk D&D adventure module for FoundryVTT V13, set in the pre-Greyhawk-Wars Yeomanry. Continues from *Blooming Rot, Part 1*.

- **Foundry compatibility:** V13 (verified 13.351)
- **System:** dnd5e 5.3.0 (verified)
- **Rules:** D&D 2024 ("One D&D")
- **NPC actors ship with populated items, features, and spells** as embedded compendium documents. Where the user has the official D&D 2024 PHB / DMG / MM modules installed, items carry `flags.core.sourceId` hints that auto-link on import; if the user's installation differs, items still function with their full embedded data and the GM can drag-replace at leisure. See *NPC Actor Loadouts* below.

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
  phase-3-journals/
  phase-3-actors/
  phase-4-journals/
  phase-4-actors/
  phase-5-journals/
  phase-5-actors/
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

## What's in Phase 3 — *Hardby Variant: Harbor Before Throne*

Phase 3 takes the party to **Hardby**, the small Free City on the south shore of the Wooly Bay where Cindren &amp; Vhal actually banks and operates day-to-day. The Loftwick satellite the party investigated in Phase 2 was a tiny outpost; the Hardby branch is the firm's commercial heart.

- **Three arrival modes** — Official Delegation, Commercial Cover, Quiet Pursuit — each with a different opening scene, set of available witnesses, and Pressure Clock starting position.
- **Veska Maelan**, trade-clearing notary on Whalemarket Quay — Caelith's quietest contact and the procedural anchor for the Phase 3 investigation. Reads the Aerdi clearing-marks better than anyone outside the firms.
- **Anver "Tarsh" Resh**, the broker who hired Merev Sarth — confronted at the Coopered Wreck tavern in the dock district. The clerk who left the office and never quite stopped clerking. Will not personally kill; surrenders rather than make a killing blow himself.
- **Three paths into the C&amp;V Hardby branch** — Path 1 the burglary (Quiet Pursuit only), Path 2 the sympathetic clerk Vella Tannin (Commercial Cover), Path 3 the subpoena (Official Delegation).
- **Three Tamsin Moraven recoveries** — alive in a Hardby warehouse on Black Cog Lane (Quiet Pursuit), alive at the Whitemoor Estate two days east (Commercial Cover), or her body and smuggled last letter (Official Delegation).
- **The "Harbor Before Throne" reveal** — operational reveal at Castrian Vell's salon: the conspiracy is positioning to seat three commissioners on Rel Astra's harbor commission *before* the next Aerdy succession resolves the throne.
- **Caelith's continuing letters (1–3)** by post from Loftwick.
- **Six-segment Phase 3 Pressure Clock** — faster than Loftwick's because Hardby is faster than Loftwick.
- **Three departure routes** to Rel Astra, with full route consequences.

## Phase 3 NPCs (shipped as Foundry actors)

- **Veska Maelan** (CR 1 non-combatant), **Anver Resh** (CR 6 broker — Cunning Action, Sneak Attack 4d6, Uncanny Dodge, Evasion, smoke pellets; will not personally kill).
- **Solen Mereth** (CR 0 compromised senior clerk), **Castrian Vell** (CR 0 social host), **Hesren Vesh** (CR 0 recalled junior clerk), **Ailen Moraven** (CR 1/8 Tamsin's daughter), **Zoria Weis** (CR 1/4 Gynarchy under-clerk asset), **Mira Cindren** (CR 1 Hardby junior partner).

## What's in Phase 4 — *Rel Astra*

Phase 4 is the long climax. The party arrives in the city the conspiracy actually operates from. Their job: identify the three commissioner candidates the conspiracy intends to seat on Rel Astra's harbor commission, and either stop the seating, indict Tarlith Vhal Sereth in Aerdi commercial court, or remove him from play.

- **Three arrival modes** — by sea (the Lacquer Wave to the Old Harbor), by land (overland coastal road to the West Gate), or by diplomatic carriage (Customs Quay arrival with full Aerdi accreditation).
- **Therion Halask**, retired Aerdy advocate at the Brass Sextant coffee-house — Caelith's Rel Astra correspondent and the procedural anchor for any indictment.
- **The seven-seat Harbor Commission with three vacancies**, with a complete diagram of the conspiracy's intended seating play.
- **Three candidate dossiers** — Lord Faren Mirelth (the reformer with private debts; easily disqualified under §187), Magister Andrune Vesh (the technocrat pressured through his sister-in-law's customs case), and Mistress Coriath Tenrel (the volunteer ambitious for senior commissioner; cannot be removed by relieving pressure).
- **Tarlith Vhal Sereth** — senior partner of C&amp;V Rel Astra, the named villain. Late fifties, Aerdy, very thin, silver-white hair, dark-grey advocate's overcoat. Three viable resolutions: indictment in Aerdi commercial court (Path 1, slow + certain), private removal (Path 2, fast + costly long-term), kinetic removal (Path 3, last resort).
- **Lord Galenix Naelax**, the Aerdy claimant the conspiracy is positioning behind. Three party options: brief him, leave him alone, or use him as the political vehicle for their own purposes.
- **Caelith's continuing letters (4–6)** including the late spoiler-careful reveal that *"the conspiracy you have named is not the conspiracy."*
- **Four-segment Phase 4 Pressure Clock** — fewer segments, harder hits.
- **The "E." thread** — two more observations of the foreign annotation hand bring the total to five. Phase 4 does not name the writer, does not confirm species, does not name the city or organization. It only confirms that the writer exists, is not Aerdy, has been advising the firm for at least a decade, and is not someone Sereth has ever met.

## Phase 4 NPCs (shipped as Foundry actors)

- **Tarlith Vhal Sereth** (CR 5 non-combatant villain with bodyguard chain — Two Veterans + Knight Bodyguard Captain at his offices; he yields if isolated and reduced to half HP; will not personally kill).
- **Therion Halask** (CR 1/2 procedural anchor; killing him closes Path 1).
- **Belven Astor** (CR 1/2 honest councilor + chandler), **Galenix Naelax** (CR 1 Aerdy claimant), **Faren Mirelth** (CR 1/4 reformer), **Andrune Vesh** (CR 1/2 academic), **Coriath Tenrel** (CR 1 advocate).

## What's in Phase 5 — *The Small Matter*

Phase 5 is the campaign's pivot from investigating a conspiracy to **actively counter-operating against a conspiracy that is now reading the party's mail**. Set primarily in Loftwick, an aftermath / counterintelligence / political phase. The Little Palace feels familiar but less safe than before. The party returns to find Caelith's institutional standing collapsed, an active leak inside his office, and three new actionable threads.

- **Brane's Closure motion has passed.** Caelith has no institutional standing left; the Audit Hall has rescinded clerical support. The motion enters its mandatory fourteen-day review period — Phase 5's outer deadline. On Day 9 it comes to a binding vote.
- **Ostren Pell, the leak**, has been identified. Coerced through ambition (a gambling debt his late father left him) and held in place by his unmarried older sister Sera. Caelith pities him and uses him; both are true.
- **Trina's "old correspondent in the wood" has answered.** A sealed packet from **Mistress Aldea Veren** — half-elven retired scholar of pre-Aerdy paleography — carries three new spoiler-safe observations on the "E." annotation hand: a foreign sealing wax, a hand trained by reading court scripts but not by being taught them, and a geographic impossibility for at least one annotation.
- **Haskur Vandrell has been seen in Greyhawk City.** A Yeomanry-aligned contact filed an affidavit five days ago. Haskur was at the Brass Crow counting-house in the Foreign Quarter, in conversation with a younger man whose gait was "not Aerdi and not Yeomanry."
- **Five Pell-handling choices** with continuing consequences (expose, turn, feed false information, shadow, remove). Killing Pell is treated as a serious moral and political failure unless extreme circumstances justify it.
- **Five-lie False-Packet Menu** the party can feed through Pell to misdirect the conspiracy's response.
- **Five-location courier-chain investigation** culminating in the optional Vesten Quill skirmish — the only combat encounter in Phase 5.
- **Six-segment Pressure Clock** mapped to specific in-game days, with the Closure motion vote as a fixed Day 9 outer bound.
- **Three (or four, on Path A) ending vectors** — Greyhawk City (follow Haskur), the Wood Correspondent (visit Aldea in person), Counter-Leak Operation (stay in Loftwick and trap the handler), and conditionally Rel Astra Legal Continuation.

Phase 5 advances the "E." thread further but does not name Eclavdra, House Eilserv, the Vault, the Underdark, or confirm the writer is non-human. Caelith's late letter to the party in Phase 4 — *"the conspiracy you have named is not the conspiracy"* — is operationalized here.

## Phase 5 NPCs (shipped as Foundry actors)

- **Ostren Pell** (CR 0 coerced clerk) — the leak in Caelith's office.
- **Mistress Aldea Veren** (CR 1/4 half-elven paleographer) — Trina's old correspondent in the wood.
- **Ortwell Brane** (CR 1/2 principled civic antagonist) — architect of the Closure motion. Not corrupt; not E.'s asset; cannot be bought, threatened, or shamed; can be outmaneuvered.
- **Edda Halvern** (CR 0 quiet co-sponsor) — closure co-sponsor for unrelated militia funding reasons. Persuadable via a side deal.
- **Mairra Voss** (CR 0 sympathetic councilor) — the party's procedural ally, will sponsor a renewed vote with documented case in hand.
- **Marshal Rennic Thale** (CR 4 militia commander) — Loftwick militia. Council-instructed to be aware of the party's movements; persuadable to provide quiet support and optional combat backup.
- **Vesten Quill** (CR 2 hostile courier handler) — the layer above Pell's courier; the only optional combat encounter in Phase 5.

## NPC Actor Loadouts (v0.6.0+)

As of v0.6.0, every NPC actor in the module ships with a **populated `items` array** — weapons, armor, signature gear, NPC features, and (for Trina Alvere only) a full Warlock 10 spell loadout. Items appear on the Foundry NPC sheet under Inventory / Features / Spells tabs and are immediately actionable in the combat tracker.

Items are fully embedded with their `system` data, so they function regardless of the user's compendium installation. Where the official D&D 2024 modules (`dnd-players-handbook`, `dnd-dungeon-masters-guide`, `dnd-monster-manual`) are present, items also carry `flags.core.sourceId` hints toward expected compendium UUIDs. Foundry will auto-link on import where pack names match; otherwise the GM can drag-replace any item at any time without breaking the actor.

**Generation pipeline:**
- `scripts/populate-actor-items.mjs` — declarative templates (weapons, armor, feats, spells) plus a per-actor item plan. Run with `node scripts/populate-actor-items.mjs`. Idempotent: item `_id`s are deterministic SHA-256-derived from actor + slug, so re-running produces identical output.
- The 5 combat NPCs (Caelith, Merev Sarth, Anver Resh, Marshal Thale, Vesten Quill) have full feature sets including Cunning Action / Sneak Attack / Multiattack / Parry as appropriate.
- Trina ships with 12 spells + 6 invocation/pact features wired through her two 5th-level Pact slots.
- Sereth's bodyguards (2× Veteran + Knight Captain + Bandit Captain driver) are referenced as MM 2024 drag-ins via a feat-card on his sheet — they are not separate actors in this module.

**Item totals:** 147 items across 25 actors. Phase 1 (1 actor / 8 items), Phase 2 (2 / 33), Phase 3 (7 / 33), Phase 4 (7 / 33), Phase 5 (8 / 40).
