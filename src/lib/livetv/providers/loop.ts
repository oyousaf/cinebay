import type { LiveProvider } from "../types";

export const loopProvider: LiveProvider = {
  id: "loop",
  name: "Loop",
  priority: 2,

  async getChannels() {
    return [
      {
        id: "loop-sports",
        name: "Loop Sports",
        category: "sports",
        provider: "loop",
      },
    ];
  },

  async resolveStream() {
    return null;
  },
};
