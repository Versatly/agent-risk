import type { CardKind, RiskCard } from "@risk/shared-types";
import { CARD_BONUS_SEQUENCE, TERRITORY_IDS } from "./constants.js";
import type { DeckState, EngineState } from "./types.js";

const CARD_KINDS: CardKind[] = ["infantry", "cavalry", "artillery"];

export function createStandardDeck(random: () => number = Math.random): DeckState {
  const cards: RiskCard[] = TERRITORY_IDS.map((territoryId, index) => ({
    id: `card_${territoryId}`,
    territoryId,
    kind: CARD_KINDS[index % CARD_KINDS.length],
  }));

  cards.push({ id: "card_wild_1", territoryId: null, kind: "wild" });
  cards.push({ id: "card_wild_2", territoryId: null, kind: "wild" });

  return {
    drawPile: shuffle(cards, random),
    discardPile: [],
    tradeCount: 0,
  };
}

export function getTradeBonus(tradeCount: number): number {
  if (tradeCount < CARD_BONUS_SEQUENCE.length) {
    return CARD_BONUS_SEQUENCE[tradeCount];
  }

  const extraTrades = tradeCount - CARD_BONUS_SEQUENCE.length + 1;
  return CARD_BONUS_SEQUENCE[CARD_BONUS_SEQUENCE.length - 1] + extraTrades * 5;
}

export function drawCardForPlayer(
  state: EngineState,
  playerId: string,
  random: () => number = Math.random,
): EngineState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || state.winnerId) {
    return state;
  }

  const drawPile =
    state.deck.drawPile.length > 0
      ? [...state.deck.drawPile]
      : shuffle([...state.deck.discardPile], random);
  const discardPile =
    state.deck.drawPile.length > 0 ? [...state.deck.discardPile] : [];

  const card = drawPile.shift();
  if (!card) {
    return state;
  }

  const nextPlayers = state.players.map((candidate) =>
    candidate.id === playerId
      ? {
          ...candidate,
          cards: [...candidate.cards, card],
        }
      : candidate,
  );

  return {
    ...state,
    players: nextPlayers,
    deck: {
      ...state.deck,
      drawPile,
      discardPile,
    },
  };
}

export function validateCardSet(cards: RiskCard[]): boolean {
  if (cards.length !== 3) {
    return false;
  }

  const wildCount = cards.filter((card) => card.kind === "wild").length;
  const nonWildKinds = cards
    .filter((card) => card.kind !== "wild")
    .map((card) => card.kind);

  if (wildCount > 0) {
    if (nonWildKinds.length <= 1) {
      return true;
    }

    const unique = new Set(nonWildKinds);
    return unique.size === 1 || unique.size === nonWildKinds.length;
  }

  const uniqueKinds = new Set(nonWildKinds);
  return uniqueKinds.size === 1 || uniqueKinds.size === 3;
}

export function tradeCards(
  state: EngineState,
  playerId: string,
  cardIds: string[],
): { state: EngineState; bonus: number | null } {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || cardIds.length !== 3) {
    return { state, bonus: null };
  }

  const selected = cardIds
    .map((cardId) => player.cards.find((card) => card.id === cardId))
    .filter((card): card is RiskCard => Boolean(card));

  if (selected.length !== 3 || !validateCardSet(selected)) {
    return { state, bonus: null };
  }

  const tradeBonus = getTradeBonus(state.deck.tradeCount);
  const selectedIds = new Set(selected.map((card) => card.id));

  const nextPlayers = state.players.map((candidate) => {
    if (candidate.id !== playerId) {
      return candidate;
    }

    return {
      ...candidate,
      cards: candidate.cards.filter((card) => !selectedIds.has(card.id)),
      reinforcementPool: candidate.reinforcementPool + tradeBonus,
    };
  });

  return {
    bonus: tradeBonus,
    state: {
      ...state,
      players: nextPlayers,
      deck: {
        drawPile: [...state.deck.drawPile],
        discardPile: [...state.deck.discardPile, ...selected],
        tradeCount: state.deck.tradeCount + 1,
      },
    },
  };
}

export function transferCardsOnElimination(
  state: EngineState,
  defeatedPlayerId: string,
  winnerPlayerId: string,
): EngineState {
  const defeated = state.players.find((player) => player.id === defeatedPlayerId);
  const winner = state.players.find((player) => player.id === winnerPlayerId);
  if (!defeated || !winner || defeated.cards.length === 0) {
    return state;
  }

  const nextPlayers = state.players.map((player) => {
    if (player.id === defeatedPlayerId) {
      return {
        ...player,
        cards: [],
      };
    }

    if (player.id === winnerPlayerId) {
      return {
        ...player,
        cards: [...player.cards, ...defeated.cards],
      };
    }

    return player;
  });

  return {
    ...state,
    players: nextPlayers,
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}
