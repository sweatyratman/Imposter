# Impostor: handoff notes

This file holds what isn't already in the code, `README.md` or `CLAUDE.md`. Read `CLAUDE.md` first.

**Where this comes from.** The project was built in one long Claude session (17–21 Oct 2026) that was compacted several times.
- Only the user's messages from the last stretch (roughly 19–21 Oct) survived word for word. Those are the quotes below.
- Everything earlier comes from the session's task log, code comments, test names and backup files.
- Lines marked **[inferred]** are reconstructions, not the user's own words. Treat them as strong hints, not rulings.

---

## 1. Decisions and why

### Rules and mechanics

- **Who wins a vote.** A crewmate voted out means impostors win straight away. An impostor voted out shows "Correct!", then the group chooses to vote again or stop.
  - This replaced an earlier single-flow version. Task 16 split the vote-again choice into two side-by-side buttons ("Vote again" / "We're done") and removed a "superfluous line" from the Correct screen. pw8 checks for "correct, without the extra line".
- **The guess.** If all impostors are caught and the group stops, caught impostors get one shot at the word. More than one caught impostor must agree on a single word.
  - What a correct guess does is a house rule: impostors win (default), nobody wins, or crew still win. It was added as a setup option rather than hard-coded (task 16).
  - The guess screen is two buttons: the group judges right or wrong. There is no typed input.
- **Last two players changed.** First version (task 5): "2 left with an impostor among them: remaining impostor(s) win; voted-out impostors don't".
  - Current rule: with **1 crewmate and 1 impostor** left, the crew win unless that impostor guesses the word.
  - With **2 impostors** left, both win ("both remaining win after 4s").
  - Earlier summaries record this as the standing rule, so don't revert to the old "impostor auto-wins at two".
- **All-impostor rounds** must look identical to normal rounds, so no one can tell.
  - Stopping early means the hidden impostors win.
  - The unmask title always starts singular ("The impostor was…"). It only becomes "The impostors were…" as the pile fans out, so the heading gives nothing away.
- **Vote again hidden when nothing is left to find.** User: "The vote again button should not appear if the number of impostors determined possible by the sliders has been met. E.g. one voted out and sliders set to 100% chance of 1 impostor."
  - Implemented via `game.maxPossible`: the largest count with odds above 0% at deal time.
  - With any slack in the odds, both buttons always show, so the screen leaks nothing.
  - The lone "We're done" button goes full width (`.split.one`).
- **Number of impostors.** A "most impostors" slider runs from 1 to min(players − 1, 10), default 3.
  - Each count has its own odds slider, plus "Everyone is an impostor", which is always offered even when the max is 1.
  - The ceiling of 10 is there because "past that it's just noise" (code comment).
  - An option for how many impostors appear was replaced by per-count odds (tasks 31–33) **[inferred]**.
- **Announce count** (`announce`, default off): optionally tells the table how many impostors are still hiding after a correct vote.
- **Clues: four per word, handed out in deal order** (1, 2, 3, 4, 1, 2…), so several impostors rarely share one. A lone impostor gets clue 1 (but see §9 on word history).
  - Old one-clue lists still work.
  - Chosen over every impostor getting the same clue (task 31) **[inferred]**.
- **Category and clue toggles.**
  - "Show the category during gameplay" (default on). Off: the top bar shows a paper tag with black [REDACTED] tape. The category is hidden while dealing, voting and on the guess screen, and revealed on results.
  - "Give impostors a clue word" (default on). Off means no-clue mode.
  - With both off, the setup screen warns that impostors get nothing.
  - The rule is locked in when the round starts, so changing it mid-game does nothing.
- **Random category picks by word, not by category** (task 28), so small categories don't repeat.
  - Rejected alternative: pick a category uniformly, then a word from it.
  - Multi-select categories: Random clears the others, and picking any category un-selects Random. Deselecting the last one falls back to Random.
- **Scores.**
  - Everyone on the winning side gets a point. When the last two impostors win, only the named winners score.
  - Scores carry across rounds.
  - The trophy button on every screen (including setup) opens the leaderboard. Reset needs confirmation.
  - Leaving or ending a game uses an in-game slide-up sheet, never the browser's `confirm()`.
