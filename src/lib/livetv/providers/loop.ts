import type { LiveProvider, MirrorCandidate, ResolvedStream } from "../types";
import { resolveWithFallbacks } from "../mirrorResolver";

export const loopProvider: LiveProvider = {
  id: "loop",
  name: "Loop",
  priority: 2,

  async getChannels() {
    return [
      {
        id: "loop-laliga-real-barca",
        name: "Real Madrid vs Barcelona",
        category: "sports",
        provider: "loop",
        meta: {
          league: "La Liga",
          kickoffUTC: "2026-02-14T20:00:00Z",
          order: 1,
        },
      },
      {
        id: "loop-laliga-betis-sociedad",
        name: "Real Betis vs Real Sociedad",
        category: "sports",
        provider: "loop",
        meta: {
          league: "La Liga",
          kickoffUTC: "2026-02-15T15:00:00Z",
          order: 4,
        },
      },
    ];
  },

  async resolveStream(channelId: string): Promise<ResolvedStream | null> {
    console.log(`[Loop] resolve requested`, channelId);

    const mirrors: MirrorCandidate[] = [
      { id: "loop-mirror-1", label: "Loop mirror A", priority: 1 },
      { id: "loop-mirror-2", label: "Loop mirror B", priority: 2 },
    ];

    return resolveWithFallbacks(mirrors, async (mirror) => {
      console.log(`[Loop] trying ${mirror.id} for ${channelId}`);
      return null;
    });
  },
};
