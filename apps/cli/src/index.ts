#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import {
  createGameState,
  getLegalActions,
  applyGameAction,
  DefaultRandomSource,
  PLAYER_COLORS,
} from "@risk/game-engine";
import type { RiskAction } from "@risk/shared-types";

const BASE_URL = process.env.RISK_SERVER_URL ?? "http://127.0.0.1:4242";
const program = new Command();

program
  .name("risk-cli")
  .description("CLI utilities for Risk browser game operations")
  .version("0.1.0");

program
  .command("list-games")
  .description("List open game lobbies")
  .action(async () => {
    const result = await apiRequest("/api/lobbies");
    print(result);
  });

program
  .command("create-game")
  .description("Create a new game lobby")
  .requiredOption("--host <name>", "Host player name")
  .option("--max <number>", "Max players", "6")
  .action(async (options) => {
    const result = await apiRequest("/api/lobbies", {
      method: "POST",
      body: JSON.stringify({
        hostName: options.host,
        maxPlayers: Number(options.max),
      }),
    });
    print(result);
  });

program
  .command("join-game")
  .description("Join an existing lobby by code")
  .requiredOption("--code <lobbyCode>", "Lobby code")
  .requiredOption("--name <playerName>", "Player name")
  .option("--kind <kind>", "human | bot | agent", "human")
  .action(async (options) => {
    const result = await apiRequest(`/api/lobbies/${options.code}/join`, {
      method: "POST",
      body: JSON.stringify({
        playerName: options.name,
        kind: options.kind,
      }),
    });
    print(result);
  });

program
  .command("start-game")
  .description("Start lobby gameplay")
  .requiredOption("--game <gameId>", "Game ID")
  .action(async (options) => {
    const result = await apiRequest(`/api/games/${options.game}/start`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    print(result);
  });

program
  .command("state")
  .description("Fetch private game state for a player")
  .requiredOption("--game <gameId>", "Game ID")
  .requiredOption("--player <playerId>", "Player ID")
  .requiredOption("--secret <playerSecret>", "Player secret")
  .action(async (options) => {
    const query = new URLSearchParams({
      playerId: options.player,
      playerSecret: options.secret,
    });
    const result = await apiRequest(`/api/games/${options.game}/state?${query.toString()}`);
    print(result);
  });

program
  .command("legal-actions")
  .description("Fetch legal action hints for the current player")
  .requiredOption("--game <gameId>", "Game ID")
  .requiredOption("--player <playerId>", "Player ID")
  .requiredOption("--secret <playerSecret>", "Player secret")
  .action(async (options) => {
    const query = new URLSearchParams({
      playerId: options.player,
      playerSecret: options.secret,
    });
    const result = await apiRequest(
      `/api/games/${options.game}/legal-actions?${query.toString()}`,
    );
    print(result);
  });

program
  .command("submit-action")
  .description("Submit a JSON action payload")
  .requiredOption("--game <gameId>", "Game ID")
  .requiredOption("--player <playerId>", "Player ID")
  .requiredOption("--secret <playerSecret>", "Player secret")
  .requiredOption("--action <json>", "Action JSON string")
  .action(async (options) => {
    const action = JSON.parse(options.action) as RiskAction;
    const result = await apiRequest(`/api/games/${options.game}/action`, {
      method: "POST",
      body: JSON.stringify({
        playerId: options.player,
        playerSecret: options.secret,
        action,
      }),
    });
    print(result);
  });

program
  .command("replay-script")
  .description("Replay sequential actions from a local JSON file against server API")
  .requiredOption("--game <gameId>", "Game ID")
  .requiredOption("--player <playerId>", "Player ID")
  .requiredOption("--secret <playerSecret>", "Player secret")
  .requiredOption("--file <path>", "Path to JSON array of action objects")
  .action(async (options) => {
    const content = await readFile(options.file, "utf-8");
    const actions = JSON.parse(content) as RiskAction[];
    for (const action of actions) {
      const result = await apiRequest(`/api/games/${options.game}/action`, {
        method: "POST",
        body: JSON.stringify({
          playerId: options.player,
          playerSecret: options.secret,
          action,
        }),
      });
      print(result);
    }
  });

program
  .command("simulate-local")
  .description("Run local engine simulation with bot-like random legal play")
  .option("--players <count>", "Number of players", "4")
  .action(async (options) => {
    const playerCount = Math.max(2, Math.min(6, Number(options.players)));
    const players = Array.from({ length: playerCount }, (_, index) => ({
      id: `sim_${index + 1}`,
      name: `Sim ${index + 1}`,
      kind: "bot" as const,
      color: PLAYER_COLORS[index],
    }));

    let state = createGameState({
      gameId: "sim_local",
      lobbyCode: "SIM001",
      players,
    });
    const rng = new DefaultRandomSource();
    const maxTurns = 5000;

    for (let turn = 0; turn < maxTurns && !state.winnerId; turn += 1) {
      const current = state.currentPlayerId;
      const legal = getLegalActions(state, current);
      if (legal.length === 0) {
        break;
      }

      const action = chooseRandomActionFromHint(legal[0], state);
      const result = applyGameAction(state, current, action, rng);
      if (!result.ok) {
        break;
      }
      state = result.state;
    }

    print({
      winnerId: state.winnerId,
      round: state.round,
      phase: state.currentPhase,
      territoriesByPlayer: state.players.map((player) => ({
        player: player.name,
        territories: player.territories,
      })),
    });
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});

async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as { message?: string } & Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      payload?.message ? String(payload.message) : `Request failed: ${response.status}`,
    );
  }
  return payload;
}

function chooseRandomActionFromHint(
  hint: { type: string },
  state: ReturnType<typeof createGameState>,
): RiskAction {
  const territories = Object.values(state.territories);
  const mine = territories.filter((territory) => territory.ownerId === state.currentPlayerId);
  const enemy = territories.filter((territory) => territory.ownerId !== state.currentPlayerId);
  const fallbackMine = mine[0]?.id ?? territories[0].id;
  const fallbackEnemy = enemy[0]?.id ?? territories[0].id;

  switch (hint.type) {
    case "claim_territory": {
      const unowned = territories.find((territory) => territory.ownerId === null)?.id;
      return {
        type: "claim_territory",
        territoryId: unowned ?? territories[0].id,
      };
    }
    case "place_troops":
      return {
        type: "place_troops",
        territoryId: fallbackMine,
        troops: 1,
      };
    case "attack":
      return {
        type: "attack",
        fromTerritoryId: fallbackMine,
        toTerritoryId: fallbackEnemy,
        attackDice: 1,
      };
    case "occupy":
      return {
        type: "occupy",
        troops: state.pendingOccupation?.minTroops ?? 1,
      };
    case "end_attack":
      return { type: "end_attack" };
    case "fortify":
      return {
        type: "fortify",
        fromTerritoryId: fallbackMine,
        toTerritoryId: fallbackMine,
        troops: 1,
      };
    case "end_turn":
      return { type: "end_turn" };
    case "trade_cards":
      return {
        type: "trade_cards",
        cardIds: state.players.find((player) => player.id === state.currentPlayerId)?.cards
          .slice(0, 3)
          .map((card) => card.id) ?? [],
      };
    default:
      return { type: "end_turn" };
  }
}

function print(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
