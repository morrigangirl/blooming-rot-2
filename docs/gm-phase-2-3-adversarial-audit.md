# Phases 2 & 3 — Adversarial Audit

*Blooming Rot 2 · run against module v1.4.11 · 28 Aug 586 (real-world), all 16 Phase 2 and Phase 3 journals*

## How this was done, and how much to trust it

Two independent adversarial readers went through all sixteen Phase 2 and Phase 3 journals in full — 67,812 words — hunting only for things that would break at the table: contradictions between pages, events that can't happen in the time given, evidence the party can't reach, and NPC facts that flip between journals. They returned 41 findings.

**I then verified every one of them myself against the source text before writing this.** All 96 quoted strings checked out — file, line, and wording. Nothing was invented. But quotes being real is not the same as the *contradiction* being real, so I also read the surrounding context for the top twenty. Three findings did not survive that; they're at the bottom under **Overturned**, with what's actually true.

Nothing in this document has been changed in the module. This is a report.

---

## Status — what has been fixed

**Tier 1 — all six, shipped in v1.4.12.** Vault key-holder, Tamsin's location, the burglary window, the Hardby chop's staging, Sereth's Hardby visits, and Vesh's wax cast.

**Tier 2 — all seven, shipped in v1.5.0:**

| # | Item | Decision taken |
|---|---|---|
| 7 | The road east | Quiet Pursuit **six days**, Commercial Cover **eight or nine**, Official Delegation **a fortnight**. Phase 2's sign-off now names all three; both Phase 3 arrival read-alouds retimed. |
| 8 | The evidence package | Departure read-aloud split into three bracketed route variants. The last-resort fallback now rests on Veska's own files — three documents in four years in the same unidentified hand — which exist outside the branch entirely. |
| 9 | Veska's door | Caelith hands over the sealed letter **and** the phrase at the Loftwick gate, on all three roads. |
| 10 | The year | **584 CY.** See the correction note below. |
| 11 | Sarth's logistics | She is a standing local retainer on the firm's books in Loftwick; Vesh's runner activates a pre-paid instruction rather than commissioning one over a six-day road. |
| 12 | The "E." gate | Second, wholly independent plant at Doril Veth's counting house: Investigation DC 14 on the blank carbon replacements finds a ghost impression carrying a countersign line and a capital "E." |
| 13 | Trina at the raid | Caelith goes down alone. "One far more dangerous man." Her profile now places her at the townhouse with the originals. |

### Correction — the year, and how I got it wrong first

When I first put the year to you I said no page in the module states one. That was true and it was also misleading, because I had missed the anchor that actually pins it: **the three harbor commission seats.** Olm two years empty, Mirin Vesh fourteen months, Ervan Dale six months — repeated in Phase 3's investigation and quick reference, in three Phase 4 journals, and in the master ledger, with an explicit instruction to *say the arithmetic out loud* to the party. Those intervals put the present at autumn 582, not 584.

The call was to keep **584** and move the three deaths forward two years so the arithmetic still lands: **Olm 582, Mirin Vesh 583, Ervan Dale 584.** That is now consistent across all six journals and the four GM docs. `docs/remediation-plan-phases-2-6.md` still carries the old dates and was deliberately left alone — it is a record of past work, not campaign canon.

Knock-ons handled at the same time: the sidequest's three `581 CY`, Hask's letter gap (fourteen months → nearly four years, since his last visit was Patchwall 580), Veska's defect stamp (four years in the strongroom → five, from 579), and Drask's monograph in the Aerdy network pack, which he intended to publish in "580 CY, ten years after" a dismantling that happens in 584 — now 594.

Pollow needed no edit: qualified 575, nine years in Loftwick, lands exactly on 584.

**Still open:** the four Tier 3 items (my errors in the v1.4.9 seeds and matrix layers) and the Tier 4 continuity list.


---

## Tier 1 — Fix these before you run it

Six items. Each will break in front of the players, each is a one-or-two-line edit, and together they're maybe twenty minutes of work.

### 1 · The vault key is in the grocer's pocket
`phase-3 · cv-branch`

