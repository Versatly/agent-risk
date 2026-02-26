import { useState } from "react";
import type { GameStatePrivate } from "@risk/shared-types";

interface CardsPanelProps {
  state: GameStatePrivate;
  onSubmitAction: (action: Record<string, unknown>) => Promise<void>;
}

export function CardsPanel({ state, onSubmitAction }: CardsPanelProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  function toggleCard(cardId: string) {
    setSelectedCardIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }

      if (current.length >= 3) {
        return [...current.slice(1), cardId];
      }

      return [...current, cardId];
    });
  }

  return (
    <section className="panel stack gap-sm">
      <div className="row between">
        <h2>Cards ({state.me.cards.length})</h2>
        <button
          disabled={selectedCardIds.length !== 3}
          onClick={() =>
            selectedCardIds.length === 3
              ? onSubmitAction({
                  type: "trade_cards",
                  cardIds: selectedCardIds,
                }).then(() => setSelectedCardIds([]))
              : Promise.resolve()
          }
        >
          Trade Selected
        </button>
      </div>

      <div className="cards-grid">
        {state.me.cards.length === 0 ? (
          <p>No cards yet. Conquer at least one territory this turn to draw.</p>
        ) : (
          state.me.cards.map((card) => (
            <button
              key={card.id}
              className={`card-chip ${
                selectedCardIds.includes(card.id) ? "selected" : ""
              }`}
              onClick={() => toggleCard(card.id)}
            >
              <strong>{card.kind.toUpperCase()}</strong>
              <small>{card.territoryId ?? "Wild"}</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
