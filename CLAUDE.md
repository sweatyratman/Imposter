# CLAUDE.md: Impostor

Read this first. It replaces a very long earlier chat, so don't go looking for history. Player-facing rules and features are in `README.md`; this file covers how to work on the code.

## What it is
"Impostor" is a mobile pass-the-phone social deduction game. It is static: `index.html` (vanilla JS in one IIFE, inline CSS, about 130 KB) plus `words.json`, which is fetched at runtime. There is no build step. It's hosted on GitHub and deployed by Vercel on every push to the default branch.

## Git: commit and push automatically
- After every change that is finished and passes the tests, **commit and push to the default branch without asking**. Vercel deploys from there.
- One commit per user request, with a plain message saying what changed for players (for example "Prefer unseen words; rotate clues").
- Don't push if any test fails. Fix the failure first, or tell the user what failed and ask.
- If the push is rejected, pull with `--rebase`, re-run the tests and push again. Never force-push.

## How the user wants work done
These are the "established comprehensive playtester rules":
- Act as a critical playtester. Critique and fix, not just implement.
- Test at **390×844 and 360×640**, look at screenshots, and run every suite. Add tests for each new feature.
- Every key action must fit on small phones (360×640). Large system text sizes must not clip anything (a friend's phone did).
- Update `README.md` for any player-visible change.
- Keep replies short. The user is spending a lot of tokens.
- Never run `pkill -f "node pw"`, because it kills your own shell.

## Game rules and design philosophy (keep these)
- A crewmate voted out means impostors win. An impostor voted out shows "Correct", and the group chooses to vote again or stop.
- If all impostors are caught and the group stops, the crew win, unless the caught impostors guess the word. Multiple caught impostors must agree on one word. What a correct guess does is a setting: impostors win, nobody wins, or crew still win.
- With 1 crewmate and 1 impostor left, the crew win unless the impostor guesses the word.
- All-impostor rounds must look identical to normal rounds. If 2 are left, both win. Stopping early means the hidden impostors win.
- **No information leaks before a reveal.** Everything before the tape peels must be identical for crew and impostor, including timing, classes and text. This applies to fooled impostors too.
- **Vote again** is hidden (only a full-width "We're done" shows) when the odds could never have dealt more impostors than have been caught (`game.maxPossible`).
- Clues follow the Family Fortunes rule: a clue narrows things down without pointing at the word. Each word has 4 clues, and clue 1 is the original.
- The look is a midnight card table: 3D cards, tape, stage lighting. The reveal is deliberately dramatic. Respect reduced motion.
- **Impostors think they're crew** is off by default, with a chance slider (default 100%). A fooled impostor gets a crew card with a different word from the same category. Multiple fooled impostors get distinct words. The reveal looks exactly like a crew reveal and shows crew for 1 second, then a slow stained-ink ripple turns it into the impostor card.
  - While the chance is above 0%, the category is forced to shown (its toggle is greyed out).
  - The clue toggle is greyed out (and off) only at 100%. Below that, only aware impostors get clues.
- **Prefer words not seen before** is on by default. A word counts once the starting player is announced (`countRound()`, idempotent). The weighting is 1/(1+n)². Clue order also prefers the least-seen clues, so a returning word gives even a lone impostor its least-seen clue (confirmed as intended). With it off, words are uniformly random and clues come in their normal order. History still records while it's off.
- The whole Nature & Weather category was removed on request (confirmed: the whole category). There are 20 categories and 1191 words.
- **The goal is the fewest repeated words.** The user: "game is exponentially more boring when you encounter the same words". So no intangible words, and no near-duplicates within a category (their examples: sun/heat, rain/dew). Bigger lists and the word/clue history serve the same goal.

## Code map (`index.html`)
- **State:** localStorage `impostor-party-v1` = `{settings, game, recent, history}`. The words cache is `impostor-party-words-v1`. `recent` is legacy and unused.
- **Settings:** `defaultSettings`. `RULE_KEYS` are reset by "Reset all to default" (`ACTIONS.resetRules`). The keys are `weights` (1/2/3/all), `maxImpostors`, `announce`, `showHint`, `showCategory`, `preferNew`, `unaware`, `unawareChance`, `guessRule` and `wordsUrl`.
- **Flow:** the `SCREENS` map plus `render()`, and `ACTIONS` (start, reveal/hide, skipShuffle, ready, vote/confirm, verdictNext, again, stop, guess, unmask, toResults, …).
- **Timers:** use `later()` and `clearTimers()`. `clearTimers()` also cancels `inkRaf`. `busy` and `REDUCED` are module flags.
- **Round setup:** `startRound()` picks the word (weighted), then `chooseOption(n).count`. It sets `game.impostors`, `alts`, `fooled`, `clue`, `maxPossible`, `showHint`, `showCategory`, `counted`.
- **Fooled-impostor helpers:** `fooling()`, `allFooled()`, `isFooled`, `altOf`, `looksImpostor`.
- **History:** `history = {w:{}, h:{}}` keyed by `HKEY(cat, word)`. Also `seenNote()` and `ACTIONS.resetHistory`.
- **Reveal:** `runVerdict` handles the peel, slam/sigh and the ink ripple for fooled impostors. `ACTIONS.unmask` handles the end-of-game pile (F = 2050 ms).
  - Lighting uses `lights()`, `lightFx()`, `beat()` and the `#spot` layer.
  - The ink effect is `inkRipple(card, name, dur, onDone)`: radial-gradient masks plus the `#inkEdge` SVG filter.
- **Cards:** the 3D card is `.c3d > .c3d-inner > .cside.cback / .cface`. The strobe is `strobeStain`.
- **Top bar:** `barHTML()`, with `.redcat` paper tag and [REDACTED] tape when the category is hidden.
- **Layout safety:**
  - A global `[hidden]{display:none!important}` rule.
  - `fitText`/`fitTagline` re-run on resize.
  - The `.seg` grid auto-fits.
  - The stage card size is `--cw: min(64vw,256px,31vh)` (27vh on short phones).
  - The CSS uses px, so emulate large text by scaling computed font sizes, not the root font size.
- **Words format:** `[word, clue1..clue4]`. Quips are in `QUIPS`.

## Tests (`tests/`)
- These are Playwright scripts `pw5`–`pw24`. Each starts its own local http server and aborts Google Fonts requests.
- Run with `cd tests && npm install && npx playwright install chromium && ./run.sh`. Use `./run.sh all` to include the slow pw13 (3000-round category distribution).
- **Gotchas:**
  - Some suites hard-code the word list: 20 categories, 21 category cards including Random, 4 different clues per word.
  - Animation-timing tests wait for state classes (for example `.stack-area.fanned`), not fixed sleeps.
  - Slider tests use CDP touch events.
- pw24 covers word history: default on, reset, counted once at the starter, weighting on vs off, clue rotation, fooled/no-clue rounds count no clue.