The Overview says the vault's two locks are held by **"Mira and Berrin Onn."** The Burglary page, forty lines later, says the party needs **"either both keys (Mira and Halver each carry one)."** A third line has Solen instructing **"Halver"** to file the special escrow.

Halver is **Mistress Betha Halver**, the sixties widow who runs the corner grocer at the south end of Cooper's Tale, hands the party the safe-house key, and *"knows nothing about Caelith, Loftwick, or the Yeomanry."*

If you read the Burglary page at the table, the party will plan a pickpocket on the sweetest NPC in the chapter. **Fix:** replace both "Halver" instances in `cv-branch` with "Berrin Onn."

### 2 · Tamsin is upstairs and in the cellar
`phase-3 · investigation`

Body text: *"She is held in an upstairs bedchamber. She has freedom of the upstairs corridor (door locked at night)."*
Map caption, same page: *"Tamsin is held in the cellar, accessed from the east side of the main house."*

This is a planned infiltration. The party will scout, ask exactly where she is, and commit to an entry point — and the two answers imply different routes into the house. It breaks mid-heist.

**Fix:** keep upstairs (it matches *"freedom of the upstairs corridor"* and *"long enough to know the house"*) and correct the caption.

### 3 · The burglary window is ninety minutes long and four hours long
`phase-3 · cv-branch`

Overview: *"Time inside before the night guard's third-bell round: about 90 minutes."*
Burglary page: *"roughly 90 minutes between Marsh's last round of the foyer (eleventh bell) and his next round (third bell after midnight)."*

Eleventh bell to the third bell after midnight is about four hours. This is the only pressure mechanic on the set-piece — four picked locks, a poison trap, and a blotter to lift. At ninety minutes it's a knife-edge; at four hours it's a stroll. You'll pick one and the players will plan against the other.

**Fix:** state it once. *"Marsh's foyer round at the first bell after midnight, his next at the third — roughly 90 minutes."* Delete the eleventh-bell reference.

### 4 · Caelith refuses to go to Wick Lane, then has tea there
`phase-2 · evidence` → `phase-2 · investigation`

Scene 2, as he sends them out: *"I will not come. My face is known on Wick Lane; yours is not, yet. Go as the strangers you are."*

Scene 3b, in Gilst's ransacked, watch-sealed rooms above the stationer's on Wick Lane: *"Caelith holds the slip at arm's length... He looks at Trina, and Trina sets down her tea. 'That is a Hardby chop,' he says. 'That is* the *Hardby chop.'"*

There is no framing line moving that beat anywhere else, so a GM reading straight down the page runs it in the room he just refused to enter — and it lands on the single most important sentence in the chapter.

**Fix:** one lead-in. *"Back at the Little Palace that evening, when they lay it on the long table:"* — and cut "Trina sets down her tea" or keep it, since she's now in a room where she plausibly has tea.

### 5 · Sereth has not been to Hardby in eleven years, and was there last month
`phase-3 · mossen-place` → `phase-3 · cv-branch`

Mistress Halver's gossip — a first-day scene: *"A senior partner has come down from Rel Astra twice in the last six weeks... 'the one who never lets anyone see his hands.' GM-only: this is Tarlith Vhal Sereth."*

The branch Overview: *"Tarlith Vhal Sereth has not visited Hardby in eleven years; the office is kept dusted for the appearance of presence."*

The party hears the first within a day of arriving and reaches the second as the chapter's destination. There's a second-order problem underneath: a recluse who *"has not signed a letter at his own desk in eleven years"* can't have left the desk blotter impression the whole chapter is built on producing.

**Fix (two options):** make Halver's visitor someone else — Mira Cindren's Rel Astra superior, or Veshen Cindren — and keep the eleven years; **or** keep the visits and re-source the blotter to a Sereth-signed instruction packet Solen blotted at the Hardby desk. The second is cheaper and arguably better: it makes the signature *authentic and forwarded*, which is more damning.

### 6 · Vesh has "nothing inside to break," and holds the one confession that cracks the chapter
`phase-2 · investigation` / `quick-reference` / `interruptions`

