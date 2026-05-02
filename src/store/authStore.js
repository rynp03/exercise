import { create } from "zustand";

export const useAuthStore = create((set) => ({
  tokens: null,
  sipCredentials: null,
  setTokens: (tokens) => set({ tokens }),
  setSipCredentials: (sipCredentials) => set({ sipCredentials }),
  clear: () => set({ tokens: null, sipCredentials: null }),
}));
