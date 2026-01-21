import { useCallback } from "react";

export type TVProgress = {
  season: number;
  episode: number;
  position: number;
  updatedAt: number;
};

const tvKeyFor = (tvId: number) => `watch:tv:${tvId}`;

const MIN_RESUME_SECONDS = 30;

export function useContinueWatching() {
  const getTVProgress = useCallback((tvId: number): TVProgress | null => {
    try {
      const raw = localStorage.getItem(tvKeyFor(tvId));
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      if (
        typeof parsed?.season === "number" &&
        typeof parsed?.episode === "number" &&
        typeof parsed?.position === "number" &&
        parsed.position >= MIN_RESUME_SECONDS
      ) {
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  const setTVProgress = useCallback(
    (tvId: number, season: number, episode: number, position: number) => {
      if (position < MIN_RESUME_SECONDS) return;

      localStorage.setItem(
        tvKeyFor(tvId),
        JSON.stringify({
          season,
          episode,
          position,
          updatedAt: Date.now(),
        }),
      );
    },
    [],
  );

  const clearTVProgress = useCallback((tvId: number) => {
    localStorage.removeItem(tvKeyFor(tvId));
  }, []);

  return {
    getTVProgress,
    setTVProgress,
    clearTVProgress,
  };
}
