import type { CSSProperties } from "react";
import type { GameStatePublic } from "@risk/shared-types";
import { formatTerritoryLabel } from "../utils/labels";

interface TerritoryLayerProps {
  state: GameStatePublic;
  centers: Record<string, { x: number; y: number }>;
  selectedTerritoryId: string | null;
}

export function TerritoryLayer({
  state,
  centers,
  selectedTerritoryId,
}: TerritoryLayerProps) {
  const playerColorById = new Map(
    state.players.map((player) => [player.id, player.color]),
  );

  return (
    <div className="territory-layer">
      {Object.entries(state.territories).map(([territoryId, territory]) => {
        const center = centers[territoryId];
        if (!center) {
          return null;
        }

        const ownerColor = territory.ownerId
          ? playerColorById.get(territory.ownerId) ?? "#7f8f9f"
          : "#5d6975";
        const style = {
          left: `${center.x}%`,
          top: `${center.y}%`,
          "--badge-accent": ownerColor,
        } as CSSProperties;

        return (
          <div
            key={territoryId}
            className={`troop-badge ${
              selectedTerritoryId === territoryId ? "selected" : ""
            }`}
            style={style}
            title={`${formatTerritoryLabel(territoryId)} — ${territory.troops} troops`}
          >
            {territory.troops}
          </div>
        );
      })}
    </div>
  );
}
