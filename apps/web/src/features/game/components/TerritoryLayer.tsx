import type { GameStatePublic } from "@risk/shared-types";

interface TerritoryLayerProps {
  state: GameStatePublic;
  centers: Record<string, { x: number; y: number }>;
}

export function TerritoryLayer({ state, centers }: TerritoryLayerProps) {
  return (
    <div className="territory-layer">
      {Object.entries(state.territories).map(([territoryId, territory]) => {
        const center = centers[territoryId];
        if (!center) {
          return null;
        }

        return (
          <div
            key={territoryId}
            className="troop-badge"
            style={{
              left: `${center.x}%`,
              top: `${center.y}%`,
            }}
            title={`${territoryId} — ${territory.troops} troops`}
          >
            {territory.troops}
          </div>
        );
      })}
    </div>
  );
}
