import { fetchSeasonEpisodes } from "@/lib/tmdb";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
export type NextEpisodeResult =
  | { kind: "episode"; intent: PlaybackIntent }
  | { kind: "season"; intent: PlaybackIntent }
  | { kind: "end" };

/* -------------------------------------------------
   RESOLVER
-------------------------------------------------- */
export async function resolveNextEpisode(
  intent: PlaybackIntent,
): Promise<NextEpisodeResult | null> {
  if (intent.mediaType !== "tv") return null;
  if (!intent.season || !intent.episode) return null;

  /* ---------- Same season ---------- */
  const episodes = await fetchSeasonEpisodes(intent.tmdbId, intent.season);
  if (!episodes || episodes.length === 0) return null;

  const nextEpisodeNumber = intent.episode + 1;
  const hasNextEpisode = episodes.some(
    (e) => e.episode_number === nextEpisodeNumber,
  );

  if (hasNextEpisode) {
    return {
      kind: "episode",
      intent: {
        mediaType: "tv",
        tmdbId: intent.tmdbId,
        season: intent.season,
        episode: nextEpisodeNumber,
      },
    };
  }

  /* ---------- Next season ---------- */
  const nextSeason = intent.season + 1;
  const nextSeasonEpisodes = await fetchSeasonEpisodes(
    intent.tmdbId,
    nextSeason,
  );

  if (nextSeasonEpisodes && nextSeasonEpisodes.length > 0) {
    return {
      kind: "season",
      intent: {
        mediaType: "tv",
        tmdbId: intent.tmdbId,
        season: nextSeason,
        episode: 1,
      },
    };
  }

  /* ---------- End of series ---------- */
  return { kind: "end" };
}
