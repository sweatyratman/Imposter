# Impostor

A pass-the-phone social deduction game. Pick players, a category and the odds of 1, 2, 3 or all-impostor rounds, then hand the phone round to reveal roles. No server and no build step, just static files.

## Deploy

1. Create a GitHub repo and push these three files (`index.html`, `words.json`, `README.md`) to the root.
2. In Vercel: **Add New → Project**, import the repo, leave every setting on its default (Framework Preset: *Other*, no build command, no output directory), and click **Deploy**.

## How a round works

- Crew see the secret word. Impostors see only a hint.
- Everyone discusses, then votes someone out.
  - Crewmate voted out: **impostors win**.
  - Impostor voted out: the app says so, then asks whether to vote again.
  - Crew say no with an impostor still hiding: **impostors win**.
  - Crew say no and every impostor is found: **crew win**, but an impostor can still win by guessing the secret word.
- **Last-two rule:** if the crew keep voting impostors out until only 1 crewmate and 1 impostor are left (so there was one fewer impostor than players), the crew win automatically, but the last impostor gets one guess at the secret word to steal it.
- **Everyone is an impostor:** there is no crew, so the only way the round ends is when two players are left, and both remaining impostors win. The "stop voting" option is hidden in these rounds.
- **Category:** pick one, or leave it on **Random** to get a different category each round.
- Locking the phone is fine. Nothing keeps the screen awake, the game state is saved and picks up where it left off, and a role on screen is hidden again when the phone locks.

## Words and hints

Words are fetched from `words.json` on page load, so you can edit the list without touching the code. The last successful copy is cached for offline play.

```json
{ "categories": [ { "name": "Animals", "emoji": "🐾", "words": [["penguin", "ice"]] } ] }
```

Each entry is `[word, hint]`. A good hint is loosely related, and several things could fit it. A bad hint is a near-synonym that gives the word away.

To use a list hosted elsewhere (for example a raw GitHub or Gist link), paste its URL into **Word list** on the setup screen. The host needs to allow cross-origin requests, which `raw.githubusercontent.com` does.
