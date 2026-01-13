import type { LiveProvider } from "../types";

export const daddyLiveProvider: LiveProvider = {
  id: "daddy-live",
  name: "Daddy Live",
  priority: 3,

  async getChannels() {
    return [
      {
        id: "daddy-live-main",
        name: "Daddy Live Sports",
        category: "sports",
        provider: "daddy-live",
      },
    ];
  },

  async resolveStream() {
    return null;
  },
};
