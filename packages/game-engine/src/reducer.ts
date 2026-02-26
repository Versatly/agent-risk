import type { RiskAction } from "@risk/shared-types";
import { getLegalActionHints } from "./actions.js";
import { areAdjacent, isTerritoryId } from "./board.js";
import { drawCardForPlayer, tradeCards, transferCardsOnElimination } from "./cards.js";
import { resolveAttack } from "./combat.js";
import { CONTINENT_TERRITORIES, TERRITORY_IDS, type TerritoryId } from "./constants.js";
import { canFortifyBetween } from "./fortify.js";
import { calculateTotalReinforcements } from "./reinforcement.js";
import { getNextActivePlayerId } from "./setup.js";
import type { ApplyActionParams, ActionResult, EngineState } from "./types.js";
import { findWinnerId } from "./victory.js";

export function applyAction({
  state,
  playerId,
  action,
  rng,
}: ApplyActionParams): ActionResult {
  if (state.winnerId || state.currentPhase === "game_over") {
    return reject(state, "GAME_NOT_ACTIVE", "Game is already finished.");
  }

  if (state.currentPlayerId !== playerId) {
    return reject(state, "NOT_YOUR_TURN", "It is not your turn.");
  }

  const actingPlayer = state.players.find((player) => player.id === playerId);
  if (!actingPlayer || actingPlayer.isEliminated) {
    return reject(state, "ILLEGAL_ACTION", "Player cannot act.");
  }

  const legalActionTypes = new Set(
    getLegalActionHints({ state, playerId }).map((hint) => hint.type),
  );

  if (!legalActionTypes.has(action.type)) {
    return reject(
      state,
      "INVALID_PHASE",
      `Action "${action.type}" is not legal in phase "${state.currentPhase}".`,
    );
  }

  let nextState = state;
  switch (action.type) {
    case "claim_territory":
      nextState = handleClaimTerritory(state, playerId, action);
      break;
    case "place_troops":
      nextState = handlePlaceTroops(state, playerId, action);
      break;
    case "trade_cards":
      nextState = handleTradeCards(state, playerId, action);
      break;
    case "attack":
      nextState = handleAttack(state, playerId, action, rng);
      break;
    case "occupy":
      nextState = handleOccupy(state, playerId, action);
      break;
    case "end_attack":
      nextState = withLog(
        {
          ...state,
          currentPhase: "fortify",
        },
        playerId,
        "Attack phase ended. You may fortify or end turn.",
      );
      break;
    case "fortify":
      {
        const fortifiedState = handleFortify(state, playerId, action);
        if (fortifiedState === state) {
          return reject(state, "ILLEGAL_ACTION", "Invalid fortify move.");
        }

        nextState = finishTurn(fortifiedState, playerId, rng);
      }
      break;
    case "end_turn":
      nextState = finishTurn(state, playerId, rng);
      break;
    default:
      return reject(state, "ILLEGAL_ACTION", "Unsupported action.");
  }

  if (nextState === state) {
    return reject(state, "ILLEGAL_ACTION", "Action failed validation.");
  }

  const winnerId = findWinnerId(nextState);
  if (winnerId) {
    nextState = withLog(
      {
        ...nextState,
        winnerId,
        currentPhase: "game_over",
      },
      winnerId,
      `Player ${winnerId} has conquered the world!`,
    );
  }

  return {
    ok: true,
    state: nextState,
  };
}

function handleClaimTerritory(
  state: EngineState,
  playerId: string,
  action: Extract<RiskAction, { type: "claim_territory" }>,
): EngineState {
  if (!isTerritoryId(action.territoryId)) {
    return state;
  }

  const territory = state.territories[action.territoryId];
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || territory.ownerId !== null || player.reinforcementPool < 1) {
    return state;
  }

  const nextTerritories = {
    ...state.territories,
    [action.territoryId]: {
      ...territory,
      ownerId: playerId,
      troops: 1,
    },
  };

  const nextPlayers = state.players.map((entry) =>
    entry.id === playerId
      ? {
          ...entry,
          territories: entry.territories + 1,
          troopsOnBoard: entry.troopsOnBoard + 1,
          reinforcementPool: entry.reinforcementPool - 1,
        }
      : entry,
  );

  const allClaimed = TERRITORY_IDS.every(
    (territoryId) => nextTerritories[territoryId].ownerId !== null,
  );

  const nextPlayerId = getNextActivePlayerId(
    {
      ...state,
      players: nextPlayers,
    },
    playerId,
  );

  if (!allClaimed) {
    return withLog(
      {
        ...state,
        territories: nextTerritories,
        players: nextPlayers,
        currentPlayerId: nextPlayerId,
      },
      playerId,
      `${player.name} claimed ${action.territoryId}.`,
    );
  }

  return withLog(
    {
      ...state,
      territories: nextTerritories,
      players: nextPlayers,
      currentPhase: "setup_reinforce",
      currentPlayerId: nextPlayerId,
    },
    playerId,
    "All territories are claimed. Setup reinforcement begins.",
  );
}

