# CLAUDE.md: Impostor

**Mission: we are creating the world's best, quintessential, go-to impostor game app.** Judge every change against that.

**Core tenets** (judge every change against all three):
1. **Silky animations.** Every transition should feel smooth, deliberate and premium: no jank, jumps, flicker or layout shift. Animate only `transform` and `opacity` where possible (GPU-friendly), use easing rather than linear motion, keep timings consistent, and check every new screen or state change animates in and out. Respect reduced motion.
2. **User experience.** Obvious, low-friction and kind to a table of people passing one phone: few taps, clear wording, nothing that makes anyone wait, guess or squint. It works for first-timers without a rulebook, and for big text and small phones.
3. **Customisability.** Groups play their own way: house rules cover the variants people argue about, defaults are sensible, every option explains itself, and each one can be put back easily.

Read this first. It replaces a very long earlier chat (built in one session, 17–21 Oct 2026), so don't go looking for history. Player-facing rules and features are in `README.md`; this file covers how to work on the code. Lines marked **[inferred]** were reconstructed from code, tests and task logs rather than the user's own words.

## What it is
"Impostor" is a mobile pass-the-phone social deduction game. It is static: `index.html` (vanilla JS in one IIFE, inline CSS, about 130 KB) plus `words.json`, which is fetched at runtime. There is no build step. Repo `sweatyratman/Imposter` (public), deployed by Vercel on every push to the default branch.

## Git: commit and push automatically
- The user wants quick iteration on live gameplay: after every finished change that passes the checks below, **commit and push straight to `main` without asking** (standing permission, even if a session names a feature branch). Vercel deploys from `main`.
- One commit per user request, with a plain message saying what changed for players (for example "Prefer unseen words; rotate clues").
- Don't push if a check that applies fails. Fix it first, or tell the user what failed and ask.
- If the push is rejected, pull with `--rebase`, re-run the checks and push again. Never force-push.
- The user works from their phone: no local clone or terminal. Anything they do by hand is in GitHub's mobile web UI (dot-files can't be uploaded there; use Add file → Create new file).

### When to run which tests (the full suite takes 20+ minutes)
- **Docs only** (`README.md`, `CLAUDE.md`): no tests.
- **Word list only** (`words.json` swaps/additions, no structure change): the validity check (4 distinct clues, none containing the word, no duplicate names per region in a category) plus pw15, pw24 and pw25. Also pw5 if categories change.
- **Small logic or copy change** in one area: that area's suites (see coverage below) plus pw8.
- **Full `run.sh`** (before pushing) when the change touches any of: verdict/unmask/ink timing, the deal or shuffle flow, layout/CSS shared across screens, settings or save format (`defaultSettings`, `load()`, `RULE_KEYS`), round setup (`startRound`), or anything affecting what crew, impostor and fooled players see before the peel. Batch several requests into one push so the full run happens once.
- Never skip the layout checks (pw12, pw23, 360×640) for a visible UI change.
- Run suites with output going to a file (not piped through `tail`) and a long timeout, in the background.