Scene 3a: *"Vesh is not a conspirator — he's a junior clerk whose seniors are doing something he isn't cleared to know — so don't let the party break him; there's nothing inside to break."*

His own NPC matrix row: *"Withholds: ...The fact that he has already cast a wax of the Strong Room's second lock during a Yeomanry inspection."*

Scene 6: Sarth *"has a wax cast of the second tumbler, taken by the firm's clerk during a 'Yeomanry inspection.'"*

Taking a wax impression of the second lock on the Hand of the Duke's private cellar vault is not "not being cleared to know" — it's the most incriminating act by any on-stage NPC in the chapter, and it's what makes Scene 6 possible. It's also hard to stage: the module never says when a foreign bank's Loftwick notary was inside Caelith's residence cellar, or why.

**Fix:** give the wax cast to the unnamed Audit Hall leak the chapter already establishes (and which Scene 6 already gestures at with the counterfeit stamp), and delete the line from Vesh's matrix row. That keeps "nothing inside to break" true and removes the staging problem.

---

## Tier 2 — Structural. These need a decision, not a typo fix

### 7 · The road east is six days, two days, and four days
`phase-2 · departure` → `phase-3 · arrival`

Phase 2 sign-off: *"Hardby is six days east if they press the horses."*
Commercial Cover arrival: *"You enter Hardby through the South Gate at sundown, on the second day of riding."*
Quiet Pursuit arrival: *"Hardby comes up at you sooner than expected... on the morning of the fourth day."*

Both read-alouds — so the table hears them. Commercial Cover, the *slower* option, arrives in two days; Quiet Pursuit, *"fastest by a wide margin,"* arrives in four; both beat the six-day floor. It also breaks the elapsed-time economy: two days of riding can't produce Commercial Cover's stated *"~1 week, firm noticed but hasn't confirmed."*

**Suggested:** Quiet Pursuit six days, Commercial Cover eight to nine, Official Delegation two weeks. Then Phase 2's "six days if they press the horses" is exactly right and the folio choice means what it says.

### 8 · The closing read-aloud hands every party evidence two of three routes can't get
`phase-3 · departure` + `quick-reference`

The route-agnostic departure read-aloud says the party carries *"Veska Maelan's notarized opinion, three pages of carbon-copied second-set ledger entries..., Tarlith Vhal Sereth's signature impression rubbed up from the senior partner's blotter, and the chipped Hardby clearing-stamp."*

But Path 2 (Commercial Cover's only branch path) yields no blotter and explicitly leaves the defect-stamp in the strongroom. Path 3 (Official Delegation) says *"They may not seize"* and *"The party never sees the second set of books"* — and on that route Veska has fled to a coastal village and can't notarize anything.

Worse, the safety net is circular. The rails say: *"If all three branch paths fail, Veska's earlier records plus the blotter rubbing are enough."* The blotter rubbing only exists inside the branch — i.e. the fallback for "all branch paths failed" requires a branch path to have succeeded.

**Fix:** three bracketed package variants in the read-aloud, and re-point the fallback at something outside the branch — one of Veska's three prior Sereth-endorsed documents, which she already holds in her own files.

### 9 · Veska's door is locked on two of three roads
`phase-2 · departure` → `phase-3 · arrival`

Official Delegation: Hella Voren will hand over Veska's notes to *"anyone who could speak the agreed phrase: 'A tower above three waves.'"*
Commercial Cover: the party meets Veska *"with Caelith's letter of introduction visible."*

Phase 2 hands over exactly one thing at the gate: *"a small flat brass token — the quill above the closed gate."* No phrase, no letter. The phrase appears in the Quiet Pursuit read-aloud only.

This is softer than it looks — the clipped silver coin in their pack carries the tower-above-three-waves mark, and the Hardby gate lintel bears the same mark, so a sharp table can arrive at the words. But they've been given no reason to *say* them to a stranger, and the Veska scene is flagged as *"the single most important investigative beat in Phase 3."*

**Fix:** add the phrase and a sealed letter of introduction to the Phase 2 departure read-aloud, for all three roads. One sentence from Caelith.

### 10 · The year is 581, and the forged letter needs it not to be
`phase-2 · roadhouse-sidequest` vs `phase-2 · evidence`

The Brown Hare journal states the present three times: *"in 581 CY, almost entirely Yeomanry-aligned,"* *"The Yeomanry's response... in 581 CY is restrained,"* *"She does not, in 581 CY, know what to do with what she knows."*

The forgery clue: *"the signature... belongs to the previous Bureau Chief, who retired in 581 — and the letter is dated last summer."*

If the present is 581, "last summer" is 580, *before* the Chief retired — the signature is legitimate and the party's first hard proof of an inside job pays out nothing. **The present has to be 582 or later.** (Pollow's biography — qualified 575, *"practiced in Loftwick for nine years"* — implies 584. Nothing in the module states a present year outright; I checked.)

