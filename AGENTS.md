# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **Risk browser game** monorepo (npm workspaces) with 6 packages. No Docker, no database, no external services needed — everything runs in-memory on Node.js v22.

### Quick reference

Standard commands are in the root `README.md` and `package.json` scripts. Key ones:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Typecheck | `npm run typecheck` |
| Tests | `npm run test` |
| Build all | `npm run build` |
| Dev server (backend) | `npm run dev:server` (port 4242) |
| Dev server (frontend) | `npm run dev:web` (port 5173) |

### Non-obvious caveats

- **Build order matters**: `shared-types` must build before `game-engine`, which must build before any app. The root npm scripts handle this automatically, so always use root-level commands (`npm run dev:server`) rather than running workspace dev commands directly.
- **Server does not log a "listening" message to stdout** when started with `tsx watch`. Verify it's running with `curl http://127.0.0.1:4242/health` which should return `{"ok":true,...}`.
- **No database or `.env` required**: All state is in-memory. Default config values work out of the box (see `apps/server/src/config.ts`).
- **Frontend connects to backend at `http://127.0.0.1:4242`** by default (via `VITE_API_BASE_URL`). Both must be running for the game UI to work.
- **API-driven game testing**: You can create lobbies, add bots, and start games via REST API without the browser. See `apps/server/src/routes/lobbies.ts` and `apps/server/src/routes/games.ts` for endpoints.
