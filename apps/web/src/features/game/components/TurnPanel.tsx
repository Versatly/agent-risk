import type { GameStatePrivate, GameStatePublic } from "@risk/shared-types";

interface TurnPanelProps {
  publicState: GameStatePublic;
  privateState: GameStatePrivate;
}

export function TurnPanel({ publicState, privateState }: TurnPanelProps) {
  return (
    <section className="panel turn-panel stack gap-sm">
      <h2>Turn Status</h2>
      <p>
        <strong>Round:</strong> {publicState.round}
      </p>
      <p>
        <strong>Phase:</strong> {formatPhase(publicState.currentPhase)}
      </p>
      <p>
        <strong>Current Player:</strong>{" "}
        {publicState.players.find((player) => player.id === publicState.currentPlayerId)?.name}
      </p>
      <p>
        <strong>Your Reinforcements:</strong> {privateState.me.reinforcementPool}
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

function formatPhase(phase: string) {
  return phase
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
