# Impostor

A pass-the-phone social deduction game. Pick players, categories, the most impostors a round can have and the odds of each, then hand the phone round to reveal roles. No server and no build step, just static files.

## Deploy

1. Create a GitHub repo and push these three files (`index.html`, `words.json`, `README.md`) to the root.
2. In Vercel: **Add New → Project**, import the repo, leave every setting on its default (Framework Preset: *Other*, no build command, no output directory), and click **Deploy**.

## How a round works

- Each player taps their card to see their role, then taps it again to hide it and pass the phone on. Crew see the secret word; impostors see only a clue. Every word has four clues: a lone impostor always gets clue 1, and with more impostors they're handed out in deal order, cycling 1, 2, 3, 4, 1, 2…, so impostors rarely share a clue.
- The cards are shuffled and one is drawn to show who goes first.
- Everyone gives clues, then the group votes someone out. Their card is revealed after a countdown.
  - Crewmate voted out: **impostors win**. Any impostors still hiding are then revealed.
  - Impostor voted out: the crew choose whether to vote again.
  - Crew stop with an impostor still hiding: **impostors win**.
  - Crew stop with every impostor caught: **crew win**, but the caught impostors get one shot at saying the secret word. If more than one was caught, they must agree on a single word. What a correct guess does is set on the setup screen: impostors win, nobody wins, or the crew still win.
- **Last two:** if only 1 crewmate and 1 impostor are left, the crew win unless that impostor guesses the word.
- **Everyone is an impostor:** the round plays exactly like any other, so nobody can tell. If the group votes until two are left, both of them win; if they stop early, the impostors still hiding win.
- **Scores** carry over between rounds: everyone on the winning side gets a point. The trophy button at the top of every screen opens the leaderboard, with a button to reset it. Scores also show on the results screen.
- **House rules** sit on the setup screen:
  - **Most impostors in a round:** a slider from 1 up to everyone-but-one, never more than 10. Each number up to that gets its own odds slider, plus "Everyone is an impostor", which is always available.
  - Whether to tell everyone how many impostors there are.
  - **Give impostors a clue word** and, in its own box, **Show the category during gameplay** (both on by default).
  - **Reset all to default** at the top puts every house rule back (players, names, categories and scores are left alone).
  - What a correct guess by caught impostors does, and the word list.
- **No-clue mode:** switch off "Give impostors a clue word" and impostors only see the category. They have to pick the word up from everyone else's clues, which makes them much harder to hide and their final guess much harder. In an everyone-is-an-impostor round with no clues, nobody knows anything and it becomes pure bluffing.
- **Hidden category:** switch off "Show the category during gameplay" and the top bar just says "Category hidden" until the results. With clues on, impostors get a clue with no context, which is harder. With both off, impostors get nothing and must bluff entirely from the others (the setup screen warns you). If only one category is picked, everyone knows it anyway.
- Locking the phone is fine. The game is saved and picks up where it left off, and a role on screen is hidden again when the phone locks.

## Words and hints

Words are fetched from `words.json` on page load, so you can edit the list without touching the code. The last successful copy is cached for offline play.

```json
{ "categories": [ { "name": "Animals", "emoji": "🐾", "words": [["penguin", "waddle", "black and white", "ice", "fish"]] } ] }
```

Each entry is `[word, clue1, clue2, clue3, clue4]`. Clue 1 is the main one. Each clue should fit the word without pointing straight at it: if "name a thing associated with [clue]" would have most people blurt out the word, it's too obvious. Older lists with one clue per word (`[word, clue]`) still work; every impostor just gets that clue. To use a list hosted elsewhere (for example a raw GitHub or Gist link), paste its URL into **Word list** on the setup screen.

The one-liners shown after votes and on the results screen are in the `QUIPS` list near the top of `index.html`. `{name}` is replaced with the player's name.
