import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLobbyStore } from "../../store/lobby-store";
import { CreateGameForm } from "./CreateGameForm";

interface LobbyPageProps {
  onReadyToPlay: () => void;
}

export function LobbyPage({ onReadyToPlay }: LobbyPageProps) {
  const {
    lobbies,
    loading,
    error,
    credentials,
    refreshLobbies,
    createLobby,
    joinLobby,
  } = useLobbyStore();

  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  useEffect(() => {
    void refreshLobbies();
    const timer = setInterval(() => {
      void refreshLobbies();
    }, 3000);
    return () => clearInterval(timer);
  }, [refreshLobbies]);

  useEffect(() => {
    if (credentials) {
      onReadyToPlay();
    }
  }, [credentials, onReadyToPlay]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!joinCode || !joinName) {
      return;
    }
    await joinLobby(joinCode.toUpperCase(), joinName.trim());
  }

  return (
    <main className="lobby-layout">
      <section className="hero panel">
        <h1>Risk: Browser Command</h1>
        <p>
          A tabletop-inspired digital battlefield. Create a lobby, invite friends
          or bots, then conquer the world with classic Risk strategy.
        </p>
      </section>

      <section className="lobby-grid">
        <CreateGameForm loading={loading} onCreateLobby={createLobby} />

        <form className="panel stack gap-md" onSubmit={handleJoin}>
          <h2>Join Existing Lobby</h2>
          <label className="stack gap-xs">
            <span>Lobby Code</span>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="AB12CD"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <label className="stack gap-xs">
            <span>Player Name</span>
            <input
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              placeholder="e.g. Captain Orion"
              maxLength={32}
              required
            />
          </label>
          <button disabled={loading} className="primary" type="submit">
            {loading ? "Joining..." : "Join Lobby"}
          </button>
        </form>
      </section>

      <section className="panel">
        <header className="row between">
          <h2>Open Lobbies</h2>
          <button onClick={() => void refreshLobbies()} disabled={loading}>
            Refresh
          </button>
        </header>
        <div className="open-lobbies">
          {lobbies.length === 0 ? (
            <p>No open lobbies yet — create one above.</p>
          ) : (
            lobbies.map((lobby) => (
              <article key={lobby.gameId} className="lobby-card">
                <h3>{lobby.lobbyCode}</h3>
                <p>
                  {lobby.players.length}/{lobby.maxPlayers} players
                </p>
                <p>
                  {lobby.players.map((player) => player.name).join(", ")}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
    </main>
  );
}
