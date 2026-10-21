# CLAUDE.md: Impostor

Read this first. It replaces a very long earlier chat (built in one session, 17–21 Oct 2026), so don't go looking for history. Player-facing rules and features are in `README.md`; this file covers how to work on the code. Lines marked **[inferred]** were reconstructed from code, tests and task logs rather than the user's own words.

## What it is
"Impostor" is a mobile pass-the-phone social deduction game. It is static: `index.html` (vanilla JS in one IIFE, inline CSS, about 130 KB) plus `words.json`, which is fetched at runtime. There is no build step. Repo `sweatyratman/Imposter` (public), deployed by Vercel on every push to the default branch.

## Git: commit and push automatically
- After every change that is finished and passes the tests, **commit and push to the default branch without asking**. Vercel deploys from there. (If a session names a feature branch, use that instead.)
- One commit per user request, with a plain message saying what changed for players (for example "Prefer unseen words; rotate clues").
- Don't push if any test fails. Fix the failure first, or tell the user what failed and ask.
- If the push is rejected, pull with `--rebase`, re-run the tests and push again. Never force-push.
- The user works from their phone: no local clone or terminal. Anything they do by hand is in GitHub's mobile web UI (dot-files can't be uploaded there; use Add file → Create new file).

## How the user wants work done
These are the "established comprehensive playtester rules":
- Act as a critical playtester. Critique and fix, not just implement.
- Test at **390×844 and 360×640**, look at screenshots, and run every suite. Add tests for each new feature.
- Every key action must fit on small phones (360×640). Large system text sizes must not clip anything (a friend's phone did).
- Update `README.md` for any player-visible change.
- Keep replies short. The user watches token spend.
- **Questions are not orders.** "Don't act; question only" or "Dont do anything, but…" means answer and change nothing.
- British English ("colour", "telly"). Relaxed tone, no corporate filler. The user trusts your judgement on content and prefers big content jobs delivered in one batch.
- Never run `pkill -f "node pw"`, because it kills your own shell.

## Game rules and design philosophy (keep these)
- A crewmate voted out means impostors win. An impostor voted out shows "Correct!", and the group chooses to vote again or stop.
- If all impostors are caught and the group stops, the crew win, unless the caught impostors guess the word (two buttons, group judges; no typed input). Multiple caught impostors must agree on one word. What a correct guess does is a setting: impostors win (default), nobody wins, or crew still win.
- With 1 crewmate and 1 impostor left, the crew win unless the impostor guesses the word. With 2 impostors left, both win. Don't revert to the old "impostor auto-wins at two".
- All-impostor rounds must look identical to normal rounds. Stopping early means the hidden impostors win. The unmask title always starts singular ("The impostor was…") and only becomes plural as the pile fans out.
- **No information leaks before a reveal.** Everything before the tape peels must be identical for crew, impostor and fooled impostor, including timing, classes and text (deal card, starter card, vote stage, strobe, unmask title, vote-again choice). Pw19–21 assert this.
- **Vote again** is hidden (only a full-width "We're done", `.split.one`) when the odds could never have dealt more impostors than have been caught (`game.maxPossible`). With any slack in the odds both buttons always show.
- **Impostor count:** "most impostors" slider 1..min(players−1, 10), default 3. Each count has its own odds slider, plus "Everyone is an impostor" (always offered). Defaults 1: 70, 2: 20, 3: 7, everyone: 3; new counts start at 4: 4, 5: 3, then 2 ("rarer the more there are"). `announce` (default off) tells the table how many are still hiding.
- **Clues:** four per word, handed out in deal order (1, 2, 3, 4, 1, 2…) so impostors rarely share one; a lone impostor gets clue 1 on a fresh word. Old one-clue lists still work.
- **Category/clue toggles:** "Show the category" (default on; off shows a paper tag with black [REDACTED] tape until results) and "Give impostors a clue word" (default on; off is no-clue mode). Both off triggers a setup warning. Rules lock when the round starts.
- **Random category picks by word, not by category**, so small categories don't repeat. Multi-select: Random clears the others, picking any category un-selects Random, deselecting the last falls back to Random.
- **Scores:** everyone on the winning side gets a point (when the last two impostors win, only the named winners). Carry across rounds. Trophy button on every screen; reset needs confirmation. Leaving/ending uses an in-game slide-up sheet, never `confirm()`.
- **Impostors think they're crew** ("fooled") is off by default, with a chance slider (default 100% when switched on), rolled per impostor. A fooled impostor gets a crew card with a different word from the same category. Multiple fooled impostors get distinct words (never the crew's, never each other's). The reveal looks exactly like a crew reveal and shows crew for 1 second, then a slow stained-ink ripple turns it into the impostor card. The results ledger has a "Thought they were crew" row with each word.
  - While the chance is above 0%, the category is forced to shown (its toggle is greyed out).
  - The clue toggle is greyed out (and off) only at 100%. Below that, only aware impostors get clues. At 0% both toggles return, with the user's saved choices restored.
- **Prefer words not seen before** is on by default. A word counts once the starting player is announced (`countRound()`, idempotent); abandoned rounds don't count. Weight is 1/(1+n)². Clues are ordered least-seen first (ties keep original order), so a returning word gives even a lone impostor its least-seen clue (confirmed as intended). Only clues an aware impostor actually saw count. With it off, words are uniformly random and clues are in normal order; history still records. "Reset word history" clears it; "Reset all to default" turns the option back on but keeps history.
- **The goal is the fewest repeated words.** The user: "game is exponentially more boring when you encounter the same words". So bigger lists, word/clue history, no intangible words, and no near-duplicates within a category (their examples: sun/heat, rain/dew).
- The whole Nature & Weather category was removed on request (confirmed: the whole category; don't bring any back). There are 20 categories and 1191 words.
- **Look:** a "midnight card table". Navy felt, paper cards, brass for "the next move"; fonts Unbounded (display) and Atkinson Hyperlegible (body). 3D cards, tape, stage lighting. The reveal is deliberately dramatic. Respect reduced motion.
- **Reveal drama:** the room dims as the card lands; three beats, each darker with a harder shake and phone thump; a held breath (near-black, dead still); then the tape rips off with a flash. Only then does the outcome show (impostor: red wash and hit; crew: teal wash and heavy sigh). Strobe is a slow breath, not a glitch (user: "looks like it's glitching out").
- **Presentation details:** deal is tap to flip up, tap to flip down (no hide button, the card never moves). Locking the phone or switching tab hides the role; a reload mid-reveal goes back to "pass". The starter card has 3 tapes (2 corners plus a `[REDACTED]` role tape), never a role symbol. Vote cards show no name above them (the card carries it as aria-label). Both category states use the `.redcat` paper tag on its own centred row. House rules are always visible. Sliders move only with a deliberate sideways drag; the player slider gives small counts more room. Quips never repeat the same line twice in a row.

## Code map (`index.html`)
- **State:** localStorage `impostor-party-v1` = `{settings, game, recent, history}`. The words cache is `impostor-party-words-v1`. `recent` is legacy and unused.
- **Settings:** `defaultSettings`. `RULE_KEYS` are reset by "Reset all to default" (`ACTIONS.resetRules`). The keys are `weights` (1/2/3/all), `maxImpostors`, `announce`, `showHint`, `showCategory`, `preferNew`, `unaware`, `unawareChance`, `guessRule` and `wordsUrl`. **Any new setting must go in `defaultSettings`, `load()` and `RULE_KEYS` (if a house rule), with a migration for old saves.** `load()` already migrates the old single `category`, the `found` screen, missing `showHint`, single `alt` and `recent`; `reveal` → `pass` on load; unknown screens drop the game.
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
- **Words format:** `[word, clue1..clue4]`. Quips are in `QUIPS` (banks: wrong, caught, impWin, crewWin, draw; `{name}` is the player).

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
- Coverage: pw5 category select; pw6 no layout shift 280–520px; pw8 big end-to-end (71 checks); pw9 long names/words; pw10 vote grid 3–20 players; pw11 pixel brightness; pw12 playtest outcomes; pw13 category distribution; pw14 clue toggle; pw15 slider caps, clue cycling, leaderboard, redaction, tile grid, 4 distinct clues, old saves; pw16 reset all; pw17 unmask title; pw18 slider touch; pw19 strobe; pw20 drama timeline; pw21 fooled impostors; pw22 `maxPossible`; pw23 large text ×1/1.3/1.5/1.8; pw24 word history.
- **Not covered:** WebKit/iOS Safari, real-device font scaling, remote `wordsUrl`/offline cache, vibration patterns, visual snapshot diffs.

## Content rules
- **Format:** `[word, clue1, clue2, clue3, clue4]`. Clue 1 is the original and stays first. All 4 clues distinct; none contains the word.
- **Family Fortunes rule:** "Name a <category> linked to <clue>". If the room would buzz the secret word first, the clue is too obvious; if it gives no foothold, it's too vague. Examples: fox "cunning" → "bins"; salt "table" → "chips"; Christmas "December" → "wrapping"; ambulance "999" → "flashing"; rainbow "sky" → "colours".
- Avoid cheap shots and table-awkward entries ("bin man" → "estate agent"; "Johnny Depp" → "Keira Knightley").
- **No intangibles or near-duplicates.** Every word should be a concrete thing you could point at or name; avoid pairs so close they blur (sun/heat, rain/dew). Check a category for this before adding to it.
- UK-centric (Bonfire Night, MOT, telly, Hogmanay, cuppa, milk float).
- Four categories are under the ~60-word target: TV Shows 51, Video Games 45, Brands 46, Famous People 50. Others are 60–68.
- **Quip tone:** cheeky, roasty, British, meme-literate, one short line ("Cooked. Absolutely cooked.", "{name} folded like a deckchair.").

## Open questions (ask the user before changing)
1. Should a fooled impostor's own word count as "seen"? They did see it; only the crew word is counted today. (Previous chat's lean: yes.)
2. "Reset all to default" keeps word history. Intended?
3. History weighting also shifts the category mix (heavily played categories come up less). Probably fine; unconfirmed.
4. Top up the four small categories to ~60 words?
- Suggested next job: audit all 20 categories for near-duplicate pairs and swap them out.
- Deferred: an app/Play Store wrapper (PWA/TWA/Capacitor). The user asked to do nothing about it.
