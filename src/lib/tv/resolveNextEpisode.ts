import { fetchSeasonEpisodes } from "@/lib/tmdb";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export type NextEpisodeResult =
  | {
      kind: "NEXT";
      intent: PlaybackIntent;
    }
  | {
      kind: "NEXT_SEASON";
      intent: PlaybackIntent;
    }
  | {
      kind: "END";
    };

export async function resolveNextEpisode(
  intent: PlaybackIntent,
): Promise<NextEpisodeResult | null> {
  if (intent.mediaType !== "tv") return null;
  if (!intent.season || !intent.episode) return null;

  /* ---------- Same season ---------- */
  const episodes = await fetchSeasonEpisodes(intent.tmdbId, intent.season);
  if (!episodes || episodes.length === 0) {
    return { kind: "END" };
  }

  const hasNextEpisode = episodes.some(
    (e) => e.episode_number === intent.episode! + 1,
  );

  if (hasNextEpisode) {
    return {
      kind: "NEXT",
      intent: {
        mediaType: "tv",
        tmdbId: intent.tmdbId,
        season: intent.season,
        episode: intent.episode + 1,
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
      kind: "NEXT_SEASON",
      intent: {
        mediaType: "tv",
        tmdbId: intent.tmdbId,
        season: nextSeason,
        episode: 1,
      },
    };
  }

  /* ---------- End of series ---------- */
  return { kind: "END" };
}
