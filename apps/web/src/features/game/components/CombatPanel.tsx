import { useMemo, useState } from "react";
import type { GameStatePrivate } from "@risk/shared-types";
import { ADJACENCY } from "@risk/game-engine";

interface CombatPanelProps {
  state: GameStatePrivate;
  selectedTerritoryId: string | null;
  onSubmitAction: (action: Record<string, unknown>) => Promise<void>;
  onEndTurn: () => Promise<void>;
}

export function CombatPanel({
  state,
  selectedTerritoryId,
  onSubmitAction,
  onEndTurn,
}: CombatPanelProps) {
  const [secondaryTerritoryId, setSecondaryTerritoryId] = useState<string>("");
  const [troops, setTroops] = useState<number>(1);
  const [attackDice, setAttackDice] = useState<number>(1);

  const phase = state.currentPhase;
  const myPlayerId = state.me.id;
  const sourceTerritory = selectedTerritoryId
    ? state.territories[selectedTerritoryId]
    : null;
  const pendingOccupation = state.pendingOccupation;

  const candidateTargets = useMemo(() => {
    if (!selectedTerritoryId) {
      return [];
    }

    const territory = state.territories[selectedTerritoryId];
    if (!territory) {
      return [];
    }

    return Object.entries(state.territories)
      .filter(([territoryId, candidate]) => {
        if (territoryId === selectedTerritoryId) {
          return false;
        }

        if (phase === "attack") {
          const neighbors = (
            ADJACENCY[selectedTerritoryId as keyof typeof ADJACENCY] ?? []
          ) as string[];
          return candidate.ownerId !== myPlayerId && neighbors.includes(territoryId);
        }

        if (phase === "fortify") {
          return candidate.ownerId === myPlayerId;
        }

        return true;
      })
      .map(([territoryId]) => territoryId);
  }, [myPlayerId, phase, selectedTerritoryId, state.territories]);

  return (
    <section className="panel stack gap-md">
      <h2>Command Console</h2>
      <p>
        Selected territory: <strong>{selectedTerritoryId ?? "None"}</strong>
      </p>

      {(phase === "setup_claim" || (phase === "attack" && selectedTerritoryId)) && (
        <div className="stack gap-sm">
          {phase === "setup_claim" ? (
            <button
              disabled={!selectedTerritoryId}
              className="primary"
              onClick={() =>
                selectedTerritoryId
                  ? onSubmitAction({
                      type: "claim_territory",
                      territoryId: selectedTerritoryId,
                    })
                  : Promise.resolve()
              }
            >
              Claim Selected Territory
            </button>
          ) : null}
        </div>
      )}

      {(phase === "setup_reinforce" || phase === "reinforce") && (
        <div className="stack gap-sm">
          <label className="stack gap-xs">
            <span>Reinforcement troops</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, state.me.reinforcementPool)}
              value={troops}
              onChange={(event) => setTroops(Number(event.target.value))}
            />
          </label>
          <button
            className="primary"
            disabled={
              !selectedTerritoryId ||
              sourceTerritory?.ownerId !== myPlayerId ||
              state.me.reinforcementPool <= 0
            }
            onClick={() =>
              selectedTerritoryId
                ? onSubmitAction({
                    type: "place_troops",
                    territoryId: selectedTerritoryId,
                    troops: Math.min(
                      Math.max(1, troops),
                      state.me.reinforcementPool,
                    ),
                  })
                : Promise.resolve()
            }
          >
            Deploy Reinforcements
          </button>
        </div>
      )}

      {phase === "attack" && (
        <div className="stack gap-sm">
          <label className="stack gap-xs">
            <span>Target territory</span>
            <select
              value={secondaryTerritoryId}
              onChange={(event) => setSecondaryTerritoryId(event.target.value)}
            >
              <option value="">Select target</option>
              {candidateTargets.map((territoryId) => (
                <option key={territoryId} value={territoryId}>
                  {territoryId}
                </option>
              ))}
            </select>
          </label>
          <label className="stack gap-xs">
            <span>Attack dice</span>
            <input
              type="range"
              min={1}
              max={Math.max(1, Math.min(3, (sourceTerritory?.troops ?? 1) - 1))}
              value={attackDice}
              onChange={(event) => setAttackDice(Number(event.target.value))}
            />
            <small>{attackDice}</small>
          </label>
          <button
            className="primary"
            disabled={
              !selectedTerritoryId ||
              !secondaryTerritoryId ||
              sourceTerritory?.ownerId !== myPlayerId ||
              (sourceTerritory?.troops ?? 1) <= 1
            }
            onClick={() =>
              onSubmitAction({
                type: "attack",
                fromTerritoryId: selectedTerritoryId,
                toTerritoryId: secondaryTerritoryId,
                attackDice,
              })
            }
          >
            Launch Attack
          </button>
          <button onClick={() => onSubmitAction({ type: "end_attack" })}>
            End Attack Phase
          </button>
        </div>
      )}

      {phase === "occupy" && pendingOccupation ? (
        <div className="stack gap-sm">
          <p>
            Occupy {pendingOccupation.toTerritoryId} from{" "}
            {pendingOccupation.fromTerritoryId}
          </p>
          <input
            type="number"
            min={pendingOccupation.minTroops}
            max={pendingOccupation.maxTroops}
            value={troops}
            onChange={(event) => setTroops(Number(event.target.value))}
          />
          <button
            className="primary"
            onClick={() =>
              onSubmitAction({
                type: "occupy",
                troops: Math.max(
                  pendingOccupation.minTroops,
                  Math.min(pendingOccupation.maxTroops, troops),
                ),
              })
            }
          >
            Move Troops
          </button>
        </div>
      ) : null}

      {phase === "fortify" && (
        <div className="stack gap-sm">
          <label className="stack gap-xs">
            <span>Fortify destination</span>
            <select
              value={secondaryTerritoryId}
              onChange={(event) => setSecondaryTerritoryId(event.target.value)}
            >
              <option value="">Select destination</option>
              {candidateTargets.map((territoryId) => (
                <option key={territoryId} value={territoryId}>
                  {territoryId}
                </option>
              ))}
            </select>
          </label>
          <label className="stack gap-xs">
            <span>Troops to move</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, (sourceTerritory?.troops ?? 1) - 1)}
              value={troops}
              onChange={(event) => setTroops(Number(event.target.value))}
            />
          </label>
          <button
            className="primary"
            disabled={
              !selectedTerritoryId ||
              !secondaryTerritoryId ||
              sourceTerritory?.ownerId !== myPlayerId ||
              (sourceTerritory?.troops ?? 1) <= 1
            }
            onClick={() =>
              onSubmitAction({
                type: "fortify",
                fromTerritoryId: selectedTerritoryId,
                toTerritoryId: secondaryTerritoryId,
                troops,
              })
            }
          >
            Fortify and End Turn
          </button>
          <button onClick={onEndTurn}>Skip Fortify / End Turn</button>
        </div>
      )}

      {state.currentPhase === "game_over" && (
        <p className="winner-banner">
          Winner:{" "}
          {
            state.players.find((player) => player.id === state.winnerId)?.name
          }
        </p>
      )}
    </section>
  );
}