**Fix:** decide the year and change the sidequest's three instances. Rosalin's whole biography is welded to it, so pick before you touch anything else.

### 11 · Sarth is summoned from Hardby overnight, over a six-day road
`phase-2 · dm-brief` / `interruptions` / `investigation`

DM Brief: *"The moment the party shows their hand at the Wick Lane satellite, Vesh sends a sealed message to C&V Hardby. Hardby responds by escalating with Merev Sarth,"* who is then contracted through *"a numbered dead drop."*
Scene 6 fires *"the night after the party rebuffs Moll"* — day one or two.

Vesh's runner has to reach Hardby, Hardby has to escalate, Tarsh has to load a drop, and Sarth has to be briefed and in the cellar — inside 48 hours, over a road the module says is six days each way.

The module already half-solves this and doesn't notice: Sarth is *"the same 'watchman' who searched Gilst's rooms on a reconnaissance pass"* — which Reith dates to *"yesterday,"* i.e. **before** the trigger that supposedly summoned her.

**Fix:** make her a standing local retainer. *"Hardby keeps a retrieval contractor on station in Loftwick; Vesh's runner activates a pre-paid instruction, it does not commission one."* Delete "Hardby responds by escalating with Merev Sarth." Everything else stands, including the reconnaissance pass.

### 12 · "E." lives in one hidden book in one optional room
`phase-2 · investigation` / `quick-reference`

Both sightings of the campaign's central initial are inside the same hollowed book: Investigation DC 13 finds the receipts book, Investigation DC 14 finds the *"E."* countersignatures. The book is in Gilst's rooms — which the time budget lists as an optional scene, and which the Maps appendix calls *"Thread B, the optional investigation."*

The skip-Gilst fallback recovers only the bank instrument: *"Caelith's contact can recover the bank instrument before the room is cleaned."* It says nothing about the receipts book, so it recovers nothing about "E."

A party that skips the upstairs, or blows one DC 13, leaves Phase 2 having never seen the mark that Phases 4, 6 and 8 are built to echo.

**Fix:** extend the fallback to recover the receipts book too, or plant a second "E." outside the room — the countersign line on Tamsin's two stolen carbon replacements at Veth's counting house is the natural spot.

### 13 · Trina is forbidden from the Sarth raid and scripted into it
`phase-2 · trina-alvere` vs `interruptions`

Her profile: *"She is not present during the Merev Sarth retrieval attempt — she is, by design, elsewhere when violence is possible."*
Scene 6's default branch, which fires whenever the party sleeps through the alarm rune: *"the rune wakes Caelith, and Caelith and Trina go down with lanterns... Recognizing two far more dangerous people than her client warned her of, she drops it and runs."*

Both are rules, not descriptions, and the scene's own text supplies her alibi and ignores it: *"the real evidence has been at Trina's townhouse since sundown."*

**Fix:** rewrite the sleeping-party branch as Caelith alone — *"one far more dangerous man"* — plus the rune and Kostan at the tunnel mouth. Note in her profile that she's at the townhouse guarding the originals.

---

## Tier 3 — My errors, from the layers I added in v1.4.9

These four are in journals I wrote for you two weeks ago. They're mine, and they're the ones I'd fix first after Tier 1, because three of them are the per-PC narration beats you specifically asked me to make sure were complete.

### 14 · Kitty's Phase 2 beat fires on an object that doesn't exist
`phase-2 · seeds-and-beats`