- **"Impostor clues" box.** User: "Change categories and impostor clues to "Impostor clues"".
- **Impostors think they're crew** (fooled impostors). User's spec, verbatim:
  > "add a new setting there whereby Impostor thinks they are crew. the game shows them as crew but they have a different word from that category. Imposters are adamant that they are crew - only in the reveal does it become clear. The reveal has the exact same animation as crew being revealed until after the tape goes away, we see crew for 1 second, but then a seamless separate animation plays where the card changes to an impostor card in a slow stained ink ripple sort of animation. Default for this option is off. When toggled on, default a slider to 100% likelihood, allowing customisation of the chance."
  - **First grey-out rule** (user): "if this new option is on, hints and category gets greyed out because obviously hints will not be on, and category will just be displayed to all".
  - **Refined straight after** (user): "If there is <100% chance of fooled impostors then the clue toggle should still be available, and only non-fooled impostors get a clue."
  - **So, current behaviour:**
    - While the chance is above 0%, the category is forced to shown and its toggle is greyed out.
    - The clue toggle is greyed out (and off) only at 100%.
    - At 0%, both toggles return.
    - The user's saved choices are kept underneath and come back afterwards.
  - **Distinct words.** User: "Multiple Fooled impostors in a round must get different words".
    - The first build gave all fooled impostors one shared alternative word (`game.alt`, task 39). That was rejected.
    - Each fooled impostor now gets their own word: never the crew's word, never another fooled impostor's.
    - `altOf()` still reads the old `game.alt` for older saves.
  - **The chance is rolled per impostor.** At 50%, roughly half are fooled.
  - **Results ledger** gets a "Thought they were crew" row with each fooled player's word.
- **Prefer words not seen before.**
  - User's question: "Can the game keep an internal memory of how many times each word has appeared, aid with weighting undiscovered words above discovered ones?"
  - Then: "Word counts as seen after game chooses who goes first, Because this assumes that you've played a round using those words… Prefer words not seen toggle option is a great idea; and the Default option."
  - Then: "If prefer words not seen is off, the selection is truly random. I think the preference of words not seen should affect hints too".
  - **How it was built:**
    - Default on.
    - Counted once, in `countRound()`, when the starter is announced (`landShuffle`) or on `ready`. Rounds abandoned before that don't count.
    - Weight is 1/(1+n)².
    - Clues are ordered least-seen first. Ties keep the original order, so a fresh word still leads with clue 1.
    - Off means uniform random and the normal clue order. History still records while off.
    - "Reset word history" clears it. "Reset all to default" turns the option back on but does **not** clear history.
  - **Clues that don't count:** clues are only counted if an aware impostor actually saw one. With clues off, or for fooled impostors, none is counted.
  - **Replaced:** the old `recent` list of recently used words. It's still loaded so old saves parse, but it's unused.

### Presentation

- **Visual identity** (task 11): a "midnight card table". Navy felt, paper playing cards, smoky card backs, and brass for "the next move".
  - Fonts: **Unbounded** (display) and **Atkinson Hyperlegible** (body), from Google Fonts.
- **Card system** (task 17): a shared 3D flip card.
  - Impostor face: scuffed and stained. Its emblem is a domino mask with eye colour from `--eye`.
  - Crew face: peace-hand corners.
  - Black tape with coiled, slightly unstuck ends, plus a peel animation.
  - The starter card has 3 tapes: 2 corners plus a role tape reading `[REDACTED]`. It never shows a role symbol or scuffs.
  - The centre icon was removed (task 21: "no centre icon"). The evil stains fade in slowly after the peel.
- **Deal flow:** the card slides in, the player taps to flip it up, taps again to flip it down, and it slides out.
  - There's no separate hide button.
  - The card never moves when flipped.
  - Locking the phone or switching tab hides the role (`visibilitychange` / `pagehide`). A reload mid-reveal goes back to "pass".
- **Starter:** the whole deck is shuffled and one card drawn. Task 20 made the shuffle and "Game on" share one top-aligned layout, so nothing jumps when it lands.
- **Voting** (task 23): every suspect is a taped card in balanced, centred rows.
  - Picking one slides the others away and grows the chosen card (FLIP) into the exact spot the verdict uses.
  - User asked to remove the name shown above the card: "their name is basically displayed twice. It's on the card so it doesn't need to be displayed above."
  - Those screens now show only a kicker: "Vote this player out?" / "The group has voted out…".
  - The card carries the name as its aria-label.
