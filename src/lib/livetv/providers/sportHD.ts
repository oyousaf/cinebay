import type { LiveProvider, MirrorCandidate, ResolvedStream } from "../types";
import { resolveWithFallbacks } from "../mirrorResolver";

export const sportHDProvider: LiveProvider = {
  id: "sport-hd",
  name: "Sport HD",
  priority: 1,

  async getChannels() {
    return [
      {
        id: "laliga-real-barca",
        name: "La Liga: Real Madrid vs Barcelona",
        category: "sports",
        provider: "sport-hd",
      },
      {
        id: "laliga-atleti-sevilla",
        name: "La Liga: Atletico Madrid vs Sevilla",
        category: "sports",
        provider: "sport-hd",
      },
      {
        id: "laliga-valencia-villarreal",
        name: "La Liga: Valencia vs Villarreal",
        category: "sports",
        provider: "sport-hd",
      },
    ];
  },

  async resolveStream(channelId: string): Promise<ResolvedStream | null> {
    console.log(`[SportHD] resolve requested`, channelId);

    const mirrors: MirrorCandidate[] = [
      { id: "mirror-1", label: "Primary mirror", priority: 1 },
      { id: "mirror-2", label: "Backup mirror", priority: 2 },
      { id: "mirror-3", label: "Last resort", priority: 3 },
    ];

    return resolveWithFallbacks(mirrors, async (mirror) => {
      console.log(`[SportHD] trying ${mirror.id} for ${channelId}`);

      return null;
    });
  },
};
