import { useEffect, useMemo, useState } from "react";
import type { RiskAction } from "@risk/shared-types";
import type { SessionCredentials } from "../../store/lobby-store";
import { useGameStore } from "../../store/game-store";
import { BoardMap } from "./components/BoardMap";
import { TurnPanel } from "./components/TurnPanel";
import { CombatPanel } from "./components/CombatPanel";
import { CardsPanel } from "./components/CardsPanel";
import { BattleLogPanel } from "./components/BattleLogPanel";
import { OnboardingTour, shouldShowOnboarding } from "./components/OnboardingTour";
import { formatPhaseLabel, formatTerritoryLabel } from "./utils/labels";

interface GamePageProps {
  credentials: SessionCredentials;
  onLeaveSession: () => void;
}

export function GamePage({ credentials, onLeaveSession }: GamePageProps) {
  const {
    publicState,
    privateState,
    legalActions,
    loading,
    error,
    connect,
    disconnect,
    loadState,
    refreshLegalActions,
    submitAction,
    endTurn,
    addBot,
    startGame,
    clearError,
  } = useGameStore();

  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [botName, setBotName] = useState("CPU");
  const [showTour, setShowTour] = useState(shouldShowOnboarding());

  useEffect(() => {
    connect(credentials);
    void loadState(credentials);
    return () => {
      disconnect();
    };
  }, [connect, credentials, disconnect, loadState]);

  useEffect(() => {
    if (!privateState) {
      return;
    }
    void refreshLegalActions(credentials);
  }, [credentials, privateState, refreshLegalActions]);

  const isMyTurn = useMemo(
    () => privateState?.currentPlayerId === credentials.playerId,
    [credentials.playerId, privateState],
  );

  const myPublicPlayer = useMemo(
    () => publicState?.players.find((player) => player.id === credentials.playerId),
    [credentials.playerId, publicState],
  );

  async function handleSubmitAction(action: Record<string, unknown>) {
    await submitAction(credentials, action as RiskAction);
  }

  if (!publicState || !privateState) {
    return (
      <main className="game-loading-page">
        <section className="panel stack gap-md">
          <h1>Lobby {credentials.lobbyCode}</h1>
          <p>
            The game has not started yet. Add bots or start manually when all
            players are in.
          </p>
          <div className="row gap-sm">
            <input
              value={botName}
              onChange={(event) => setBotName(event.target.value)}
              placeholder="Bot name"
            />
            <button onClick={() => void addBot(credentials, botName)}>
              Add Bot
            </button>
            <button className="primary" onClick={() => void startGame(credentials)}>
              Start Game
            </button>
            <button onClick={() => void loadState(credentials)}>Refresh</button>
          </div>
          <button
            onClick={() => {
              onLeaveSession();
            }}
          >
            Leave Session
          </button>
          {error ? <p className="error-banner">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="war-room-layout">
      <section className="war-room-overlay-stage">
        <BoardMap
          state={publicState}
          selectedTerritoryId={selectedTerritoryId}
          onSelectTerritory={setSelectedTerritoryId}
        />

        <header className="panel row between war-room-topbar overlay-topbar">
          <div className="stack gap-xs">
            <p className="war-room-kicker">Lobby {credentials.lobbyCode}</p>
            <h1>Global Command</h1>
            <p>
              {isMyTurn
                ? "Your offensive window is open."
                : "Monitoring allied commanders."}{" "}
              · Phase: {formatPhaseLabel(privateState.currentPhase)}
            </p>
          </div>
          <div className="row gap-sm">
            <button
              onClick={() => {
                setShowTour(true);
              }}
            >
              Onboarding
            </button>
            <button
              onClick={() => {
                onLeaveSession();
              }}
            >
              Exit to Lobby
            </button>
          </div>
        </header>

        <section className="panel stack gap-xs overlay-commander-panel">
          <h2>Commander Snapshot</h2>
          <p>
            You control <strong>{myPublicPlayer?.territories ?? 0}</strong> territories
            and hold <strong>{privateState.me.cards.length}</strong> cards.
          </p>
          <p>
            Territory focus:{" "}
            <strong>
              {selectedTerritoryId
                ? formatTerritoryLabel(selectedTerritoryId)
                : "No territory selected"}
            </strong>
          </p>
          <p>
            Reinforcements in reserve: <strong>{privateState.me.reinforcementPool}</strong>
          </p>
        </section>

        <aside className="stack gap-md overlay-command-stack">
          <TurnPanel publicState={publicState} privateState={privateState} />
          <CombatPanel
            state={privateState}
            selectedTerritoryId={selectedTerritoryId}
            onSubmitAction={handleSubmitAction}
            onEndTurn={() => endTurn(credentials)}
          />
          <CardsPanel state={privateState} onSubmitAction={handleSubmitAction} />
        </aside>

        <div className="overlay-battle-log">
          <BattleLogPanel state={publicState} />
        </div>

        <section className="panel stack gap-sm legal-intel-panel overlay-legal-intel">
          <h2>Legal Action Hints</h2>
          {legalActions.length === 0 ? (
            <p>No legal actions available for the current phase.</p>
          ) : (
            <ul className="legal-list">
              {legalActions.map((hint) => (
                <li key={hint.type}>
                  <strong>{hint.type}</strong>: {hint.description}
                </li>
              ))}
            </ul>
          )}
          {loading ? <p>Syncing...</p> : null}
          {error ? (
            <p className="error-banner" onClick={clearError}>
              {error}
            </p>
          ) : null}
        </section>
      </section>

      <OnboardingTour
        visible={showTour}
        onClose={() => {
          setShowTour(false);
        }}
      />
    </main>
  );
}