function handlePlaceTroops(
  state: EngineState,
  playerId: string,
  action: Extract<RiskAction, { type: "place_troops" }>,
): EngineState {
  if (!isTerritoryId(action.territoryId)) {
    return state;
  }

  if (action.troops < 1) {
    return state;
  }

  const player = state.players.find((entry) => entry.id === playerId);
  const territory = state.territories[action.territoryId];
  if (
    !player ||
    territory.ownerId !== playerId ||
    player.reinforcementPool < action.troops
  ) {
    return state;
  }

  const nextPlayers = state.players.map((entry) =>
    entry.id === playerId
      ? {
          ...entry,
          reinforcementPool: entry.reinforcementPool - action.troops,
          troopsOnBoard: entry.troopsOnBoard + action.troops,
        }
      : entry,
  );

  const nextTerritories = {
    ...state.territories,
    [action.territoryId]: {
      ...territory,
      troops: territory.troops + action.troops,
    },
  };

  if (state.currentPhase === "setup_reinforce") {
    const refreshedState = {
      ...state,
      territories: nextTerritories,
      players: nextPlayers,
    };

    const nextPlayerId = getNextActivePlayerId(refreshedState, playerId);
    const nextPlayer = refreshedState.players.find(
      (entry) => entry.id === nextPlayerId,
    );
    const everyoneDone = refreshedState.players.every(
      (entry) => entry.reinforcementPool <= 0,
    );

    if (everyoneDone) {
      const firstPlayerId = refreshedState.players[0].id;
      return startReinforcementPhase(refreshedState, firstPlayerId);
    }

    if (player.reinforcementPool - action.troops <= 0 && nextPlayer) {
      return withLog(
        {
          ...refreshedState,
          currentPlayerId: nextPlayer.id,
        },
        playerId,
        `${player.name} finished setup placements.`,
      );
    }

    return withLog(
      refreshedState,
      playerId,
      `${player.name} placed ${action.troops} troop(s) on ${action.territoryId}.`,
    );
  }

  const nextPlayer = nextPlayers.find((entry) => entry.id === playerId)!;
  const phase = nextPlayer.reinforcementPool === 0 ? "attack" : state.currentPhase;

  return withLog(
    {
      ...state,
      territories: nextTerritories,
      players: nextPlayers,
      currentPhase: phase,
    },
    playerId,
    `${player.name} placed ${action.troops} troop(s) on ${action.territoryId}.`,
  );
}

function handleTradeCards(
  state: EngineState,
  playerId: string,
  action: Extract<RiskAction, { type: "trade_cards" }>,
): EngineState {
  const { state: nextState, bonus } = tradeCards(state, playerId, action.cardIds);
  if (!bonus) {
    return state;
  }

  const player = nextState.players.find((entry) => entry.id === playerId)!;
  return withLog(
    nextState,
    playerId,
    `${player.name} traded cards for ${bonus} reinforcements.`,
  );
}

function handleAttack(
  state: EngineState,
  playerId: string,
  action: Extract<RiskAction, { type: "attack" }>,
  rng: ApplyActionParams["rng"],
): EngineState {
  if (
    !isTerritoryId(action.fromTerritoryId) ||
    !isTerritoryId(action.toTerritoryId) ||
    !areAdjacent(action.fromTerritoryId, action.toTerritoryId)
  ) {
    return state;
  }

  const combat = resolveAttack(
    state,
    playerId,
    action.fromTerritoryId,
    action.toTerritoryId,
    action.attackDice,
    rng,
  );
  if (!combat) {
    return state;
  }

  let nextState = withLog(combat.state, playerId, "Battle resolved.", combat.outcome);
  if (combat.conquered) {
    const attackerTerritory = nextState.territories[action.fromTerritoryId];
    const minTroops = action.attackDice;
    const maxTroops = Math.max(minTroops, attackerTerritory.troops - 1);

    nextState = {
      ...nextState,
      currentPhase: "occupy",
      pendingOccupation: {
        fromTerritoryId: action.fromTerritoryId,
        toTerritoryId: action.toTerritoryId,
        minTroops,
        maxTroops,
      },
      players: nextState.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              hasConqueredThisTurn: true,
            }
          : player,
      ),
    };

    if (combat.defenderId) {
      const defender = nextState.players.find(
        (player) => player.id === combat.defenderId,
      );
      if (defender && defender.territories <= 0 && !defender.isEliminated) {
        nextState = transferCardsOnElimination(nextState, defender.id, playerId);
        nextState = {
          ...nextState,
          players: nextState.players.map((player) =>
            player.id === defender.id
              ? {
                  ...player,
                  isEliminated: true,
                  territories: 0,
                }
              : player,
          ),
        };

        nextState = withLog(
          nextState,
          playerId,
          `${defender.name} has been eliminated.`,
        );
      }
    }
  }

  return nextState;
}

