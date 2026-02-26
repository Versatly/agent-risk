import { useMemo, useState } from "react";
import { resolveRoute } from "./router";
import { useLobbyStore } from "../store/lobby-store";
import { LobbyPage } from "../features/lobby/LobbyPage";
import { GamePage } from "../features/game/GamePage";

export function App() {
  const { credentials, setCredentials } = useLobbyStore();
  const [manualRoute, setManualRoute] = useState<"lobby" | "game" | null>(null);

  const route = useMemo(
    () => manualRoute ?? resolveRoute(credentials),
    [credentials, manualRoute],
  );

  if (route === "lobby" || !credentials) {
    return (
      <LobbyPage
        onReadyToPlay={() => {
          setManualRoute("game");
        }}
      />
    );
  }

  return (
    <GamePage
      credentials={credentials}
      onLeaveSession={() => {
        setCredentials(null);
        setManualRoute("lobby");
      }}
    />
  );
}
