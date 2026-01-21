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
  if (
    intent.mediaType !== "tv" ||
    typeof intent.season !== "number" ||
    typeof intent.episode !== "number"
  ) {
    return null;
  }

  const episodes = await fetchSeasonEpisodes(intent.tmdbId, intent.season);
  if (!Array.isArray(episodes)) return null;
  if (episodes.length === 0) return { kind: "END" };

  const nextEpisodeNumber = intent.episode + 1;

  if (episodes.some((e) => e.episode_number === nextEpisodeNumber)) {
    return {
      kind: "NEXT",
      intent: {
        mediaType: "tv",
        tmdbId: intent.tmdbId,
        season: intent.season,
        episode: nextEpisodeNumber,
      },
    };
  }

  const nextSeason = intent.season + 1;
  const nextSeasonEpisodes = await fetchSeasonEpisodes(
    intent.tmdbId,
    nextSeason,
  );

  if (!Array.isArray(nextSeasonEpisodes)) return null;

  if (nextSeasonEpisodes.length > 0) {
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

  return { kind: "END" };
}
