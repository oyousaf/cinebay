import { useCallback } from "react";

/* ---------------------------------------------
   Types
--------------------------------------------- */
export type TVProgress = {
  season: number;
  episode: number;
  updatedAt: number;
};

/* ---------------------------------------------
   Storage
--------------------------------------------- */
const tvKeyFor = (tvId: number) => `watch:tv:${tvId}`;
const movieKeyFor = (movieId: number) => `watch:movie:${movieId}`;

/* ---------------------------------------------
   Hook
--------------------------------------------- */
export function useContinueWatching() {
  /* ---------- TV ---------- */
  const getTVProgress = useCallback((tvId: number): TVProgress | null => {
    try {
      const raw = localStorage.getItem(tvKeyFor(tvId));
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.season === "number" &&
        typeof parsed?.episode === "number" &&
        typeof parsed?.updatedAt === "number"
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const setTVProgress = useCallback(
    (tvId: number, season: number, episode: number) => {
      localStorage.setItem(
        tvKeyFor(tvId),
        JSON.stringify({ season, episode, updatedAt: Date.now() })
      );
    },
    []
  );

  /* ---------- MOVIES (binary resume) ---------- */
  const hasMovieProgress = useCallback((movieId: number) => {
    return Boolean(localStorage.getItem(movieKeyFor(movieId)));
  }, []);

  const markMovieStarted = useCallback((movieId: number) => {
    localStorage.setItem(
      movieKeyFor(movieId),
      JSON.stringify({ startedAt: Date.now() })
    );
  }, []);

  /* ---------- Helpers ---------- */
  const getResumeUrl = useCallback(
    (tvId: number) => {
      const p = getTVProgress(tvId);
      return p
        ? `https://vidlink.pro/tv/${tvId}/${p.season}/${p.episode}?autoplay=1`
        : `https://vidlink.pro/tv/${tvId}/1/1?autoplay=1`;
    },
    [getTVProgress]
  );

  return {
    getTVProgress,
    setTVProgress,
    getResumeUrl,

    /* movie */
    hasMovieProgress,
    markMovieStarted,
  };
}