function handleOccupy(
  state: EngineState,
  playerId: string,
  action: Extract<RiskAction, { type: "occupy" }>,
): EngineState {
  const pending = state.pendingOccupation;
  if (!pending) {
    return state;
  }

  if (action.troops < pending.minTroops || action.troops > pending.maxTroops) {
    return state;
  }

  const fromTerritory = state.territories[pending.fromTerritoryId];
  const toTerritory = state.territories[pending.toTerritoryId];
  if (
    fromTerritory.ownerId !== playerId ||
    toTerritory.ownerId !== playerId ||
    fromTerritory.troops <= action.troops
  ) {
    return state;
  }

  return withLog(
    {
      ...state,
      territories: {
        ...state.territories,
        [pending.fromTerritoryId]: {
          ...fromTerritory,
          troops: fromTerritory.troops - action.troops,
        },
        [pending.toTerritoryId]: {
          ...toTerritory,
          troops: action.troops,
        },
      },
      currentPhase: "attack",
      pendingOccupation: null,
    },
    playerId,
    `Moved ${action.troops} troop(s) into ${pending.toTerritoryId}.`,
  );
}

function handleFortify(
  state: EngineState,
  playerId: string,
  action: Extract<RiskAction, { type: "fortify" }>,
): EngineState {
  if (
    !isTerritoryId(action.fromTerritoryId) ||
    !isTerritoryId(action.toTerritoryId) ||
    action.troops < 1
  ) {
    return state;
  }

  if (
    !canFortifyBetween(state, playerId, action.fromTerritoryId, action.toTerritoryId)
  ) {
    return state;
  }

  const fromTerritory = state.territories[action.fromTerritoryId];
  const toTerritory = state.territories[action.toTerritoryId];
  if (fromTerritory.troops <= action.troops) {
    return state;
  }

  return withLog(
    {
      ...state,
      territories: {
        ...state.territories,
        [action.fromTerritoryId]: {
          ...fromTerritory,
          troops: fromTerritory.troops - action.troops,
        },
        [action.toTerritoryId]: {
          ...toTerritory,
          troops: toTerritory.troops + action.troops,
        },
      },
    },
    playerId,
    `Fortified ${action.toTerritoryId} with ${action.troops} troop(s).`,
  );
}

function finishTurn(
  state: EngineState,
  playerId: string,
  rng: ApplyActionParams["rng"],
): EngineState {
  let nextState = state;
  const currentPlayer = nextState.players.find((entry) => entry.id === playerId);
  if (!currentPlayer) {
    return state;
  }

  if (currentPlayer.hasConqueredThisTurn) {
    nextState = drawCardForPlayer(nextState, playerId, () => rng.nextDie() / 6);
  }

  const nextPlayerId = getNextActivePlayerId(nextState, playerId);
  const activePlayers = nextState.players.filter((player) => !player.isEliminated);
  const firstActivePlayerId = activePlayers[0]?.id;
  const round = nextPlayerId === firstActivePlayerId ? nextState.round + 1 : nextState.round;

  const preparedState = {
    ...nextState,
    round,
    currentPlayerId: nextPlayerId,
    currentPhase: "reinforce" as const,
    pendingOccupation: null,
    players: nextState.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            hasConqueredThisTurn: false,
          }
        : player,
    ),
  };

  const started = startReinforcementPhase(preparedState, nextPlayerId);
  const current = started.players.find((player) => player.id === nextPlayerId)!;

  return withLog(
    started,
    nextPlayerId,
    `${current.name}'s turn begins with ${current.reinforcementPool} reinforcements.`,
  );
}

function startReinforcementPhase(state: EngineState, playerId: string): EngineState {
  const reinforcement = calculateTotalReinforcements(state, playerId).total;
  return {
    ...state,
    currentPlayerId: playerId,
    currentPhase: "reinforce",
    players: state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            reinforcementPool: player.reinforcementPool + reinforcement,
            hasConqueredThisTurn: false,
          }
        : player,
    ),
  };
}

function withLog(
  state: EngineState,
  playerId: string,
  message: string,
  outcome?: EngineState["lastBattle"],
): EngineState {
  const logEntry = {
    id: `log_${Date.now()}_${state.battleLog.length}`,
    playerId,
    phase: state.currentPhase,
    message,
    timestamp: Date.now(),
    outcome: outcome ?? undefined,
  };

  const battleLog = [...state.battleLog, logEntry].slice(-80);
  return {
    ...state,
    battleLog,
  };
}

function reject(
  state: EngineState,
  code: NonNullable<ActionResult["error"]>["code"],
  message: string,
): ActionResult {
  return {
    ok: false,
    state,
    error: {
      code,
      message,
    },
  };
}
