# Architecture Overview

## System Components

1. **Game Engine (`packages/game-engine`)**
   - Pure deterministic Risk rules and state machine.
   - Encodes map topology (42 territories, continents, adjacency).
   - Enforces legal action transitions.
   - Handles combat dice resolution, cards, elimination, and victory.

2. **Shared Contracts (`packages/shared-types`)**
   - Shared DTOs for actions, game states, lobbies, and event payloads.
   - Used by server, web client, MCP server, and CLI.

3. **Realtime Backend (`apps/server`)**
   - Fastify REST API for lobby + gameplay commands.
   - Socket.IO realtime fanout of public/private state updates.
   - In-memory session registry with player credential validation.
   - Bot runner for autonomous bot seats.

4. **Web Client (`apps/web`)**
   - React + Vite desktop-first board UI.
   - Textured board theme and SVG territory interaction.
   - Lobby creation/join flow.
   - In-game command panels for all phases.
   - Onboarding tour and battle log.

5. **MCP Bridge (`apps/mcp-server`)**
   - Stdio MCP server exposing game tools.
   - Lets external agents create, join, inspect, and play games.

6. **CLI (`apps/cli`)**
   - Operational commands for local dev and scripted interactions.
   - Supports simulation and replay workflows.

## Data Flow

- Browser/CLI/MCP clients call REST endpoints in `apps/server`.
- Server mutates `EngineState` via `applyGameAction`.
- Server broadcasts updates through Socket.IO:
  - Public state to game room.
  - Private state per authenticated player socket.
- MCP tools and CLI are thin orchestration layers over REST.

## Security Model (MVP)

- Every joined seat receives a `playerSecret`.
- Action and private state APIs require `(playerId, playerSecret)`.
- Server validates turn ownership and legal actions against engine rules.

## Runtime Limitations (MVP)

- In-memory sessions only (no DB persistence).
- Desktop-first web UX.
- No matchmaking/accounts/ranking.
