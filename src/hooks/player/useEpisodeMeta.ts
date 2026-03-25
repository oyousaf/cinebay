"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";
import { fetchSeasonEpisodes } from "@/lib/tmdb";

/* -------------------------------- TYPES -------------------------------- */

type SeasonEpisode = {
  episode_number: number;
  name?: string;
};

/* -------------------------------- CACHE -------------------------------- */

const seasonEpisodesCache = new Map<string, SeasonEpisode[]>();

function getSeasonCacheKey(tmdbId: number, season: number) {
  return `${tmdbId}-season-${season}`;
}

async function getSeasonEpisodesCached(
  tmdbId: number,
  season: number,
): Promise<SeasonEpisode[]> {
  const key = getSeasonCacheKey(tmdbId, season);

  if (seasonEpisodesCache.has(key)) {
    return seasonEpisodesCache.get(key)!;
  }

  try {
    const eps = await fetchSeasonEpisodes(tmdbId, season);
    const safe = Array.isArray(eps) ? (eps as SeasonEpisode[]) : [];
    seasonEpisodesCache.set(key, safe);
    return safe;
  } catch {
    return [];
  }
}

function prefetchSeasonEpisodes(tmdbId: number, season: number) {
  const key = getSeasonCacheKey(tmdbId, season);
  if (seasonEpisodesCache.has(key)) return;
  void getSeasonEpisodesCached(tmdbId, season);
}

function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

/* ======================================================================== */

export function useEpisodeMeta(intent: PlaybackIntent) {
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [nextEpisodeTitle, setNextEpisodeTitle] = useState("");
  const [hasNextEpisode, setHasNextEpisode] = useState(false);

  const [nextSeasonFirst, setNextSeasonFirst] = useState<{
    season: number;
    episode: number;
  } | null>(null);

  const intentKey = useMemo(() => getIntentKey(intent), [intent]);

  useEffect(() => {
    if (intent.mediaType !== "tv" || !intent.season || !intent.episode) {
      setEpisodeTitle("");
      setNextEpisodeTitle("");
      setHasNextEpisode(false);
      setNextSeasonFirst(null);
      return;
    }

    let cancelled = false;

    async function loadSeasonMeta() {
      const currentSeasonEpisodes = await getSeasonEpisodesCached(
        intent.tmdbId,
        intent.season!,
      );

      if (cancelled) return;

      if (!currentSeasonEpisodes.length) {
        setEpisodeTitle("");
        setNextEpisodeTitle("");
        setHasNextEpisode(false);
        setNextSeasonFirst(null);
        return;
      }

      const currentEpisode = currentSeasonEpisodes.find(
        (e) => e.episode_number === intent.episode,
      );

      setEpisodeTitle(currentEpisode?.name || "");

      const maxEpisode = Math.max(
        ...currentSeasonEpisodes.map((e) => e.episode_number),
      );

      const season = intent.season ?? 1;
      const episode = intent.episode ?? 1;

      if (episode >= maxEpisode - 1) {
        prefetchSeasonEpisodes(intent.tmdbId, season + 1);
      }

      if (episode < maxEpisode) {
        const nextEp = currentSeasonEpisodes.find(
          (e) => e.episode_number === episode + 1,
        );

        setHasNextEpisode(true);
        setNextSeasonFirst(null);
        setNextEpisodeTitle(nextEp?.name || "");
        return;
      }

      const nextSeason = season + 1;

      const nextSeasonEpisodes = await getSeasonEpisodesCached(
        intent.tmdbId,
        nextSeason,
      );

      if (cancelled) return;

      if (nextSeasonEpisodes.length) {
        setHasNextEpisode(true);
        setNextSeasonFirst({
          season: nextSeason,
          episode: nextSeasonEpisodes[0].episode_number,
        });
        setNextEpisodeTitle(nextSeasonEpisodes[0].name || "");
      } else {
        setHasNextEpisode(false);
        setNextSeasonFirst(null);
        setNextEpisodeTitle("");
      }
    }

    void loadSeasonMeta();

    return () => {
      cancelled = true;
    };
  }, [
    intentKey,
    intent.mediaType,
    intent.tmdbId,
    intent.season,
    intent.episode,
  ]);

  const nextIntent = useMemo(() => {
    if (!hasNextEpisode) return null;
    if (intent.mediaType !== "tv") return null;

    if (nextSeasonFirst) {
      return {
        ...intent,
        season: nextSeasonFirst.season,
        episode: nextSeasonFirst.episode,
      };
    }

    return {
      ...intent,
      episode: (intent.episode ?? 1) + 1,
    };
  }, [hasNextEpisode, nextSeasonFirst, intent]);

  return {
    episodeTitle,
    nextEpisodeTitle,
    hasNextEpisode,
    nextIntent,
  };
}
