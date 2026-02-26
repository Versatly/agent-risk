import type { LegalActionHint } from "@risk/shared-types";
import { ADJACENCY, TERRITORY_IDS } from "./constants.js";
import { canFortifyBetween } from "./fortify.js";
import type { LegalActionContext } from "./types.js";

export function getLegalActionHints({
  state,
  playerId,
}: LegalActionContext): LegalActionHint[] {
  if (state.winnerId) {
    return [];
  }

  if (state.currentPlayerId !== playerId) {
    return [];
  }

  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.isEliminated) {
    return [];
  }

  switch (state.currentPhase) {
    case "setup_claim":
      return [
        {
          type: "claim_territory",
          description: "Claim any unowned territory with one troop.",
          payloadShape: { territoryId: "string" },
        },
      ];
    case "setup_reinforce":
    case "reinforce":
      return [
        {
          type: "place_troops",
          description: "Place troops on one of your territories.",
          payloadShape: { territoryId: "string", troops: "number" },
        },
        ...(player.cards.length >= 3
          ? [
              {
                type: "trade_cards" as const,
                description: "Trade exactly three valid cards for reinforcement bonus.",
                payloadShape: { cardIds: "string[3]" },
              },
            ]
          : []),
      ];
    case "attack": {
      const attackable = TERRITORY_IDS.some((territoryId) => {
        const source = state.territories[territoryId];
        if (source.ownerId !== playerId || source.troops < 2) {
          return false;
        }

        return ADJACENCY[territoryId].some(
          (neighbor) => state.territories[neighbor].ownerId !== playerId,
        );
      });

      return [
        ...(attackable
          ? [
              {
                type: "attack" as const,
                description: "Attack an adjacent enemy territory using 1-3 dice.",
                payloadShape: {
                  fromTerritoryId: "string",
                  toTerritoryId: "string",
                  attackDice: "number",
                },
              },
            ]
          : []),
        {
          type: "end_attack",
          description: "End attack phase and proceed to fortify.",
          payloadShape: {},
        },
      ];
    }
    case "occupy":
      return [
        {
          type: "occupy",
          description:
            "Move troops from attacking territory into conquered territory within min/max bounds.",
          payloadShape: { troops: "number" },
        },
      ];
    case "fortify": {
      const canFortify = TERRITORY_IDS.some((fromTerritoryId) => {
        const source = state.territories[fromTerritoryId];
        if (source.ownerId !== playerId || source.troops < 2) {
          return false;
        }

        return TERRITORY_IDS.some((toTerritoryId) => {
          if (toTerritoryId === fromTerritoryId) {
            return false;
          }

          return canFortifyBetween(state, playerId, fromTerritoryId, toTerritoryId);
        });
      });

      return [
        ...(canFortify
          ? [
              {
                type: "fortify" as const,
                description: "Move troops between two connected owned territories.",
                payloadShape: {
                  fromTerritoryId: "string",
                  toTerritoryId: "string",
                  troops: "number",
                },
              },
            ]
          : []),
        {
          type: "end_turn",
          description: "Finish fortify and pass turn to next player.",
          payloadShape: {},
        },
      ];
    }
    case "game_over":
    default:
      return [];
  }
}