The beat: *"Fires in: Movement One (the E. sigil)... her sigil-veining warms faintly for a few seconds when she touches the E. seal."* The Beat Map repeats it: *"Scene 1 · The Seven Items — Kitty: veining warms at the E. sigil."*

There is no E. seal in Movement One. The seven items are the burned focus, the false letter, the clipped coin, the lacquered tube, the vellum strip, the ledger fragment, the seed pouch. The only wax in the whole movement bears *"a stylized three-rayed sun closing into a fist."* And "E." isn't a sigil anywhere in Phase 2 — it's an ink initial with a thumb-press, in a different movement, in an optional room.

**Fix:** retarget her Movement One beat to the sun-into-fist bead, which is the patron school's mark and does the same work. The blight-specimen half of the beat also routes through a *"Grain Register specimen jar"* that Phase 2 never establishes — the Records Alcove holds the *Grain Factor Annual Returns*, a book. Move that half to Veth's counting house and name where the jars come from.

### 15 · Gianni's only Phase 2 beat needs maps that never come out of the tube
`phase-2 · seeds-and-beats` / `evidence` / `roadhouse-sidequest`

Her beat: *"Laying the caravan chart flat, she notices an eastern trade-spur she walked as a girl is simply not on it."* Seed Repair 4 fires *"at the map tube, Movement One, as the charts come out."* The Brown Hare sidequest — a 43K journal — is *"triggered by a single hand-drawn mark, 'R.', on the third map in the brass tube."*

Movement One never produces a map. The brass map-case appears once, as packaging: *"Nested inside Haskur's brass map-case is a second, smaller cylinder."* The charts themselves are never an item, never described, never given a DC.

So a GM running the Morning Review as written delivers no maps, and the sidequest hook, Seed Repair 4, and Gianni's only beat in the chapter all have nothing to attach to.

**Fix:** add the caravan charts as an eighth examined item — Investigation DC 14 for the "R." mark in Haskur's own hand, with Caelith's *"Sea. Trade road. Caravan track"* as the framing.

### 16 · The Phase 2 matrix gives Veska a corrupt man's job and a friendship she never had
`phase-2 · quick-reference` vs `phase-3 · hardby-npcs` / `investigation`

The matrix row: *"Veska Maelan (Hardby weighmaster) | Hardby trade-clearing notary | Tamsin's correspondence partner."*

Phase 3: *"Tamsin Moraven. Veska has never met her"* — she saw the queries cross her desk three times and didn't answer. *"'She was very close,' Veska says, 'and I was not brave enough to write to her directly.'"* That shame is her whole scene.

And the actual Hardby weighmaster is Joren Krill, whom Tamsin's own letter names as compromised: *"Take them to the Hardby weighmaster Joren Krill, no — to Caelith Dunivar in Loftwick. Joren is not safe."*

The matrix is the page you scan at the table. Introducing "Veska, the Hardby weighmaster, who wrote to Tamsin" breaks the Krill plant and Veska's confession in one line.

**Fix:** *"Veska Maelan (Hardby notary) | Hardby trade-clearing notary | Refused and quietly forwarded Tamsin's queries; never wrote to her. Phase 3 key witness."*

### 17 · The party never gets the safe house
`phase-2 · seeds-and-beats` / `departure` vs `phase-3 · mossen-place`

The Beat Map says the departure plants *"the brass Hand-token and the folded paper for the Mossen Place (→ Phase 3, read on the road)."* The departure read-aloud hands over the token and nothing else. "Mossen Place" appears exactly once in all nine Phase 2 files — in that Beat Map line.

The Mossen Place journal then cross-references *"Phase 2 — Departure (Caelith hands over the key in his farewell scene)"* — wrong twice, since the same journal says the key is Mistress Halver's.

