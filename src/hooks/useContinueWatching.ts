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
const keyFor = (tvId: number) => `watch:tv:${tvId}`;

/* ---------------------------------------------
   Hook
--------------------------------------------- */
export function useContinueWatching() {
  /* ---------- Read ---------- */
  const getTVProgress = useCallback((tvId: number): TVProgress | null => {
    try {
      const raw = localStorage.getItem(keyFor(tvId));
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

  /* ---------- Write ---------- */
  const setTVProgress = useCallback(
    (tvId: number, season: number, episode: number) => {
      const payload: TVProgress = {
        season,
        episode,
        updatedAt: Date.now(),
      };

      localStorage.setItem(keyFor(tvId), JSON.stringify(payload));
    },
    []
  );

  /* ---------- Clear ---------- */
  const clearTVProgress = useCallback((tvId: number) => {
    localStorage.removeItem(keyFor(tvId));
  }, []);

  /* ---------- Helpers (SINGLE SOURCE OF TRUTH) ---------- */
  const getResumeLabel = useCallback(
    (tvId: number) => {
      const p = getTVProgress(tvId);
      return p ? `Resume S${p.season} · E${p.episode}` : "Play · S1 · E1";
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

  return {
    getTVProgress,
    setTVProgress,
    clearTVProgress,
    getResumeLabel,
    getResumeUrl,
  };
}
