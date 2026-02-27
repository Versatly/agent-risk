import type { GameStatePrivate, GameStatePublic } from "@risk/shared-types";
import { formatPhaseLabel } from "../utils/labels";

interface TurnPanelProps {
  publicState: GameStatePublic;
  privateState: GameStatePrivate;
}

export function TurnPanel({ publicState, privateState }: TurnPanelProps) {
  const currentPlayer = publicState.players.find(
    (player) => player.id === publicState.currentPlayerId,
  );

  return (
    <section className="panel turn-panel stack gap-sm">
      <div className="row between">
        <h2>Turn Status</h2>
        <span className="phase-pill">{formatPhaseLabel(publicState.currentPhase)}</span>
      </div>
      <div className="turn-highlights">
        <article className="turn-highlight-card">
          <span>Round</span>
          <strong>{publicState.round}</strong>
        </article>
        <article className="turn-highlight-card">
          <span>Reinforcements</span>
          <strong>{privateState.me.reinforcementPool}</strong>
        </article>
      </div>
      <p>
        <strong>Current Player:</strong> {currentPlayer?.name ?? "Unknown"}
      </p>
      <div className="player-list stack gap-xs">
        {publicState.players.map((player) => (
          <div key={player.id} className="player-chip">
            <span
              className="player-color"
              style={{ backgroundColor: player.color }}
            />
            <span>{player.name}</span>
            <small>
              {player.territories} territories · {player.cardsCount} cards
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}