- **Verdict reveal drama.** User: "The reveal, in general doesn't feel dramatic enough, ya know? Think bigger picture."
  - The room dims as the card lands.
  - Three beats: each one darkens the room, shakes the card harder and thumps the phone.
  - A held breath: near-black, dead-still card, no count.
  - Then the tape rips off with a flash.
  - Only after that does the outcome show: an impostor takes a hit with a red wash, a crewmate gets a heavy sigh with a teal wash.
  - Everything before the peel is identical for crew and impostor.
  - The reveal was restructured rather than just slowed, and reduced motion skips all of it.
- **Strobe.** User: "The strobe between normal card and Impostor card is way too quick. It looks like it's glitching out."
  - Was: `strobeStain` 1.6s, plus a stepped `strobeJitter` text shake, 0.8s on the last beat.
  - Now: a slow breath, 2.4s ease-in-out (1.6s on the last beat), peaking at opacity .42. The jitter was removed.
  - Crew and impostor cards strobe identically.
- **Unmask pile.** User: "The imposter was (or indeed imposters were) animation needs to be 1 seconds shorter".
  - The drama pass had lengthened it, so the flip point `F` was cut by 1s to 2050ms.
- **Category display.**
  - User: "If the setting is on to hide category, add the whole redacted theme to that element too", then "Sick. Make the non-redacted category element look the same for consistency".
  - So both states use the paper tag (`.redcat` and `.redcat.shown`). The category sits on its own centred row under the top-bar buttons.
- **Category picker** (task 32): square coloured tiles, each with its own colours and pattern. Random is a full-width banner that stretches so the last row is full.
- **House rules are always visible.** They were in a collapsed `<details>` and were opened up (pw15: "house rules are not hidden").
- **Sliders** move only with a deliberate sideways drag. A vertical swipe scrolls the page and a tap on the track does nothing. The drag is relative.
  - The player-count slider gives small numbers more room: 3→4 is about twice as wide as 15→16, because small games are most common.
  - Why: scrolling past a slider on a phone was changing settings **[inferred from pw18]**.
- **Playtest pass** (tasks 24–25): a full playthrough at two phone sizes, then fixes. pw12 encodes the outcomes:
  - No top bar on setup, and the Start button is sticky.
  - Logo: a card with a tape tagline.
  - Deal progress pips.
  - "Change settings" became a quiet link.
  - Every key action fits at 360×640.
- **Quips** after votes and on results never repeat the same line twice in a row.

### Discussions with no code change

- **App or Play Store version.** User: "Dont do anything, but is it easy for you to turn this into an app/play store app?" Answered as a discussion only; nothing was built. The exact answer wasn't kept. It was along the lines of: feasible by wrapping the static page (PWA, Trusted Web Activity or Capacitor).
- **Would the large-text clipping happen in an app?** Answered yes: system font scaling still applies inside a WebView. Hence the layout hardening below.

---

## 2. Standing preferences

