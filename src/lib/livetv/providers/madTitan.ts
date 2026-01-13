import type { LiveProvider } from "../types";

export const madTitanProvider: LiveProvider = {
  id: "mad-titan",
  name: "Mad Titan Sports",
  priority: 4,

  async getChannels() {
    return [
      {
        id: "mad-titan-sports",
        name: "Mad Titan Sports",
        category: "sports",
        provider: "mad-titan",
      },
    ];
  },

  async resolveStream() {
    return null;
  },
};
