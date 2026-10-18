# Impostor

A pass-the-phone social deduction game. Pick players, categories and the odds of 1, 2, 3 or all-impostor rounds, then hand the phone round to reveal roles. No server and no build step, just static files.

## Deploy

1. Create a GitHub repo and push these three files (`index.html`, `words.json`, `README.md`) to the root.
2. In Vercel: **Add New → Project**, import the repo, leave every setting on its default (Framework Preset: *Other*, no build command, no output directory), and click **Deploy**.

## How a round works

- Each player taps their card to see their role, then taps it again to hide it and pass the phone on. Crew see the secret word; impostors see only a hint.
- The cards are shuffled and one is drawn to show who goes first.
- Everyone gives clues, then the group votes someone out. Their card is revealed after a countdown.
  - Crewmate voted out: **impostors win**. Any impostors still hiding are then revealed.
  - Impostor voted out: the crew choose whether to vote again.
  - Crew stop with an impostor still hiding: **impostors win**.
  - Crew stop with every impostor caught: **crew win**, but the caught impostors get one shot at saying the secret word. If more than one was caught, they must agree on a single word. What a correct guess does is set on the setup screen: impostors win, nobody wins, or the crew still win.
- **Last two:** if only 1 crewmate and 1 impostor are left, the crew win unless that impostor guesses the word.
- **Everyone is an impostor:** voting continues until two players are left, and both of them win.
- Locking the phone is fine. The game is saved and picks up where it left off, and a role on screen is hidden again when the phone locks.

## Words and hints

Words are fetched from `words.json` on page load, so you can edit the list without touching the code. The last successful copy is cached for offline play.

```json
{ "categories": [ { "name": "Animals", "emoji": "🐾", "words": [["penguin", "cold"]] } ] }
```

Each entry is `[word, hint]`. To use a list hosted elsewhere (for example a raw GitHub or Gist link), paste its URL into **Word list** on the setup screen.

The one-liners shown after votes and on the results screen are in the `QUIPS` list near the top of `index.html`. `{name}` is replaced with the player's name.