Not fatal: the Mossen Place page carries the address (17 Cooper's Tale) and the cover story, so you can hand it over cold. But as written, every party leaves Loftwick without the handout the next chapter opens on.

**Fix:** add the folded paper to the departure read-aloud — *"and a second paper, folded and sealed: 'Not until Hardby is a day off'"* — and correct the Mossen cross-reference to point at Halver.

---

## Tier 4 — Continuity and arithmetic. Real, small, fix at leisure

**Dates and ages**

- **Anver Resh left the firm twice.** Dossier: *"Left the firm 'to manage his own affairs' in spring 582."* Veska: *"He left the firm 'to manage his own affairs' four years ago."* Inconsistent under any present year. Veska's account is one of two ways the party identifies Tarsh, so a player who writes the date down catches the module, not a lying NPC.
- **Vella Tannin has waited eight years for a three-year-old death.** Brother killed in the *"Wild Coast border skirmishes of 580."* Fourteen lines later: *"She has been waiting eight years for someone to confirm what she has not let herself believe."* Delivered aloud at the emotional turn of the whole Commercial Cover path — and eight years also predates the second set of books, which started in 580.
- **Rosalin's mother had an affair the module doesn't intend.** *"[Eron] married Ana three years after Tomas died"* (Tomas died 537, so 540) but *"fathered Hask in 535."* Every other date confirms the 535 birth, so the marriage line is the error. Also: *"has seen Haskur eight times in nine years"* describes a visit table spanning twenty-six years, which inverts the point of the scene — a brother who came home less and less.
- **Ailen Moraven is nineteen and mid-twenties**, and her father's tactical map caption says *"Vellin and his daughter Ailen live here"* — three lines after Vellin says *"She's studying with a sculptor. In Hardby."* Ailen being alone and unwarned in Hardby is the chapter's designated stall-breaker; the caption flatly denies it, and players read map captions in Foundry.
- **Trina is mid-thirties**, has known Caelith *"twenty-two years,"* and has spent *"twenty years"* funding poets — so she met him at 13 and started patronizing at 15. *"Looks mid-thirties; is older than she looks"* fixes it and serves the pact.
- **Tamsin's Official Delegation timeline** gives three different recovery dates across three pages (murdered three days before arrival, plus two days in the water, recovered three days before arrival), and both branches claim the same twelve days of captivity eleven days apart.

**Timing and windows**

- **Vella's copy window is exactly when Solen is locked in that room.** Her carbon-copy run happens *"during her sixth-bell hour when Solen leaves his office"* — but his own schedule says *"Sixth bell — first private hour; Solen often closes his office door for thirty minutes during this hour to work on the second set undisturbed."* Fifth bell is the free window (he's out with Mira). The same paragraph also has her borrowing Castrian's house key to deliver copies, which is irrelevant, and gates it on a salon she attends *"once every six weeks."*
- **Sarth's testimony needs two days of custody in a three-day chapter.** *"Freely (after capture, after 2 days)"* / *"Held lawfully a couple of days"* — but the party departs *"on the third morning."* The name "Tarsh" is usually unreachable before they ride out, and nothing tells you what to do about it.
- **The drop-niche is sold as a guaranteed lead with no scene.** *"Two pointers, guaranteed: a niche to watch here, and a road that runs east"* — but there's no stakeout beat, no DC, no lifter, and no statement of when Sevenday falls in a three-day chapter.
- **The Brown Hare is reached twice**: pacing table says *"Day 2 (down): arrival in the late afternoon,"* both the ride text and arrival read-aloud say midmorning. And the South Gate read-aloud tells the players *"the road east, which you will take in three days"* immediately before a five-day round trip.
- **The sidequest's cost is +2 in three places and +3 in its own table.**

**Route and hand-off**

