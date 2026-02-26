import type { GameStatePublic } from "@risk/shared-types";

interface BattleLogPanelProps {
  state: GameStatePublic;
}

export function BattleLogPanel({ state }: BattleLogPanelProps) {
  return (
    <section className="panel stack gap-sm battle-log-panel">
      <h2>Battle Log</h2>
      <div className="battle-log-list">
        {state.battleLog.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          [...state.battleLog]
            .reverse()
            .slice(0, 20)
            .map((entry) => (
              <article key={entry.id} className="log-entry">
                <header className="row between">
                  <strong>{entry.message}</strong>
                  <small>
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </header>
                {entry.outcome ? (
                  <p>
                    {entry.outcome.fromTerritoryId} → {entry.outcome.toTerritoryId}:{" "}
                    {entry.outcome.attackerLosses} attacker losses,{" "}
                    {entry.outcome.defenderLosses} defender losses
                    {entry.outcome.conquered ? ", territory conquered!" : ""}
                  </p>
                ) : null}
              </article>
            ))
        )}
      </div>
    </section>
  );
}
