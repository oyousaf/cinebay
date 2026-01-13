import type { LiveProvider } from "../types";

export const risingTidesProvider: LiveProvider = {
  id: "rising-tides",
  name: "Rising Tides",
  priority: 5,

  async getChannels() {
    return [
      {
        id: "rising-tides-sports",
        name: "Rising Tides Sports",
        category: "sports",
        provider: "rising-tides",
      },
    ];
  },

  async resolveStream() {
    return null;
  },
};
