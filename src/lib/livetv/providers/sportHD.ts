import type { LiveProvider, ResolvedStream } from "../types";

export const sportHDProvider: LiveProvider = {
  id: "sport-hd",
  name: "Sport HD",
  priority: 1,

  async getChannels() {
    // Metadata only. No scraping in Sprint 2.
    return [
      {
        id: "sport-hd-live-1",
        name: "Sport HD – Live 1",
        category: "sports",
        provider: "sport-hd",
      },
      {
        id: "sport-hd-live-2",
        name: "Sport HD – Live 2",
        category: "sports",
        provider: "sport-hd",
      },
    ];
  },

  async resolveStream(channelId: string): Promise<ResolvedStream | null> {
    /**
     * Sprint 2 contract:
     * - Resolver exists
     * - Signature locked
     * - Logic intentionally not implemented
     *
     * Sprint 3 will:
     * - Fetch addon manifest / endpoint
     * - Resolve playable stream
     * - Apply headers / proxy if required
     */
    console.warn(`[SportHD] resolveStream not implemented`, channelId);
    return null;
  },
};