- **The sea route's visibility is inverted on the page Phase 4 reads off.** Hand-off: *"Sea (arrive unobserved, twelve hours of grace)."* Route 1: passenger lists go to Hardby's harbor authority, who share them with Rel Astra's harbor commission, so *"Cindren & Vhal Rel Astra will know the party arrived by galley within hours."* The galley is the *announced* arrival. Phase 4 will open with the wrong opposition posture.
- **Rel Astra travel times in the closing read-aloud match no route on the same page.** *"Six days after Hardby for the slow routes and three for the road"* — but the road's own minimum is five, the carriage is eight to ten, and the next line says *"the morning of the third week."*
- **The subpoena scene has four mutually exclusive states**: the chops are unavailable; the party "gets items 2 and 3"; they *"may not seize"*; and the third stamp both is and is not the chipped one.
- **The Harbor Before Throne reveal is captioned to Castrian's salon** and staged in its own body text at the Office of Mercantile Records — and Castrian is Commercial-Cover-only, while clarifying "harbor before throne" is a required job on all three roads.
- **Castrian and Resh are offered as the fix for the Quiet Pursuit rescue's central tactical problem**, on a branch where Castrian has no introduction and Resh usually hasn't been cornered yet.
- **Phase 2 can kill Tamsin before Phase 3 starts** (clock segment 6, or the Moll-bribe rail), but Phase 3 says her fate is determined solely by the travel choice, and the Ailen and Halver threads assume she's alive.

**Prep-desk friction**

- **Two names for one chase map**: *"the Loftwick — City scene"* in the Quick Reference, *"the Sparrow's Run — Loftwick scene"* in Scene 3d — and the same page both ships it pre-walled and tells you to lay the walls.
- **Three interview rooms with four doors**, and a read-aloud calling the C&V satellite *"a single front room"* on a map showing two storeys and a staircase.
- **Reith's line puts Sparrow on the corner after the watch-coat man**, but her own dropped fold logs him, so she was there first.
- **Kostan's post is "watched for three days" and "posted since morning"** two sentences apart.
- **An unedited drafting note shipped in running text**: *"Solen's office window. Second floor of the back wall — wait, ground-floor of the back wall."*
- **The Brown Hare read-aloud hard-codes six PCs** (*"six strangers"*, twice) while the per-PC page assumes Cam's player is out.
- **Two competing scripts for Trina's introduction** — one in her mouth, one in Caelith's.
- **The Phase 5 counterfeit-seal plant dies on a supported choice**: it fires *"when Sarth's forged writ is recovered,"* but Sarth only comes if Moll is declined, and taking the bribe is explicitly *"a supported path, not a punishment."*

---

## Overturned — findings that did not survive checking

**"Korre is an NPC who exists nowhere in Phase 2."** Wrong. Veyra Korre is a Phase 6 principal — Greyhawk City, the monthly address scene, the apartment above the bakery on Tannerway — and she's named four times in the Brown Hare journal itself, including a beat where the party can spend one of Haskur's two truthful answers confirming her identity. What's actually true is smaller: *"Korre's watcher in Loftwick"* is a forward reference a GM reading only Phase 2 can't place, and it sits oddly beside the Loftwick watcher the chapter did build (Sparrow, paid by an unidentified man, reporting to *Hardby*). Cosmetic.

**"The module says Pollow both killed Gilst and only certified the death."** Overstated. *"Pollow killed Gilst"* and *"the conspirators' instrument of removal: Pollow"* and *"paid to certify a heart failure"* read consistently — he did both. The real gap is mechanism: nothing says how he got Gilst to drink the tea, and the party will ask. Worth one sentence, not a rewrite.

**"The chapter is set in 584 CY."** Inferred, not stated — I checked every date in the module and no page names a present year. The defect in finding 10 is real (the sidequest's 581 breaks the forgery clue), but 584 is only what Pollow's nine years implies, not canon. You get to choose.

---

## What held up

The guardrail is clean. Every occurrence of Drow, Underdark, Eclavdra, Eilserv and Erelhei-Cinlu across both phases sits inside explicitly GM-labelled text — the DM Brief's plot-behind page, the campaign-level bullet on evidence item 4, the Seeds journal's absolute-limit line. No read-aloud, no handout caption, no skill-check result goes past *"Elven. But peculiar."* Scene 3d states the rule out loud for you: *"The fold names a route and a firm-mark — never 'E.,' never the tube's strange craft, never a throne."*

The "E." guardrail holds in player-facing text throughout. The 1,200 gp bribe and Caelith's 100 gp-and-passport standing offer agree across all four journals that mention them. The Wick Lane geography — green door, stationer's, physician two doors down — agrees in all three descriptions. All ten cross-compendium links resolve. All 57 image references point at files that exist.

The chapters are sound. What's above is a punch list, not a verdict.
