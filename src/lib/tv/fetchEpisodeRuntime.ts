import { fetchFromProxy } from "@/lib/tmdb";

export async function fetchEpisodeRuntime(
  tmdbId: number,
  season: number,
  episode: number,
): Promise<number | null> {
  const data = await fetchFromProxy(
    `/tv/${tmdbId}/season/${season}/episode/${episode}`,
  );

  if (!data || typeof data.runtime !== "number") return null;

  return data.runtime * 60;
}
