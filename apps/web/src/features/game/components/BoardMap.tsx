import { useEffect, useRef, useState } from "react";
import type { GameStatePublic } from "@risk/shared-types";
import { formatTerritoryLabel } from "../utils/labels";
import { TerritoryLayer } from "./TerritoryLayer";
import { agentDebugLog } from "../utils/agentDebugLog";

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
      .then((text) => {
        setSvgMarkup(text);
        // #region agent log
        agentDebugLog({
          hypothesisId: "A",
          location: "BoardMap.tsx:fetchSvg.then",
          message: "Loaded board SVG markup",
          data: {
            markupLength: text.length,
          },
        });
        // #endregion
      })
      .catch(() => {
        setSvgMarkup("");
        // #region agent log
        agentDebugLog({
          hypothesisId: "A",
          location: "BoardMap.tsx:fetchSvg.catch",
          message: "Failed to load board SVG markup",
          data: {},
        });
        // #endregion
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const root = containerRef.current;
    const svgElement = root.querySelector<SVGSVGElement>("svg");
    if (!svgElement) {
      return;
    }

    const updateCenters = () => {
      const svgRect = svgElement.getBoundingClientRect();
      const nextCenters: Record<string, { x: number; y: number }> = {};
      for (const territoryId of Object.keys(state.territories)) {
        const path = getTerritoryNode(svgElement, territoryId);
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
    const svgElement = root.querySelector<SVGSVGElement>("svg");
    if (!svgElement) {
      return;
    }

    const territoryIds = Object.keys(state.territories);
    const territoryIdSet = new Set(territoryIds);
    const handlers: Array<{
      node: SVGGraphicsElement;
      clickListener: EventListener;
      keydownListener: EventListener;
    }> = [];
    const missingTerritoryNodes: string[] = [];

    for (const territoryId of territoryIds) {
      const path = getTerritoryNode(svgElement, territoryId);
      if (!path) {
        missingTerritoryNodes.push(territoryId);
        continue;
      }

      const clickListener = (event: Event) => {
        const target = event.target instanceof Element ? event.target.id : null;
        // #region agent log
        agentDebugLog({
          hypothesisId: "C",
          location: "BoardMap.tsx:clickListener",
          message: "Territory click listener fired",
          data: {
            territoryId,
            targetId: target,
            currentTargetId: path.id,
            pointerEvents: path.style.pointerEvents || null,
            fill: path.style.fill || null,
          },
        });
        // #endregion
        onSelectTerritory(territoryId);
      };
      const keydownListener = (event: Event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          onSelectTerritory(territoryId);
        }
      };

      path.classList.add("territory-region");
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("data-agent-click-bound", "true");
      path.setAttribute(
        "aria-label",
        `Select territory ${formatTerritoryLabel(territoryId)}`,
      );
      path.style.pointerEvents = "all";
      path.addEventListener("click", clickListener);
      path.addEventListener("keydown", keydownListener);
      path.style.cursor = "pointer";
      handlers.push({ node: path, clickListener, keydownListener });
    }

    const svgClickListener = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const targetId = target?.id ?? null;
      if (targetId && territoryIdSet.has(targetId)) {
        return;
      }
      // #region agent log
      agentDebugLog({
        hypothesisId: "B",
        location: "BoardMap.tsx:svgClickListener",
        message: "SVG click landed outside a known territory id",
        data: {
          targetId,
          targetTag: target?.tagName?.toLowerCase() ?? null,
        },
      });
      // #endregion
    };

    svgElement.addEventListener("click", svgClickListener);
    const alaskaNode = getTerritoryNode(svgElement, "alaska");
    // #region agent log
    agentDebugLog({
      hypothesisId: "A",
      location: "BoardMap.tsx:attachHandlers",
      message: "Attached territory interaction handlers",
      data: {
        expectedTerritories: territoryIds.length,
        attachedHandlers: handlers.length,
        missingTerritoryNodes,
        alaskaPointerEvents: alaskaNode?.style.pointerEvents ?? null,
      },
    });
    // #endregion

    return () => {
      svgElement.removeEventListener("click", svgClickListener);
      for (const handler of handlers) {
        handler.node.removeEventListener("click", handler.clickListener);
        handler.node.removeEventListener("keydown", handler.keydownListener);
      }
    };
  }, [svgMarkup, state.territories, onSelectTerritory]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const root = containerRef.current;
    const svgElement = root.querySelector<SVGSVGElement>("svg");
    if (!svgElement) {
      return;
    }

    const playerById = new Map(
      state.players.map((player) => [player.id, player]),
    );
    let styledTerritories = 0;
    const missingTerritoryNodes: string[] = [];

    for (const [territoryId, territory] of Object.entries(state.territories)) {
      const path = getTerritoryNode(svgElement, territoryId);
      if (!path) {
        missingTerritoryNodes.push(territoryId);
        continue;
      }

      const color = territory.ownerId
        ? playerById.get(territory.ownerId)?.color ?? "#666"
        : "#5d5d5d";
      const stroke =
        selectedTerritoryId === territoryId ? "#f6dd9d" : "rgba(13, 22, 29, 0.88)";
      const strokeWidth = selectedTerritoryId === territoryId ? "3.2px" : "1.5px";
      const fillOpacity = selectedTerritoryId === territoryId
        ? 0.88
        : territory.ownerId
          ? 0.66
          : 0.28;

      path.style.fill = color;
      path.style.fillOpacity = String(fillOpacity);
      path.style.stroke = stroke;
      path.style.strokeWidth = strokeWidth;
      path.style.transition =
        "fill 0.2s ease, stroke 0.2s ease, fill-opacity 0.2s ease, filter 0.2s ease";
      path.style.filter =
        selectedTerritoryId === territoryId
          ? "drop-shadow(0 0 7px rgba(246, 221, 157, 0.36))"
          : "none";
      styledTerritories += 1;
    }
    const alaskaNode = getTerritoryNode(svgElement, "alaska");
    // #region agent log
    agentDebugLog({
      hypothesisId: "E",
      location: "BoardMap.tsx:styleTerritories",
      message: "Applied territory visual styles",
      data: {
        styledTerritories,
        missingTerritoryNodes,
        selectedTerritoryId,
        alaskaFill: alaskaNode?.style.fill ?? null,
      },
    });
    // #endregion
  }, [selectedTerritoryId, state.players, state.territories]);

  const selectedTerritory = selectedTerritoryId
    ? state.territories[selectedTerritoryId]
    : null;
  const selectedOwner = selectedTerritory?.ownerId
    ? state.players.find((player) => player.id === selectedTerritory.ownerId)
    : null;
  const territoryCount = Object.keys(state.territories).length;
  const claimedTerritoryCount = Object.values(state.territories).filter(
    (territory) => territory.ownerId,
  ).length;
  const troopsOnBoard = Object.values(state.territories).reduce(
    (sum, territory) => sum + territory.troops,
    0,
  );
  const latestBattleEvent = state.battleLog.length
    ? state.battleLog[state.battleLog.length - 1]
    : null;

  return (
    <section className="board-shell">
      <div className="board-container" ref={containerRef}>
        {svgMarkup ? (
          <>
            <div
              className="risk-board-svg"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
            <TerritoryLayer
              state={state}
              centers={centers}
              selectedTerritoryId={selectedTerritoryId}
            />
          </>
        ) : (
          <div className="board-loading">Loading board...</div>
        )}

        <section className="map-hud map-hud-top-left panel stack gap-xs">
          <p className="hud-kicker">Strategic Theater</p>
          <h2>World Command Map</h2>
          <p>Drive every decision directly from the battlefield.</p>
        </section>

        <section className="map-hud map-hud-top-right panel">
          <div className="hud-stat-grid">
            <article className="hud-stat-card">
              <strong>{state.players.length}</strong>
              <span>Commanders</span>
            </article>
            <article className="hud-stat-card">
              <strong>{claimedTerritoryCount}/{territoryCount}</strong>
              <span>Claimed</span>
            </article>
            <article className="hud-stat-card">
              <strong>{troopsOnBoard}</strong>
              <span>Total Troops</span>
            </article>
            <article className="hud-stat-card">
              <strong>Round {state.round}</strong>
              <span>Current Cycle</span>
            </article>
          </div>
        </section>

        <section className="map-hud map-hud-bottom-left panel stack gap-xs">
          <h3>
            {selectedTerritoryId
              ? formatTerritoryLabel(selectedTerritoryId)
              : "Select a Territory"}
          </h3>
          {selectedTerritory ? (
            <p>
              {selectedOwner
                ? `${selectedOwner.name} controls this position with ${selectedTerritory.troops} troops.`
                : `This position is unclaimed with ${selectedTerritory.troops} troops.`}
            </p>
          ) : (
            <p>Click the map to inspect troop counts and launch commands.</p>
          )}
          {latestBattleEvent ? (
            <p className="latest-event">Latest Event: {latestBattleEvent.message}</p>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function getTerritoryNode(svgElement: SVGSVGElement, territoryId: string) {
  const candidateIds = [territoryId, ...(TERRITORY_ID_ALIASES[territoryId] ?? [])];
  for (const candidateId of candidateIds) {
    const node = svgElement.querySelector<SVGGraphicsElement>(
      `#${CSS.escape(candidateId)}`,
    );
    if (node) {
      return node;
    }
  }
  return null;
}

const TERRITORY_ID_ALIASES: Record<string, string[]> = {
  yakutsk: ["yakursk"],
};
