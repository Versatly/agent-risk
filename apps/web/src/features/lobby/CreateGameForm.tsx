import { useState } from "react";
import type { FormEvent } from "react";

interface CreateGameFormProps {
  loading: boolean;
  onCreateLobby: (hostName: string, maxPlayers: number) => Promise<void>;
}

export function CreateGameForm({
  loading,
  onCreateLobby,
}: CreateGameFormProps) {
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!hostName.trim()) {
      return;
    }
    await onCreateLobby(hostName.trim(), maxPlayers);
  }

  return (
    <form className="panel stack gap-md" onSubmit={handleSubmit}>
      <h2>Create a New War Room</h2>
      <label className="stack gap-xs">
        <span>Commander Name</span>
        <input
          value={hostName}
          onChange={(event) => setHostName(event.target.value)}
          placeholder="e.g. General Vega"
          maxLength={32}
          required
        />
      </label>
      <label className="stack gap-xs">
        <span>Max Players</span>
        <input
          type="range"
          min={2}
          max={6}
          value={maxPlayers}
          onChange={(event) => setMaxPlayers(Number(event.target.value))}
        />
        <small>{maxPlayers} players</small>
      </label>
      <button disabled={loading} type="submit" className="primary">
        {loading ? "Creating..." : "Create Lobby"}
      </button>
    </form>
  );
}
