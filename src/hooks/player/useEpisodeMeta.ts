"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";
import { fetchSeasonEpisodes } from "@/lib/tmdb";

/* -------------------------------- TYPES -------------------------------- */

type SeasonEpisode = {
  episode_number: number;
  name?: string;
  runtime?: number;
  episode_run_time?: number[];
};

/* -------------------------------- CACHE -------------------------------- */

const seasonEpisodesCache = new Map<string, SeasonEpisode[]>();
const seasonRuntimeCache = new Map<string, number>();

function getSeasonCacheKey(tmdbId: number, season: number) {
  return `${tmdbId}-season-${season}`;
}

async function getSeasonEpisodesCached(
  tmdbId: number,
  season: number
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

/* -------------------------- RUNTIME RESOLUTION -------------------------- */

function resolveEpisodeRuntime(ep?: SeasonEpisode): number | undefined {
  if (!ep) return;

  if (typeof ep.runtime === "number" && ep.runtime > 0) {
    return ep.runtime * 60;
  }

  if (Array.isArray(ep.episode_run_time) && ep.episode_run_time.length) {
    const val = ep.episode_run_time[0];
    if (typeof val === "number" && val > 0) {
      return val * 60;
    }
  }
}

function resolveSeasonAverageRuntime(
  key: string,
  episodes: SeasonEpisode[]
): number | undefined {
  if (seasonRuntimeCache.has(key)) {
    return seasonRuntimeCache.get(key);
  }

  const runtimes = episodes
    .map((e) => resolveEpisodeRuntime(e))
    .filter((r): r is number => typeof r === "number");

  if (!runtimes.length) return;

  const avg = Math.round(
    runtimes.reduce((a, b) => a + b, 0) / runtimes.length
  );

  seasonRuntimeCache.set(key, avg);
  return avg;
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

  const [runtimeSeconds, setRuntimeSeconds] = useState<number | undefined>();

  useEffect(() => {
    if (intent.mediaType !== "tv" || !intent.season || !intent.episode) {
      setEpisodeTitle("");
      setNextEpisodeTitle("");
      setHasNextEpisode(false);
      setNextSeasonFirst(null);
      setRuntimeSeconds(undefined);
      return;
    }

    let cancelled = false;

    setEpisodeTitle("");
    setNextEpisodeTitle("");
    setHasNextEpisode(false);
    setNextSeasonFirst(null);
    setRuntimeSeconds(undefined);

    async function loadSeasonMeta() {
      const season = intent.season!;
      const episode = intent.episode!;
      const cacheKey = getSeasonCacheKey(intent.tmdbId, season);

      const currentSeasonEpisodes = await getSeasonEpisodesCached(
        intent.tmdbId,
        season
      );

      if (cancelled) return;
      if (!currentSeasonEpisodes.length) return;

      const currentEpisode = currentSeasonEpisodes.find(
        (e) => e.episode_number === episode
      );

      setEpisodeTitle(currentEpisode?.name || "");

      /* ---------------- RUNTIME ---------------- */

      let runtime =
        resolveEpisodeRuntime(currentEpisode) ??
        resolveSeasonAverageRuntime(cacheKey, currentSeasonEpisodes);

      // FINAL fallback (safe baseline)
      if (!runtime) {
        runtime = 45 * 60; // 45 min default
      }

      setRuntimeSeconds(runtime);

      /* ---------------- NEXT EPISODE ---------------- */

      const maxEpisode = Math.max(
        ...currentSeasonEpisodes.map((e) => e.episode_number)
      );

      if (episode >= maxEpisode - 1) {
        prefetchSeasonEpisodes(intent.tmdbId, season + 1);
      }

      if (episode < maxEpisode) {
        const nextEp = currentSeasonEpisodes.find(
          (e) => e.episode_number === episode + 1
        );

        setHasNextEpisode(true);
        setNextEpisodeTitle(nextEp?.name || "");
        setNextSeasonFirst(null);
        return;
      }

      const nextSeasonEpisodes = await getSeasonEpisodesCached(
        intent.tmdbId,
        season + 1
      );

      if (cancelled) return;

      if (nextSeasonEpisodes.length) {
        setHasNextEpisode(true);
        setNextSeasonFirst({
          season: season + 1,
          episode: nextSeasonEpisodes[0].episode_number,
        });
        setNextEpisodeTitle(nextSeasonEpisodes[0].name || "");
      }
    }

    void loadSeasonMeta();

    return () => {
      cancelled = true;
    };
  }, [intent.tmdbId, intent.season, intent.episode, intent.mediaType]);

  const nextIntent = useMemo(() => {
    if (!hasNextEpisode || intent.mediaType !== "tv") return null;

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
    runtimeSeconds,
  };
}