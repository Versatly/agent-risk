# Risk Browser Game + MCP Agents

A full-stack, desktop-first Risk-style strategy game for the browser with:

- **Classic Risk core loop** (claim, reinforce, attack, occupy, fortify, cards, elimination, victory),
- **Realtime multiplayer backend** (Fastify + Socket.IO),
- **Built-in bot seats** for local games and smoke testing,
- **MCP server** so autonomous agents can create/join/play games,
- **CLI tooling** for operations, scripted replay, and local simulation,
- **Board-game-inspired UI** with textured presentation, map interactions, and onboarding.

## Monorepo Layout

- `apps/web` — React + Vite UI
- `apps/server` — Fastify + Socket.IO game backend
- `apps/mcp-server` — MCP stdio bridge for agent control
- `apps/cli` — developer CLI for game operations/simulation
- `packages/game-engine` — deterministic Risk rules engine
- `packages/shared-types` — shared contracts and DTOs
- `docs/` — architecture, rules, MCP, CLI, skills, attribution

## Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Start backend

```bash
npm run dev:server
```

Server defaults to `http://127.0.0.1:4242`.

### 3) Start frontend (new terminal)

```bash
npm run dev:web
```

Vite defaults to `http://127.0.0.1:5173`.

### 4) (Optional) Run MCP server (new terminal)

```bash
npm run dev:mcp
```

### 5) (Optional) CLI help

```bash
npm run dev:cli
```

## Quality Commands

```bash
npm run typecheck
npm run test
npm run build
```

## Environment Variables

- `PORT` (server port, default `4242`)
- `HOST` (server host, default `0.0.0.0`)
- `CORS_ORIGIN` (default `*`)
- `BOT_TICK_MS` (bot turn cadence, default `1200`)
- `RISK_SERVER_URL` (MCP/CLI API base, default `http://127.0.0.1:4242`)
- `VITE_API_BASE_URL` (web API base, default `http://127.0.0.1:4242`)

## Documentation Index

- `docs/architecture.md`
- `docs/game-rules-implemented.md`
- `docs/mcp-agent-play.md`
- `docs/cli-usage.md`
- `docs/skills/risk-agent-play.md`
- `docs/assets-and-attribution.md`
- `docs/mvp-validation.md`