- **"Established comprehensive playtester rules apply"** (the user's phrase). It means:
  - Act as a critical playtester: critique and fix, don't just implement.
  - Test at 390×844 and 360×640 and look at the screenshots.
  - Run every suite and add tests for each new feature.
  - Update the README.
  - Deliver the result.
- **Small phones are a must.** Every key action fits at 360×640 without scrolling, and large system text must not clip (a friend's phone did).
- **Questions are not orders.** When the user writes "Don't act; question only" or "Dont do anything, but…", answer and change nothing.
- **Short replies.** The user is watching token spend: "this chat is rinsing them".
- **Commit and push automatically** after finished, tested work: "Claude code should auto-push to git for me". Never force-push.
- **The user codes from their phone.**
  - No local clone, no terminal.
  - Repo: `sweatyratman/Imposter` (public), deployed by Vercel from the default branch.
  - Anything the user has to do by hand happens in GitHub's mobile web UI.
  - Dot-files can't be uploaded through that UI ("This file is hidden"). Create them with **Add file → Create new file**.
- **Wording and tone.**
  - British English throughout ("colour", "favourite", "telly").
  - The user writes casually ("Sick", "ya know", "ya get me?"). Match a relaxed tone and skip corporate filler.
- **From the user's other projects** (same account, a different chat):
  - Wants an ADHD-friendly, low-friction workflow.
  - Trusts Claude's judgement on content without reviewing every line.
  - Prefers big content jobs delivered in one batch.
- **Never run `pkill -f "node pw"`.** It kills your own shell, because the test runner command line matches.

---

## 3. Bugs we hit

| Bug | Root cause | Fix | Fragile? |
|---|---|---|---|
| Tape vanished, then reappeared just before peeling. User: "It disappears then reappears befor peeling. I suspect something went amiss in the dramatic tweaking" | The drama pass put the `rolePop` animation on `.idrole`, the parent of the role tape. Its opening keyframe hid the child tape. | Animate only `.rtext`, the text. The tape is a sibling and must stay put (comment at the `.c3d.revealed .rtext` rule). | **Yes.** Never animate opacity or transform on an ancestor of `.tape` around the peel. |
| A `hidden` row still showed | `.wrow { display: … }` beat the UA `[hidden]` rule. | Global `[hidden]{display:none!important}`. | Yes, if someone removes that rule. |
| A lone "We're done" button was half width after Vote again was hidden | `.split` is a 2-column layout. | `.split.one`. | Low. |
| Friend's phone: "House rules" heading clipped to "House rul…" next to "Reset all to default" | Larger system text (Android font scaling applies even though the CSS is px). A no-wrap flex row with a wide button. | `.rules > .row { flex-wrap: wrap; gap: 10px 8px }`, a smaller reset button (.78rem, padding 0 9px), `fitTagline()` with a `.tape-tag.nw` fallback, an auto-fit `.seg` grid, and `fitText` re-run on resize. | **Yes.** Any new header row with a button beside text needs to wrap. pw23 checks text scaled ×1.3, ×1.5 and ×1.8. |
| Verdict card could show the dark back during the countdown | Flip and stage states fighting **[inferred from pw11]**. | It now arrives face-up and taped. pw11 samples brightness during the countdown. | Medium. |
| Layout jumped when selecting categories | The note text height changed **[inferred from pw6]**. | Fixed height and position. pw6 checks no shift at 280–520px widths. | Medium. |
| Long names and words overflowed cards | Wider display font. | `fitText` shrinks by 0.93 steps (minimum 40% of size, 6px on vote cards). Names may take 2 lines, and words never break mid-word. pw9 forces "Arial Black" with wide letter-spacing. | **Yes.** It re-fits once web fonts load, because Unbounded is wider than the fallback. |
| Old saves | Older formats: a single `category`, a `found` screen, no `showHint`, a single `alt`, `recent`. | `load()` migrates each one. `reveal` → `pass` on load, so a role is never left on screen. Unknown screens drop the game. | **Yes.** Any new setting must be added to `defaultSettings`, `load()` and `RULE_KEYS` (if it's a house rule), with a sane migration for saves that lack it. |
| Test pw17 failed after the unmask timing changed | Fixed sleeps. | Wait for `.stack-area.fanned`. | It still flaked once on 21 Oct, then passed. |
| pw20 and pw21 flaked at beat boundaries | Sampling exactly on a beat. | Sample times moved off the boundaries. The reduced-motion path has no skipShuffle button. The mixed-round test needs multi-impostor odds. | **Yes.** Re-check these if any verdict or unmask timing changes. |
| pw15 broke after the Weather category was removed | Hard-coded counts. | Match by name. It now expects 21 tiles, a full-width Random tile and the 3-column fallback. | **Yes**, on any category change. |
| Large-text test harness false positives | Fitting ran before scaling, and the tape curl affected `scrollWidth`. | Understood and ignored (harness only). | Not app bugs. |

Other things that could regress:

- **Timing chains.** Everything uses `later()`, cleared by `clearTimers()` on every `render()`, which also cancels `inkRaf`.
  - A raw `setTimeout` will fire on the wrong screen. `lightFx` is the deliberate exception.
  - `busy` blocks taps during sequences.
- **The no-tell rule.** Any new class, timing or text that differs between crew, impostor and fooled impostor before the peel is a bug. pw19, pw20 and pw21 assert this.

---

## 4. Known issues and unfinished work

- **GitHub push from Claude now works.** Pushes were refused (403) for a while, even after the user installed the Claude GitHub app. They started working on 21 Oct, when this file was pushed.
- **`tests/run.sh` has no execute bit** on GitHub, because the web upload drops it. Run it with `bash run.sh`. `CLAUDE.md` says `./run.sh`, which needs `chmod +x` or that wording fixed.
- **`tests/.gitignore` is in the repo** (`node_modules/` and `*.png`). It matters because pw9, pw10 and pw11 write screenshots into the working directory.
- **Four categories are under the ~60-word target:** TV Shows 51, Video Games 45, Brands 46, Famous People 50. The other categories are 60–68.
- **Task 8, "Review and loosen all clue words",** is still open in the old task log. It was superseded by tasks 27 and 30 (rewrite plus Family Fortunes pass), so it's effectively done.
- **pw13 is slow** (3,000 rounds). It timed out at a 280s limit on 21 Oct; `run.sh` allows 600s and skips it unless you pass `all`. It also still sets a legacy `recent` field.
- **Ideas discussed and deferred:**
  - An app / Play Store version (user asked to do nothing).
  - Nothing else was explicitly parked.
  - The earlier rounds' notes may have had more ideas, but they weren't retained.

---

## 5. Tuning values

| Area | Value | Why / note |
|---|---|---|
| Players | 3–20, default 5 | |
| Player slider spacing | `COUNT_GAP(k) = 1 + 1.3·max(0, 10−k)/7` | Small counts get wider steps (3→4 ≈ 2× 15→16) |
| Impostor odds defaults | 1: 70, 2: 20, 3: 7, everyone: 3 | Mostly single-impostor rounds, with rare chaos |
| New count's first odds | 4: 4, 5: 3, then 2 | "Rarer the more impostors there are" |
| Most impostors | default 3; cap min(n−1, 10) | 10+ "is just noise" |
| Fooled chance | default 100% when switched on | User spec |
| Word history weight | 1/(1+n)² → 1, ¼, ⅑… | Fresh words dominate without banning repeats. In tests, 1 fresh word against 19 played 5 times came up ~65% (on) vs ~3% (off) |
| Auto-advance | `AUTO_MS` 4000 | After "Wrong person!" or "both win". Tap skips. Task 16 set it to 4s |
| Deal | hide → exit at 520ms, next card at 900ms; enter .45s; flip .7s | |
| Shuffle | gather 30ms, split 950/1350/1950/2350, draw 3000, flip 3500, land 4800 | |
| Verdict build-up | Room .4 on landing; strobe and tremble start at 250ms; 3 beats **800ms** apart (was 750) | |
| Each beat | room dims to `.42 + f·.48`; tremble size `--tr = 1.1 + 2.6f`; tremble period `.72 − .34f` s; vibration [22, 70, 34] | f = beat ÷ 3 |
| Held breath | at t−80: room .97, 650ms | |
| Tape off | ≈3450ms from start | Tapes peel 200ms apart; each peel takes 1s; vibration [120, 40, 80] |
| Outcome | hit or sigh 750ms after tape off; lights up at +1500; screen ends at +3000 | Stains fade in over 1.5s after a 1.1s delay |
| Skip-countdown path | 450ms of frantic strobe before the peel | |
| Fooled verdict | ripple starts at tape-off +2200 (the tape is fully gone by ~+1.2s, giving the 1s of crew); ripple 2600ms; then hit; ends at ripple end +1600 | User's "we see crew for 1 second" and "slow" |
| Ink ripple | drops at (x .5, y .6, start 0, reach .66), (.18, .2, .16, .74), (.82, .82, .3, .7) of the card diagonal; smoothstep; 22px feathered edge; SVG displacement 20 → 0 (power 1.3); rings fade from 72% | Ragged while spreading, perfectly flat at the end |
| Unmask pile | F = 2050ms (cut by 1s on request); beats every 550ms; hush at F−400; flip and flash at F; fan at F+1000 | |
| Unmask, fooled impostors | ripple at F+2100 (several cards) or F+1500 (one card), 2400ms; otherwise the hit at F+600 | Done at hit +1700 (several) or +1200 (one) |
| Strobe | 2.4s breath, peak opacity .42; last beat 1.6s | Was 1.6s / .8s with jitter, which the user said looked like glitching |
| Light effects | flash .75s; red/teal tint 2.2s; classes cleared after 2400ms | |
| Vibration | impostor hit [90, 50, 90, 50, 220]; crew sigh [160]; ink [30, 150, 30, 150, 30, 150, 30] | |
| Stage card size | `--cw: min(64vw, 256px, 31vh)`; at max-height 700px: `min(60vw, 236px, 27vh)` | Keeps the buttons on screen on short phones |
| Vote grid | gap 12px; cards ≤170px wide; height ratio 1.4; a lone card on its own row is scored ×0.8 | A stranded single card looks lopsided |
| Text fitting | ×0.93 steps, minimum max(9px, 40%) (6px on vote cards); names up to 2 lines | |
| Breakpoints | <330px bar labels hide; <300px names in 1 column; <350px category note wraps; <340px category grid drops to 3 columns | |
| Unmask title | "s" fades in over .9s after .25s; "as"→"ere" over .6s | |

---

## 6. Testing

All suites are Playwright on Chromium only. Each starts a local server and blocks Google Fonts. In the cloud sandbox Playwright is at `/opt/npm-tools/node_modules`; set `NODE_PATH` there.

| Suite | Covers |
|---|---|
| pw5 | Category multi-select: Random default, toggle, Random clears others, persists, falls back to Random, migrates the old single `category` |
| pw6 | No layout shift when selecting categories, at 280/320/360/390/430/520px |
| pw8 | The big end-to-end suite (71 checks). Guess-rule default; deal flow; lock hides role; shuffle and starter tapes; no tells before reveal; verdict face-up and taped; auto 4s; unmask singular→plural; vote again / done; stopping early; last-two rules; both win; all-impostor rounds; reduced motion |
| pw9 | Long names and words with a forced wide font at 360/390/430: no overflow on any screen; 12 vote cards plus the back link fit |
| pw10 | Vote grid for 3–20 players at 390×844 and 360×740: balanced, centred rows that fit |
| pw11 | Pixel brightness: the chosen card stays face-up on the stage and through the countdown |
| pw12 | Playtest outcomes: sticky Start, top bar layout, deal pips, in-game sheets, scoreboard maths, 360×640 fits |
| pw13 | **Slow.** 3,000 rounds; Random category frequency ∝ word count (passes if the largest gap is under 35%) |
| pw14 | Clue toggle: default, notes, persistence, round lock, no-clue cards, guess still offered, all-impostor no-clue |
| pw15 | Impostor slider caps and clamps; odds total 100; clue cycling 1,2,3,4,1,2; leaderboard; show-category rule and redaction everywhere; category tile grid (**hard-codes 20 categories / 21 tiles**); every word has 4 distinct clues; old saves |
| pw16 | Reset all to default: renamed box, button state, confirm sheet, players and categories untouched |
| pw17 | Unmask title plural/singular and aria-label. **Timing-sensitive** |
| pw18 | Slider touch behaviour via CDP touch events: scroll passes through, tap does nothing, relative drag, keyboard, mouse |
| pw19 | Strobe: identical for crew and impostor, frantic on the last beat, stops after the peel |
| pw20 | Drama timeline: darkening per beat, identical builds, held breath, flash, hit/sigh washes, lights back up, redacted tag fits. **Timing-sensitive** |
| pw21 | Fooled impostors: settings, slider, persistence, reset; identical deal card; verdict (1s of crew, then ripple, then clean end); unmask; ledger; grey-out rules at 100/50/0%; mixed rounds; distinct words (15 rounds); everyone fooled; reduced motion. **Long and timing-sensitive** |
| pw22 | `maxPossible` and hiding Vote again, including 1-or-2 odds and "everyone" |
| pw23 | Larger text (font sizes scaled ×1, 1.3, 1.5, 1.8) at 390×844 and 360×640: no page widening, the House rules heading never runs under the reset button |
| pw24 | Word history: default on, reset paths, counted once at the starter, abandoned rounds not counted, weighting on vs off (statistical, 60 samples; small chance of a flake), clue rotation, clue 1 leads on first sight, fooled and no-clue rounds count no clue |

There are no pw1–pw4 or pw7: they were superseded. The old scratch versions were not carried over.

**Gaps.** None of these were explicitly decided against; they're just not covered:
- No WebKit or iOS Safari run.
- No real-device font scaling (it's emulated).
- No test of loading a remote `wordsUrl`, offline cache or fallback.
- No test of vibration patterns.
- No visual snapshot diffs apart from pw11's brightness probe.

---

## 7. Content rules

- **Format:** `[word, clue1, clue2, clue3, clue4]`. Clue 1 is the original clue and must stay first. All 4 clues are distinct, and none contains the word (or the word it).
- **The Family Fortunes rule** (`ff.js` header): *"Name a <category> linked to <clue>". If the room would buzz the secret word first, the clue is too obvious.* A clue narrows things down without pointing at the word.
  - Fixes made under this rule (old → new):
    - Animals: fox "cunning" → "bins"; cheetah "fast" → "chase"; elephant "heavy" → "ears"; spider "creepy" → "corners"; swan "elegant" → "lake"; crab "shore" → "pinch".
    - Food & Drink: salt "table" → "chips"; banana "yellow" → "ripe".
    - Jobs: firefighter "brave" → "ladder"; accountant "tax" → "spreadsheets".
    - Sports & Games: boxing "rounds" → "bell"; cricket "village green" → "whites".
    - Everyday Objects: pen "signature" → "chewed".
  - An earlier pass removed definitions, set phrases and near-giveaways:
    - Christmas "December" → "wrapping"; Bonfire Night "November" → "sparklers".
    - genie "lamp" → "bottle"; ambulance "999" → "flashing"; Jupiter "largest" → "storm"; zombie "undead" → "slow".
    - satellite "GPS" → "dish"; daisy "chain" → "petals"; lake "district" → "boating".
  - That pass also replaced clues that were too vague (no foothold): rainbow "sky" → "colours"; tide "cycle" → "moon"; acorn "seed" → "squirrel".
- **Avoid cheap shots and table-awkward entries.** Swapped: "bin man" → "estate agent"; "train driver" → "air traffic controller"; "Johnny Depp" → "Keira Knightley".
- **UK-centric content:** Bonfire Night, MOT, telly, Hogmanay, "cuppa", milk float.
- **Category history:**
  - Started with core categories.
  - Then "Films & Actors" (~30 films, ~30 actors), which ended up as separate **Films** and **Actors**.
  - Task 27: grew five small categories to ~60 and added **Countries & Cities, TV Shows, Video Games, Brands, Famous People** (21 categories, 1,252 words).
  - Then **Nature & Weather** was removed (61 words). User: "Remove the Weather category too".
  - Now: 20 categories, 1,191 words.
- **Quip tone:** cheeky, roasty, British, meme-literate. For example "The impostor marinated you HARD.", "Cooked. Absolutely cooked.", "Gaslit, gatekept, girlbossed.", "{name} folded like a deckchair."
  - Short, one line each.
  - `{name}` is the player.
  - Banks: wrong, caught, impWin, crewWin, draw.

---

## 8. What I never want changed

- **No information leaks before a reveal.** Crew, impostor and fooled-impostor cards must be identical in look, classes, text and timing until the tape is off. This covers the deal card, starter card, vote stage, strobe, the singular unmask title and the vote-again choice (unless the odds make it moot).
- **All-impostor rounds look exactly like normal rounds.**
- **Fooled-impostor reveal:** the exact crew reveal, then a full 1 second of crew, then the *slow* stained-ink ripple. Default off; slider default 100%.
- **Multiple fooled impostors always get different words** (never the crew's).
- **Prefer words not seen: off means truly random.** No hidden memory effects when it's off.
- **A word counts as seen only once the starter is announced.**
- **Key actions fit on a 360×640 phone; large system text never clips.**
- **Family Fortunes clue rule; 4 clues per word; clue 1 stays first.**
- **Never `pkill -f "node pw"`.**
- **Never force-push.**

---

## 9. Open questions

1. **"Remove the Weather category too".** The whole **Nature & Weather** category was removed, including nature words like rainbow, mushroom, acorn and rose. Did the user mean only the weather words? Backup: `words_pre_weather.json` (not in the repo).
2. **A lone impostor no longer always gets clue 1.** With "Prefer words not seen" on, a repeat word hands out its least-seen clue first. The README says "a lone impostor always gets clue 1", with a note about the preference. pw15 only passes because it starts with an empty history. Confirm this is wanted (the user did say the preference "should affect hints too").
3. **Should a fooled impostor's own word count as "seen"?** They saw it, but only the crew word is counted today.
4. **"Reset all to default" turns the preference back on but keeps the word history.** Is that intended, or should it also clear history?
5. **History weighting also changes the category mix.** Heavily played categories come up less often, which the "Random picks by word" rule didn't anticipate. Probably fine; unconfirmed.
6. **The four small categories (45–51 words)**: top them up to ~60?
