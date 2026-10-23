# Impostor

A pass-the-phone social deduction game. Pick players, categories, the most impostors a round can have and the odds of each, then hand the phone round to reveal roles. No server and no build step, just static files.

## Deploy

1. Create a GitHub repo and push the files to the root (`index.html`, `words.json`, `README.md`, `CLAUDE.md`, `tests/`). Vercel only serves `index.html` and `words.json`; the rest is for development.
2. In Vercel: **Add New → Project**, import the repo, leave every setting on its default (Framework Preset: *Other*, no build command, no output directory), and click **Deploy**.

## How to play, in the app

New players see a **"New here?"** invitation on the setup screen, and the **?** button by the trophy replays it any time: six short animated scenes (the deal, passing the phone, clues, the vote, how it ends, and a pointer to House rules). Swipe left for the next tip (or tap Next); swipe right to go back. It never moves on by itself.

## Saved groups

The **👥 group button** on the setup screen keeps separate save slots, for example "D&D crew" and "Work lot". Each group has its own players, house rules, word history and scores. "Start fresh" makes a new group with default rules; tap a group to switch to it; rename the current one or delete others (it asks first). Region and the word list link are shared across groups.

## How a round works

- Each player taps their card to see their role, then taps it again to hide it and pass the phone on. Crew see the secret word; impostors see only a clue. Every word has four clues: a lone impostor always gets clue 1, and with more impostors they're handed out in deal order, cycling 1, 2, 3, 4, 1, 2…, so impostors rarely share a clue. (With "Prefer words not seen before" on, the cycle starts from whichever clues have been seen least for that word.)
- The cards are shuffled and one is drawn to show who goes first.
- Everyone gives clues, then the group votes someone out. Their card is revealed with a full build-up: the room dims, the card shakes harder on each beat of the 3-2-1 and the phone thumps, then there is a held silence in the dark before the tape rips off with a flash. Only then does the outcome show: an impostor takes a hit and the room flushes red, a crewmate gets a heavy sigh and a teal wash. Everything before the tape comes off is identical for crew and impostor. If the impostors get away, the tap-to-reveal pile gets the same treatment. Reduced-motion settings skip all of it.
  - Crewmate voted out: **impostors win**. Any impostors still hiding are then revealed.
  - Impostor voted out: the crew choose whether to vote again.
  - Crew stop with an impostor still hiding: **impostors win**.
  - Crew stop with every impostor caught: **crew win**, but the caught impostors get one shot at saying the secret word. If more than one was caught, they must agree on a single word. What a correct guess does is set on the setup screen: impostors win, nobody wins, or the crew still win.