## How the user wants work done
These are the "established comprehensive playtester rules":
- Act as a critical playtester. Critique and fix, not just implement.
- Test at **390×844 and 360×640**, look at screenshots, and run every suite. Add tests for each new feature.
- Every key action must fit on small phones (360×640). Large system text sizes must not clip anything (a friend's phone did).
- Update `README.md` for any player-visible change.
- Keep replies short. The user watches token spend.
- **Tidy up after yourself.** Never leave stray files (test screenshots, logs, scratch folders) in the repo; delete them or gitignore them before finishing.
- **Questions are not orders.** "Don't act; question only" or "Dont do anything, but…" means answer and change nothing.
- British English ("colour", "telly"). Relaxed tone, no corporate filler. The user trusts your judgement on content and prefers big content jobs delivered in one batch.
- Never `pkill -f` a pattern that appears in your own command line (`"node pw"`, `"timeout 600 node pw"`…): it kills your own shell. Stop a background run with its task id instead.

## Game rules and design philosophy (keep these)
- A crewmate voted out means impostors win. An impostor voted out shows "Correct!", and the group chooses to vote again or stop.
- If all impostors are caught and the group stops, the crew win, unless the caught impostors guess the word (two buttons, group judges; no typed input). Multiple caught impostors must agree on one word. What a correct guess does is a setting: impostors win (default), nobody wins, or crew still win.
- With 1 crewmate and 1 impostor left, the crew win unless the impostor guesses the word. With 2 impostors left, both win. Don't revert to the old "impostor auto-wins at two".
- All-impostor rounds must look identical to normal rounds. Stopping early means the hidden impostors win. The unmask title always starts singular ("The impostor was…") and only becomes plural as the pile fans out.
- **No information leaks before a reveal.** Everything before the tape peels must be identical for crew, impostor and fooled impostor, including timing, classes and text (deal card, starter card, vote stage, strobe, unmask title, vote-again choice). Pw19–21 assert this.
- **Vote again** is hidden (only a full-width "We're done", `.split.one`) when the odds could never have dealt more impostors than have been caught (`game.maxPossible`). With any slack in the odds both buttons always show.
- **Impostor count:** "most impostors" slider 1..min(players−1, 10), default 3. Each count has its own odds slider, plus "Everyone is an impostor" (always offered). Default odds follow the player count (`AUTO_ODDS`, user's spec 21 Oct): 3 players 93/0 + 7 everyone; 4 players 86/7/0 + 7; bigger groups lean to 2 then 3 (10: 20/50/23; 13+: 5/25/63). **Everyone is always 7%** (`ALL_PCT`), and the other counts are rescaled to 93% if the max is lowered; counts above 3 start at 0%. `settings.weights` is `{}` until the user moves an odds slider, which freezes all visible odds; reset clears it. Old saves holding the old fixed 70/20/7/3 are migrated to `{}`. `announce` (default off) tells the table how many impostors there are and how many are still hiding; **while it's on, "Everyone is an impostor" is locked to 0%** (`allLocked()`, user agreed 21 Oct), since announcing the count would give it away. The saved weight is kept for when it's off.
- **Quick setups** (`PRESETS`: Beginner, Classic, Chaos) set the gameplay keys only (not word list, history or region); `presetOn()` highlights the matching one, otherwise "your own mix". Classic equals the defaults. `settings.preset` remembers the last one chosen, and **Reset odds returns to that preset's odds** (`oddsBase()`), not the Classic ones; Reset all house rules clears it.
- **Optional fairness rules** (user, 23 Oct: "my friends instinctively dislike weighting… it shifts the likelihoods", so **all off by default**; Beginner turns on the first two): `fairStart` (starter picked from crew only), `noRepeat` (last round's impostors, `settings.lastImps` by name, get weight .25 when impostors are drawn; recorded every round), `mrWhite` (with 2+ aware impostors one gets `game.white`: no clue, own card text, "Mr White" badge/ledger row; scores as an impostor).
- **Ties** (`game.tie`, `tieRule` 'revote' | 'random' | 'starter'): "It's a tie" on the vote screen (3+ suspects) → mark the tied (`tiepick`) → `tieBreak`: re-vote/starter restrict the grid to the tied (`tie.only`); random jumps straight to the stage ("The tie is broken at random…"). Confirming a vote or "Vote again" clears it.
- **Scoring options:** `accuserBonus` ("Who called it? +1" chips on the Correct! screen, `game.bonus` added in `finish()`; the verdict card is smaller for the whole reveal when it's on, `.credited`, so the buttons fit at 360×640), `guessHalf` (a stolen win pays 1), `firstTo` (0/5/10/15/20; `outcome.champions` → banner + "New game" which zeroes scores). `scoringNote()` explains whatever is on.
- **Sound** (`sfx()`, Web Audio synthesised: thump ×3, rip, hit/sigh, ink; `settings.sound`, device-wide, default on). Pre-peel sounds are identical for every role (pw31). `sfx` also fires a window `impostor-sfx` event, used by tests.
- **Saved groups** (`GROUPS_KEY` `impostor-groups-v1` = `{active, list:[{id, name, settings, history}]}`; `groupSwitch()`, `showGroups()`): each group keeps its own settings (players, rules, scores) and word history. The live state stays in `KEY`; a group's snapshot is saved when you switch away and loaded through `load()` when you switch to it. `seenHowto`, `region` and `wordsUrl` are device-wide. Only switchable on the setup screen; the current group can't be deleted; deleting asks first. pw30.
- **Results table** (`rosterHTML()`): one table for roles, "out #n", +points and totals, sorted by total with a 👑 leader; the scoring note and Reset scores sit under it.
- **Pace:** `drama` 'full' | 'quick' (Quick = the skip-countdown verdict path, a 1.5s shuffle and a 450ms unmask; identical for every role, pw28). `timer` 0/60/120/180/300s: an optional clue timer docked above "We're ready to vote" (`tickTimer()`, `game.timerEnd`/`timerLeft`); tap to start/pause, buzzes at zero, never forces the vote. Both lock at round start (`game.quick`, `game.timer`).
- **How to play** (`HOWTO` scenes, `openHowto()`/`howtoShow()`/`howtoGo()`): 5 animated scenes with captions. **No voice and no auto-advance** (user, 22 Oct: the voice went and it moved on too fast). Swipe left/right (pointer events; the scene follows the finger, >50px sideways moves on, else springs back), Next/Back, arrow keys, ✕; an animated "Swipe for the next tip" cue; swiping past the last scene closes it. First visit shows a "New here?" invitation (`settings.seenHowto`). Scene animations are transform/opacity only; reduced motion shows them still. (If human voiceover returns later, add per-scene audio but keep it user-paced.)
- **Screen cross-fade** (`ghostOut()` in `render()`): the old screen's snapshot (`.xfade`, never `.ghost`: that's the quiet button style) fades out in a **closed** shadow root (so page queries and Playwright never see duplicates), styled via one adopted stylesheet. Skipped for the deal (pass↔reveal), the shuffle, vote→verdict and reduced motion.
- **Summary above Start** (`summaryText()`, refreshed in `save()`): players · impostors · clues · pace · region; tap jumps to house rules.
- **Resets have three looks** (user's rule: the distinction must be obvious): `.reset.all` brass = Reset all house rules; `.reset.scope` plain outline = one section (Reset odds: weights + max impostors); `.reset.wipe` coral with ✕ = wipes saved data (word history, scores; always confirm). New resets must pick one of these.
- **Clues:** four per word, handed out in deal order (1, 2, 3, 4, 1, 2…) so impostors rarely share one; a lone impostor gets clue 1 on a fresh word. Old one-clue lists still work.
- **Category/clue toggles:** "Show the category" (default on; off shows a paper tag with black [REDACTED] tape until results) and "Give impostors a clue word" (default on; off is no-clue mode). Both off triggers a setup warning. Rules lock when the round starts.
- **Random category picks by word, not by category**, so small categories don't repeat. Multi-select: Random clears the others, picking any category un-selects Random, deselecting the last falls back to Random.
- **Scores** (user's choice, 21 Oct; `finish()`, `SCORING_NOTE`): crew win 1 per crewmate; impostors win 2 each, 3 if the round had a lone impostor; caught impostors 0 unless the win came from their guess (`byGuess`). "Nobody wins" scores nobody. Fooled impostors score as impostors. `outcome.scored` is `{index: points}` (older saves: an array of +1s). pw27 covers every path. Carry across rounds. Trophy button on every screen; reset needs confirmation. Leaving/ending uses an in-game slide-up sheet, never `confirm()`.
- **Impostors think they're crew** ("fooled") is off by default, with a chance slider (default 100% when switched on), rolled per impostor. A fooled impostor gets a crew card with a different word from the same category. Multiple fooled impostors get distinct words (never the crew's, never each other's). The reveal looks exactly like a crew reveal and shows crew for 1 second, then a slow stained-ink ripple turns it into the impostor card. The results ledger has a "Thought they were crew" row with each word.
  - While the chance is above 0%, the category is forced to shown (its toggle is greyed out).
  - The clue toggle is greyed out (and off) only at 100%. Below that, only aware impostors get clues. At 0% both toggles return, with the user's saved choices restored.
- **Prefer words not seen before** is on by default. A word counts once the starting player is announced (`countRound()`, idempotent); abandoned rounds don't count. A fooled impostor's own word counts too (they saw it). Weight is 1/(1+n)². Clues are ordered least-seen first (ties keep original order), so a returning word gives even a lone impostor its least-seen clue (confirmed as intended). Only clues an aware impostor actually saw count. With it off, words are uniformly random and clues are in normal order; history still records. "Reset word history" clears it; "Reset all house rules" turns the option back on but keeps history.
- **The goal is the fewest repeated words.** The user: "game is exponentially more boring when you encounter the same words". So bigger lists, word/clue history, no intangible words, and no near-duplicates within a category (their examples: sun/heat, rain/dew).
- The whole Nature & Weather category was removed on request (confirmed: the whole category; don't bring any back). There are 20 categories and 1329 entries; every category has 52–74 words in every region (pw25 asserts ≥45).
- **Look:** a "midnight card table". Navy felt, paper cards, brass for "the next move"; fonts Unbounded (display) and Atkinson Hyperlegible (body). 3D cards, tape, stage lighting. The reveal is deliberately dramatic. Respect reduced motion.
- **Reveal drama:** the room dims as the card lands; three beats, each darker with a harder shake and phone thump; a held breath (near-black, dead still); then the tape rips off with a flash. Only then does the outcome show (impostor: red wash and hit; crew: teal wash and heavy sigh). Strobe is a slow breath, not a glitch (user: "looks like it's glitching out").
- **Presentation details:** deal is tap to flip up, tap to flip down (no hide button, the card never moves). Locking the phone or switching tab hides the role; a reload mid-reveal goes back to "pass". The starter card has 3 tapes (2 corners plus a `[REDACTED]` role tape), never a role symbol. Vote cards show no name above them (the card carries it as aria-label). Both category states use the `.redcat` paper tag on its own centred row. House rules are always visible. Sliders move only with a deliberate sideways drag; the player slider gives small counts more room. Quips never repeat the same line twice in a row.

## Code map (`index.html`)
- **State:** localStorage `impostor-party-v1` = `{settings, game, recent, history}`. The words cache is `impostor-party-words-v1`. `recent` is legacy and unused.
- **Settings:** `defaultSettings`. `RULE_KEYS` are reset by "Reset all house rules" (`ACTIONS.resetRules`). The keys are `weights` (1/2/3/all), `maxImpostors`, `announce`, `showHint`, `showCategory`, `preferNew`, `unaware`, `unawareChance`, `guessRule`, `drama`, `timer`, `fairStart`, `noRepeat`, `mrWhite`, `tieRule`, `accuserBonus`, `guessHalf`, `firstTo` and `wordsUrl`. **Any new setting must go in `defaultSettings`, `load()` and `RULE_KEYS` (if a house rule), with a migration for old saves.** `load()` already migrates the old single `category`, the `found` screen, missing `showHint`, single `alt` and `recent`; `reveal` → `pass` on load; unknown screens drop the game.
- **Flow:** the `SCREENS` map plus `render()`, and `ACTIONS` (start, reveal/hide, skipShuffle, ready, vote/confirm, verdictNext, again, stop, guess, unmask, toResults, …).
- **Timers:** use `later()` and `clearTimers()` (called on every `render()`). `clearTimers()` also cancels `inkRaf`. A raw `setTimeout` fires on the wrong screen; `lightFx` is the deliberate exception. `busy` and `REDUCED` are module flags.
- **Round setup:** `startRound()` picks the word (weighted), then `chooseOption(n).count`. It sets `game.impostors`, `alts`, `fooled`, `clue`, `maxPossible`, `showHint`, `showCategory`, `counted`.
- **Fooled-impostor helpers:** `fooling()`, `allFooled()`, `isFooled`, `altOf` (still reads old `game.alt`), `looksImpostor`.
- **History:** `history = {w:{}, h:{}}` keyed by `HKEY(cat, word)`. Also `seenNote()` and `ACTIONS.resetHistory`.
- **Reveal:** `runVerdict` handles the peel, slam/sigh and the ink ripple for fooled impostors. `ACTIONS.unmask` handles the end-of-game pile (F = 2050 ms).
  - Lighting uses `lights()`, `lightFx()`, `beat()` and the `#spot` layer.
  - The ink effect is `inkRipple(card, name, dur, onDone)`: radial-gradient masks plus the `#inkEdge` SVG filter.
- **Cards:** the 3D card is `.c3d > .c3d-inner > .cside.cback / .cface`. The strobe is `strobeStain`.
- **Top bar:** `barHTML()`, with `.redcat` paper tag and [REDACTED] tape when the category is hidden.
- **Layout safety:**
  - A global `[hidden]{display:none!important}` rule (a `.wrow` once beat the UA rule).
  - `fitText`/`fitTagline` re-run on resize and again once web fonts load (Unbounded is wider than the fallback). Steps of ×0.93, minimum 40% (6px on vote cards); names up to 2 lines, words never break mid-word.
  - Any new header row with a button beside text must wrap (`.rules > .row { flex-wrap: wrap }`). The `.seg` grid auto-fits.
  - The stage card size is `--cw: min(64vw,256px,31vh)` (`min(60vw,236px,27vh)` at max-height 700px).
  - The CSS uses px, so emulate large text by scaling computed font sizes, not the root font size.
  - Breakpoints: <330px bar labels hide; <300px names in 1 column; <350px category note wraps; <340px category grid drops to 3 columns.
- **Fragile spots:** never animate opacity or transform on an ancestor of `.tape` around the peel (the `rolePop` bug hid the tape; animate only `.rtext`). The verdict card must arrive face-up and taped (pw11).
- **Words format:** `[word, clue1..clue4]`, plus an optional region note object (see Content rules). `sanitise()` turns notes into `category.loc[word]`; `regionWord(c, w)` returns the word as the current region knows it, or null. `game.word`/`game.alts` hold the shown names and `game.wkey`/`game.altKeys` the base names; history always uses base names. Region is not in `RULE_KEYS`; it defaults from `navigator.languages` (`guessRegion()`). Quips are in `QUIPS` (banks: wrong, caught, impWin, crewWin, draw; `{name}` is the player).

## Tuning values
| Area | Value |
|---|---|
| Players | 3–20, default 5. `COUNT_GAP(k) = 1 + 1.3·max(0, 10−k)/7` |
| Auto-advance | `AUTO_MS` 4000 (after "Wrong person!" / "both win"; tap skips) |
| Deal | hide → exit 520ms, next card 900ms; enter .45s; flip .7s |
| Shuffle | gather 30ms, split 950/1350/1950/2350, draw 3000, flip 3500, land 4800 |
| Verdict build-up | room .4 on landing; strobe/tremble from 250ms; 3 beats **800ms** apart |
| Each beat (f = beat÷3) | room dims to `.42 + f·.48`; tremble `--tr = 1.1 + 2.6f`, period `.72 − .34f` s; vibrate [22, 70, 34] |
| Held breath | at t−80: room .97, 650ms |
| Tape off | ≈3450ms; peels 200ms apart, 1s each; vibrate [120, 40, 80] |
| Outcome | hit/sigh 750ms after tape off; lights up +1500; screen ends +3000 |
| Skip-countdown | 450ms frantic strobe before the peel |
| Fooled verdict | ripple at tape-off +2200 (gives the 1s of crew), lasts 2600ms, then hit, ends ripple end +1600 |
| Ink ripple | drops at (x .5,y .6,start 0,reach .66), (.18,.2,.16,.74), (.82,.82,.3,.7) of the diagonal; smoothstep; 22px feather; displacement 20→0 (power 1.3); rings fade from 72% |
| Unmask pile | F = 2050ms; beats every 550ms; hush at F−400; flip+flash at F; fan at F+1000. Fooled: ripple at F+2100 (several) / F+1500 (one), 2400ms; else hit at F+600 |
| Strobe | 2.4s breath, peak opacity .42; last beat 1.6s; no jitter |
| Light effects | flash .75s; tint 2.2s; classes cleared after 2400ms |
| Vibration | impostor hit [90,50,90,50,220]; crew sigh [160]; ink [30,150,30,150,30,150,30] |
| Vote grid | gap 12px; cards ≤170px wide; height ratio 1.4; a lone card on its own row scored ×0.8 |
| Word weight | 1/(1+n)². 1 fresh word vs 19 played 5× came up ~65% on vs ~3% off |

## Tests (`tests/`)
- Playwright on Chromium only. Scripts `pw5`–`pw24` (no pw1–4 or pw7). Each starts its own local http server and aborts Google Fonts requests. In the cloud sandbox Playwright is at `/opt/npm-tools/node_modules` (set `NODE_PATH`).
- Run with `cd tests && npm install && npx playwright install chromium && bash run.sh`. Use `bash run.sh all` to include the slow pw13 (3000-round category distribution). `tests/.gitignore` ignores `node_modules/` and `*.png` (pw9–11 write screenshots).
- **Gotchas:**
  - Some suites hard-code the word list: 20 categories, 21 category cards including Random, 4 different clues per word (pw15). Update them on any category change.
  - Animation-timing tests wait for state classes (for example `.stack-area.fanned`), not fixed sleeps.
  - Slider tests use CDP touch events.
  - **Timing-sensitive:** pw17, pw20, pw21 (and pw24's statistical weighting check, small flake chance). Re-check them if any verdict or unmask timing changes. They flaked at beat boundaries before; sample times sit off the boundaries.
- Coverage: pw5 category select; pw6 no layout shift 280–520px; pw8 big end-to-end (71 checks); pw9 long names/words; pw10 vote grid 3–20 players; pw11 pixel brightness; pw12 playtest outcomes; pw13 category distribution; pw14 clue toggle; pw15 slider caps, clue cycling, leaderboard, redaction, tile grid, 4 distinct clues, old saves; pw16 reset all; pw17 unmask title; pw18 slider touch; pw19 strobe; pw20 drama timeline; pw21 fooled impostors; pw22 `maxPossible`; pw23 large text ×1/1.3/1.5/1.8; pw24 word history; pw25 regions (locale defaults, filtering, local names, clue swaps, fooled words, history keys, 360px fit); pw26 default odds by player count; pw27 scoring; pw28 quick setups, summary, Quick reveals, clue timer, audit fixes; pw29 how to play + cross-fade + get-the-game card; pw30 saved groups; pw31 fairness options, Mr White, ties, scoring options, sounds.
- **Not covered:** WebKit/iOS Safari, real-device font scaling, remote `wordsUrl`/offline cache, vibration patterns, visual snapshot diffs.

## Content rules
- **Format:** `[word, clue1, clue2, clue3, clue4]`. Clue 1 is the original and stays first. All 4 clues distinct; none contains the word.
- **Family Fortunes rule:** "Name a <category> linked to <clue>". If the room would buzz the secret word first, the clue is too obvious; if it gives no foothold, it's too vague. Examples: fox "cunning" → "bins"; salt "table" → "chips"; Christmas "December" → "wrapping"; ambulance "999" → "flashing"; rainbow "sky" → "colours".
- Avoid cheap shots and table-awkward entries ("bin man" → "estate agent"; "Johnny Depp" → "Keira Knightley").
- **No intangibles or near-duplicates.** Every word should be a concrete thing you could point at or name; avoid pairs so close they blur (sun/heat, rain/dew). Check a category for this before adding to it.
- UK-centric (Bonfire Night, MOT, telly, Hogmanay, cuppa, milk float).
- **Regions** (`settings.region`: `uk` | `us` | `au` | `all`, labelled UK / US / Aus / Everywhere). An entry may end with a note object: `{"in": ["uk","au"]}` restricts it to those regions; `{"us": "flashlight"}` renames it there; `{"us": ["purse", c1..c4]}` swaps name and clues. No note = known everywhere. Everywhere drops every `in` word and uses base names.
  - **Familiarity, not exclusivity.** A region is "words players there will likely know", not "words from there". US and UK pop culture is known in all three, so tag `in` only when players elsewhere probably wouldn't know the word (Greggs, Bunnings, Cinco de Mayo); otherwise leave it global (Harry Potter, Walmart, Jeopardy!, the outback). The user's examples: Harry Potter and The Simpsons must appear in all four options.
  - When adding words, decide for each: known everywhere, or local (tag `in`)? Does a region call it something else (spelling counts: theater, donut)? Add the region favourites locals would expect.
  - A local name must not clash with another word in that region (the validator in the content job checks this).
- **No country with its own city.** A country and its famous city blur (France/Paris), so the category never holds both (21 Oct: 17 swaps, e.g. France→Belgium, England→Finland, USA→Cuba, Australia→Fiji).
- **Quip tone:** cheeky, roasty, British, meme-literate, one short line ("Cooked. Absolutely cooked.", "{name} folded like a deckchair.").

## Market research
See **`reviews.md`** (22 Oct): what players love, hate and want across the top Play/App Store impostor apps, plus house rules and variants from the wider genre. Use it when prioritising features. Reddit couldn't be reached from the cloud sandbox; that section still needs real Reddit evidence.

## Long-term plan (user, 22 Oct)
- Goal: a great free game that earns through a few small in-app purchases ("if a free game is great, people are more likely to drop a couple of quid on it").
- **Keep free forever:** the full core game, all current categories, scores, regions, secret ballot (when built). Never paywall mid-game. No ads, no timers or energy limits.
- **Sell:** word packs (£0.99–1.99: Pub Night, Kids & Family, Internet Culture, Seasonal, 18+), custom categories (£1.99), extra modes bundle (£1.99), cosmetics (£0.99: card backs, tape, felts, reveal stings), an "everything" bundle (£4.99).
- **Implications now:** store purchases need app-store builds (Apple/Google take 15% at small-business rates), so the static page will be wrapped (e.g. Capacitor) once the free game is polished. Build new content as **separate add-on packs** that can be locked later, not ever more entries in one list. Polish the free experience first.

## Ideas backlog (brainstormed 22 Oct; none built yet)
Top picks: secret ballot (20), screen wake lock (17), sound with mute (38), play again with the same group (1), custom categories (32).
- **Starting a game:** 1 play again with the same group; 2 saved groups; 3 presets (Beginner/Classic/Chaos); 4 settings summary above Start; 5 seating order (drag names); 6 first-run how-to-play cards; 7 "?" explainers on house rules; 8 tips that fit the group size.
- **Deal:** 9 hold-to-reveal; 10 "I forgot my word" re-check (identical timing for everyone); 11 undo last pass; 12 haptic tick on flip (Android only).
- **Discussion:** 13 optional timer; 14 speaking-order hint; 15 "another lap of clues?"; 16 rules peek sheet; 17 screen wake lock; 18 block pull-to-refresh/zoom; 19 Android back goes back a screen.
- **Voting:** 20 secret ballot with tally reveal; 21 tie re-vote; 22 vote history in results.
- **Results:** 23 shareable result image; 24 MVP highlight; 25 more celebration variety; 26 round recap line; 27 rematch with a different starter.
- **Long-term pull:** 28 session vs all-time leaderboard; 29 stats (best impostor, most wrongly accused, streaks); 30 end-of-session titles; 31 word thumbs-down feedback.
- **Content:** 32 custom categories in the app; 33 family-safe filter; 34 word difficulty; 35 seasonal spotlight; 36 new categories (Pub, School Days, Holidays, Internet Culture, British Telly Legends); 37 top up Celebrations/TV Shows for Everywhere.
- **Feel and polish:** 38 sound design with mute (the only drama iPhones get, since they can't vibrate from the web); 39 colour-blind safety (icon/pattern, not just red/teal); 40 tablet layout; 41 name avatars on vote cards; 42 results go straight to new-round choices; 43 "new players" one-pager on Game On; 44 install to home screen (overlaps the parked app idea; ask first).
- **Modes (paid-bundle candidates):** 45 detective role; 46 blank card (no word, wins by surviving); 47 team mode; 48 speed round; 49 sudden death; 50 category roulette.
- **Rejected:** online multiplayer and accounts, typed guesses, forced timers, ads and analytics, live AI-generated words, collapsing house rules, achievement spam, custom themes.

## Open questions (ask the user before changing)
0. **OUTSTANDING: "Get the game" link is a placeholder.** The results screen card (`getGameHTML()`, QR from the built-in `qrMatrix()` encoder, Share button) points at `GET_GAME_URL` = this website. When the game becomes a Play Store / App Store app, change `GET_GAME_URL` to the store link (or a page that redirects to the right store) and update the card's wording. The user asked for this to be tracked (22 Oct).
1. History weighting also shifts the category mix (heavily played categories come up less). Probably fine; unconfirmed.
2. Celebrations has 52 and TV Shows 55 words in Everywhere mode (most locals are UK). Add more global ones?
- Settled: "Reset all house rules" must never touch word history; it has its own "Reset word history" button (pw24 checks this).
- Deferred: an app/Play Store wrapper (PWA/TWA/Capacitor). The user asked to do nothing about it.
