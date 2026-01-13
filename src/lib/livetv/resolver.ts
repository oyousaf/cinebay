import { providers } from "./registry";
import type { LiveChannel, ResolvedStream } from "./types";

export async function getAllLiveChannels(): Promise<LiveChannel[]> {
  const results = await Promise.all(providers.map((p) => p.getChannels()));
  return results.flat();
}

export async function resolveLiveStream(
  providerId: string,
  channelId: string
): Promise<ResolvedStream | null> {
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) return null;
  return provider.resolveStream(channelId);
}
