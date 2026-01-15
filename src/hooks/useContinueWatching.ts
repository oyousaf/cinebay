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
   Storage keys
--------------------------------------------- */
const tvKeyFor = (tvId: number) => `watch:tv:${tvId}`;
const movieKeyFor = (movieId: number) => `watch:movie:${movieId}`;

/* ---------------------------------------------
   Hook
--------------------------------------------- */
export function useContinueWatching() {
  /* =======================
     TV
  ======================= */

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
      const payload: TVProgress = {
        season,
        episode,
        updatedAt: Date.now(),
      };

      localStorage.setItem(tvKeyFor(tvId), JSON.stringify(payload));
    },
    []
  );

  const clearTVProgress = useCallback((tvId: number) => {
    localStorage.removeItem(tvKeyFor(tvId));
  }, []);

  const getResumeLabel = useCallback(
    (tvId: number) => {
      const p = getTVProgress(tvId);
      return p ? `Resume S${p.season} · E${p.episode}` : "Play S1 · E1";
    },
    [getTVProgress]
  );

  const getResumeUrl = useCallback(
    (tvId: number) => {
      const p = getTVProgress(tvId);
      return p
        ? `https://vidlink.pro/tv/${tvId}/${p.season}/${p.episode}?autoplay=1`
        : `https://vidlink.pro/tv/${tvId}/1/1?autoplay=1`;
    },
    [getTVProgress]
  );

  /* =======================
     MOVIES 
  ======================= */

  const hasMovieProgress = useCallback((movieId: number) => {
    return Boolean(localStorage.getItem(movieKeyFor(movieId)));
  }, []);

  const markMovieStarted = useCallback((movieId: number) => {
    localStorage.setItem(
      movieKeyFor(movieId),
      JSON.stringify({ startedAt: Date.now() })
    );
  }, []);

  const clearMovieProgress = useCallback((movieId: number) => {
    localStorage.removeItem(movieKeyFor(movieId));
  }, []);

  return {
    /* TV */
    getTVProgress,
    setTVProgress,
    clearTVProgress,
    getResumeLabel,
    getResumeUrl,

    /* Movies */
    hasMovieProgress,
    markMovieStarted,
    clearMovieProgress,
  };
}
