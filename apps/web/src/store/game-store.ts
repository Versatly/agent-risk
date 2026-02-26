import { create } from "zustand";
import type { Socket } from "socket.io-client";
import type { GameStatePrivate, GameStatePublic, LegalActionHint, RiskAction } from "@risk/shared-types";
import { api } from "../lib/api";
import { connectGameSocket, type SessionAuth } from "../lib/socket";
import type { SessionCredentials } from "./lobby-store";

interface GameStoreState {
  publicState: GameStatePublic | null;
  privateState: GameStatePrivate | null;
  legalActions: LegalActionHint[];
  loading: boolean;
  error: string | null;
  socket: Socket | null;
  connect: (credentials: SessionCredentials) => void;
  disconnect: () => void;
  loadState: (credentials: SessionCredentials) => Promise<void>;
  refreshLegalActions: (credentials: SessionCredentials) => Promise<void>;
  submitAction: (credentials: SessionCredentials, action: RiskAction) => Promise<void>;
  endTurn: (credentials: SessionCredentials) => Promise<void>;
  addBot: (credentials: SessionCredentials, botName: string) => Promise<void>;
  startGame: (credentials: SessionCredentials) => Promise<void>;
  clearError: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  publicState: null,
  privateState: null,
  legalActions: [],
  loading: false,
  error: null,
  socket: null,

  connect: (credentials) => {
    if (get().socket) {
      return;
    }

    const auth: SessionAuth = {
      gameId: credentials.gameId,
      playerId: credentials.playerId,
      playerSecret: credentials.playerSecret,
    };

    const socket = connectGameSocket(auth, {
      onPublicState: (state) => {
        set({ publicState: state });
      },
      onPrivateState: (state) => {
        set({ privateState: state });
      },
      onActionError: (error) => {
        set({ error: error.message ?? "Action rejected by server." });
      },
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }

    set({
      socket: null,
      publicState: null,
      privateState: null,
      legalActions: [],
      error: null,
    });
  },

  loadState: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const result = await api.getState(
        credentials.gameId,
        credentials.playerId,
        credentials.playerSecret,
      );
      set({
        privateState: result.state as GameStatePrivate,
        publicState: result.state as GameStatePublic,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error),
      });
    }
  },

  refreshLegalActions: async (credentials) => {
    try {
      const result = await api.getLegalActions(
        credentials.gameId,
        credentials.playerId,
        credentials.playerSecret,
      );
      set({
        legalActions: result.actions as LegalActionHint[],
      });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  submitAction: async (credentials, action) => {
    set({ loading: true, error: null });
    try {
      const result = await api.submitAction(
        credentials.gameId,
        credentials.playerId,
        credentials.playerSecret,
        action,
      );
      set({
        loading: false,
        privateState: result.state as GameStatePrivate,
        publicState: result.publicState as GameStatePublic,
      });
      await get().refreshLegalActions(credentials);
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) });
    }
  },

  endTurn: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const result = await api.endTurn(
        credentials.gameId,
        credentials.playerId,
        credentials.playerSecret,
      );
      set({
        loading: false,
        privateState: result.state as GameStatePrivate,
        publicState: result.publicState as GameStatePublic,
      });
      await get().refreshLegalActions(credentials);
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error),
      });
    }
  },

  addBot: async (credentials, botName) => {
    set({ loading: true, error: null });
    try {
      await api.addBot(credentials.gameId, botName);
      await get().loadState(credentials);
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error),
      });
    }
  },

  startGame: async (credentials) => {
    set({ loading: true, error: null });
    try {
      await api.startGame(credentials.gameId);
      await get().loadState(credentials);
      await get().refreshLegalActions(credentials);
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error),
      });
    }
  },

  clearError: () => set({ error: null }),
}));

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
