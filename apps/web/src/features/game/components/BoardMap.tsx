import { useEffect, useMemo, useRef, useState } from "react";
import type { GameStatePublic } from "@risk/shared-types";
import { TerritoryLayer } from "./TerritoryLayer";

interface BoardMapProps {
  state: GameStatePublic;
  selectedTerritoryId: string | null;
  onSelectTerritory: (territoryId: string) => void;
}

export function BoardMap({
  state,
  selectedTerritoryId,
  onSelectTerritory,
}: BoardMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [centers, setCenters] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    fetch("/assets/board/risk-board.svg")
      .then((response) => response.text())
      .then((text) => setSvgMarkup(text))
      .catch(() => setSvgMarkup(""));
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const root = containerRef.current;
    const svgElement = root.querySelector("svg");
    if (!svgElement) {
      return;
    }

    const updateCenters = () => {
      const svgRect = svgElement.getBoundingClientRect();
      const nextCenters: Record<string, { x: number; y: number }> = {};
      for (const territoryId of Object.keys(state.territories)) {
        const path = svgElement.querySelector<SVGPathElement>(
          `#${CSS.escape(territoryId)}`,
        );
        if (!path) {
          continue;
        }

        const rect = path.getBoundingClientRect();
        nextCenters[territoryId] = {
          x: ((rect.left + rect.width / 2 - svgRect.left) / svgRect.width) * 100,
          y: ((rect.top + rect.height / 2 - svgRect.top) / svgRect.height) * 100,
        };
      }
      setCenters(nextCenters);
    };

    updateCenters();
    const resizeObserver = new ResizeObserver(updateCenters);
    resizeObserver.observe(svgElement);
    window.addEventListener("resize", updateCenters);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateCenters);
    };
  }, [svgMarkup, state.territories]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const root = containerRef.current;
    const svgElement = root.querySelector("svg");
    if (!svgElement) {
      return;
    }

    const handlers: Array<{
      node: SVGPathElement;
      listener: EventListener;
    }> = [];

    for (const territoryId of Object.keys(state.territories)) {
      const path = svgElement.querySelector<SVGPathElement>(
        `#${CSS.escape(territoryId)}`,
      );
      if (!path) {
        continue;
      }

      const listener = () => onSelectTerritory(territoryId);
      path.addEventListener("click", listener);
      path.style.cursor = "pointer";
      handlers.push({ node: path, listener });
    }

    return () => {
      for (const handler of handlers) {
        handler.node.removeEventListener("click", handler.listener);
      }
    };
  }, [svgMarkup, state.territories, onSelectTerritory]);

  const territoryStyles = useMemo(() => {
    const playerById = new Map(
      state.players.map((player) => [player.id, player]),
    );

    const styles = Object.entries(state.territories).map(
      ([territoryId, territory]) => {
        const color = territory.ownerId
          ? playerById.get(territory.ownerId)?.color ?? "#666"
          : "#5d5d5d";
        const stroke =
          selectedTerritoryId === territoryId ? "#fff8d6" : "#1f1f1f";
        const strokeWidth = selectedTerritoryId === territoryId ? "3px" : "1.4px";

        return `
          #${CSS.escape(territoryId)} {
            fill: ${color} !important;
            fill-opacity: ${territory.ownerId ? 0.7 : 0.28} !important;
            stroke: ${stroke} !important;
            stroke-width: ${strokeWidth} !important;
            transition: fill 0.2s ease, stroke 0.2s ease;
          }
        `;
      },
    );

    return styles.join("\n");
  }, [selectedTerritoryId, state.players, state.territories]);

  return (
    <section className="board-shell panel">
      <div className="board-title-row">
        <h2>World Map</h2>
      </div>
      <div className="board-container" ref={containerRef}>
        {svgMarkup ? (
          <>
            <style>{territoryStyles}</style>
            <div
              className="risk-board-svg"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
            <TerritoryLayer state={state} centers={centers} />
          </>
        ) : (
          <div className="board-loading">Loading board...</div>
        )}
      </div>
    </section>
  );
}