- **Vote again** is only offered while more impostors could still be hiding. If your odds could never have dealt more impostors than have now been caught (say, 100% chance of exactly 1 impostor and that one is caught), the button is dropped and only "We're done" is shown. With any slack in the odds both buttons always appear, so nothing is given away.
- **Last two:** if only 1 crewmate and 1 impostor are left, the crew win unless that impostor guesses the word.
- **Everyone is an impostor:** the round plays exactly like any other, so nobody can tell. If the group votes until two are left, both of them win; if they stop early, the impostors still hiding win.
- **Where are you playing?** Under the categories, pick **UK**, **US**, **Aus** or **Everywhere**. It starts on your phone's language setting.
  - The aim is that everyone at the table will know the word, not that every word comes from your country. Words known everywhere (Harry Potter, The Simpsons, Walmart, the outback) show up in every region.
  - UK, US and Aus use the local name for things (torch, flashlight; duvet, comforter, doona; petrol station, gas station, servo) and add local favourites (Greggs and Bonfire Night; s'mores and Cinco de Mayo; Bunnings and Kath & Kim). Words that players elsewhere probably wouldn't know are left out of their region.
  - **Everywhere** keeps only the words everyone knows, under their British names, which suits mixed groups.
  - It isn't a house rule, so "Reset all house rules" leaves it alone, and switching never touches your word history.
- During a round the category sits on its own centred line just below the top buttons.
- **Get the game:** the results screen has a QR code and a Share link button so others at the table can get the game on their own phone. (For now it points at this website; it will point at the app stores later.)
- **Results** show one table: every player's role, when they went out, the points they just won and their running total (with a 👑 for the leader).
- **Scores** carry over between rounds. Crew win: 1 point per crewmate. Impostors win: 2 points per impostor, or 3 for a lone impostor, who beat the odds alone. A caught impostor gets nothing, unless the caught impostors' guess is what wins it. ("Nobody wins" scores nobody; "Crew still win" scores the crew.) The trophy button at the top of every screen opens the leaderboard, with a button to reset it. Scores also show on the results screen.
- **The setup screen** is a lit card table up top (players, categories, where you're playing); from **House rules** down it turns into the house rulebook, in oxblood leather with a brass stitched seam.
- **Above Start** a one-line summary says how the game will play (for example "5 players · mostly 1 impostor · clues on · UK"). Tap it to jump to the house rules.
- **House rules** sit on the setup screen:
  - **Quick setups:** Beginner (one or two impostors, the count announced), Classic (the standard game) and Chaos (more impostors, half of them fooled into thinking they're crew). One tap sets the gameplay rules; change anything after and it shows as your own mix. **Reset odds** puts the impostor sliders back to the odds of the setup you picked.
  - **Pace:** reveals can be **Full drama** or **Quick** (straight to the reveal, for groups playing lots of rounds). There's also an optional **clue timer** (off, 1, 2, 3 or 5 minutes) on the Game on screen: tap to start or pause, and it buzzes when time's up. It never forces the vote.
  - **Most impostors in a round:** a slider from 1 up to everyone-but-one, never more than 10. Each number up to that gets its own odds slider, plus "Everyone is an impostor", which is always available.
  - **Default odds follow the group size.** Small groups nearly always get one impostor (3 players: 93% one, 4 players: 86% one, 7% two); bigger groups lean to two, then three (10 players: 20% / 50% / 23%). "Everyone is an impostor" is always 7%. Move any slider and your own odds stick, whatever the player count, until "Reset all house rules".
  - Whether to tell everyone how many impostors there are. While this is on, "Everyone is an impostor" is switched off (greyed out at 0%), because announcing the count would give it away straight away; your setting for it comes back when you turn announcing off.
  - **Impostor clues:** "Show the category during gameplay" and "Give impostors a clue word" (both on by default), plus "Impostors think they're crew" (off by default, see below).
  - **Resets look different depending on what they do.** **Reset all house rules** (brass, at the top) puts every house rule back; players, names, categories, region, scores and word history are left alone. **Reset odds** (plain outline, in "Impostors per round") puts just the impostor sliders back. Resets that wipe saved data, **Reset word history** and **Reset scores**, are coral with an ✕ and always ask first.
  - What a correct guess by caught impostors does, and the word list.
  - **Prefer words not seen before** (on by default): the game remembers how often each word has been played on this device and favours fresh ones (a word played n times is weighted 1/(1+n)²). It also rotates clues, so a returning word hands out the clue seen least. A word counts once the first player has been announced, and a fooled impostor's own word counts too, since they saw it. Turn it off and picking is truly random with clues in their normal order. "Reset word history" clears the memory; "Reset all house rules" turns the option back on.
- **Fair play** (all off by default; the Beginner setup turns on the first two):
  - **The impostor never goes first:** the starting player is always crew. Fairer on the impostor, though it tells everyone the starter is safe.
  - **Avoid the same impostor twice in a row:** last round's impostors are a quarter as likely to be picked again (never ruled out).
  - **Mr White:** with two or more impostors, one of them gets a blank card: no word, no clue.
- **Ties:** tap **It's a tie** on the vote screen, mark the tied players, then **Break the tie**. A house rule picks how: **Re-vote** (the tied players give one more clue each, then everyone votes between just them), **Random**, or **First player** (whoever went first decides).
- **Scoring options:** **+1 for calling out an impostor** (tap who called it on the Correct! screen); **a stolen win pays 1 point** (instead of 2 or 3); **Play to** 5, 10, 15 or 20 points, with a champion banner and a "New game" button that puts scores back to 0.
- **Sound:** reveals have sound effects (thumps on the countdown, the tape ripping, a hit or a sigh, the ink bleeding through). They're identical for crew and impostor until the tape comes off. Switch them off under Pace.
- **Impostors think they're crew:** switch it on and an impostor may be dealt a perfectly ordinary crew card ("You're crew", with a secret word), except the word is a different one from the same category. They get no clue and have no idea. Every fooled impostor in a round gets a different word of their own (never the crew's word, never each other's). A slider sets the chance that each impostor is fooled (100% by default, so all of them; at 50% roughly half are fooled and half know). Fooled impostors only find out when they're voted out: the reveal plays out exactly like a crewmate's, including a full second of the crew card after the tape comes off, and then the impostor card bleeds through it in a slow, stained ink ripple. The same happens in the tap-to-reveal pile when the impostors get away, and the results list who was fooled and the word they had. While it is on (and the chance is above 0%) the category toggle greys out, because the category is shown to everyone. The clue toggle stays available below 100%, and only impostors who weren't fooled get a clue; at 100% every impostor is fooled, so it greys out too. Your own choices come back when you switch it off or lower the chance. The slider is hidden while the option is off, and "Reset all house rules" turns it back off.
- **No-clue mode:** switch off "Give impostors a clue word" and impostors only see the category. They have to pick the word up from everyone else's clues, which makes them much harder to hide and their final guess much harder. In an everyone-is-an-impostor round with no clues, nobody knows anything and it becomes pure bluffing.
- **Hidden category:** switch off "Show the category during gameplay" and the top bar shows a paper tag with black [REDACTED] tape over the category (the same tape as the cards) until the results. With clues on, impostors get a clue with no context, which is harder. With both off, impostors get nothing and must bluff entirely from the others (the setup screen warns you). If only one category is picked, everyone knows it anyway.
- Sliders only move with a deliberate sideways drag, so scrolling past them never changes a setting. The players slider gives the smaller numbers more room.
- Locking the phone is fine. The game is saved and picks up where it left off, and a role on screen is hidden again when the phone locks.

## Words and hints

Words are fetched from `words.json` on page load, so you can edit the list without touching the code. The last successful copy is cached for offline play.

```json
{ "categories": [ { "name": "Animals", "emoji": "🐾", "words": [["penguin", "waddle", "black and white", "ice", "fish"]] } ] }
```

Each entry is `[word, clue1, clue2, clue3, clue4]`, optionally followed by a region note:

```json
["torch", "camping", "beam", "cupboard", "power cut", { "us": "flashlight" }]
["Greggs", "pastry", "bakery", "cheap", "high street", { "in": ["uk"] }]
["handbag", "designer", "leather", "purse", "shoulder", { "us": ["purse", "designer", "leather", "clutch", "shoulder"] }]
```

`in` limits a word to the regions where players would likely know it (`uk`, `us`, `au`). A region key renames the word there, or swaps the name and clues when it's a list. Words with no note are known everywhere. Clue 1 is the main one. Each clue should fit the word without pointing straight at it: if "name a thing associated with [clue]" would have most people blurt out the word, it's too obvious. Older lists with one clue per word (`[word, clue]`) still work; every impostor just gets that clue. To use a list hosted elsewhere (for example a raw GitHub or Gist link), paste its URL into **Word list** on the setup screen.

The one-liners shown after votes and on the results screen are in the `QUIPS` list near the top of `index.html`. `{name}` is replaced with the player's name.

## Tests

Browser tests live in `tests/` (Playwright + Chromium). `cd tests && npm install && npx playwright install chromium && ./run.sh`. Add `all` to also run the slow category-distribution test (pw13). A few suites check the shipped word list itself (20 categories, 4 different clues per word), so update them if you change the categories.
