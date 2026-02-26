# CLI Usage

The CLI is available in `apps/cli` and can be run with:

```bash
npm run dev --workspace @risk/cli -- --help
```

By default it targets `http://127.0.0.1:4242` (`RISK_SERVER_URL` override).

## Common Commands

### List open lobbies

```bash
npm run dev --workspace @risk/cli -- list-games
```

### Create lobby

```bash
npm run dev --workspace @risk/cli -- create-game --host "Commander" --max 4
```

### Join lobby

```bash
npm run dev --workspace @risk/cli -- join-game --code AB12CD --name "Player Two"
```

### Start game

```bash
npm run dev --workspace @risk/cli -- start-game --game <gameId>
```

### Fetch private state

```bash
npm run dev --workspace @risk/cli -- state --game <gameId> --player <playerId> --secret <playerSecret>
```

### Submit action

```bash
npm run dev --workspace @risk/cli -- submit-action --game <gameId> --player <playerId> --secret <playerSecret> --action '{"type":"end_attack"}'
```

### Replay scripted actions

```bash
npm run dev --workspace @risk/cli -- replay-script --game <gameId> --player <playerId> --secret <playerSecret> --file ./actions.json
```

### Local simulation

```bash
npm run dev --workspace @risk/cli -- simulate-local --players 4
```
