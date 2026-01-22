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
    if (typeof window === "undefined") return null;

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
    (
      tvId: number,
      season: number,
      episode: number,
      position: number = MIN_RESUME_SECONDS,
    ) => {
      if (typeof window === "undefined") return;
      if (position < MIN_RESUME_SECONDS) return;

      const key = tvKeyFor(tvId);
      const existing = localStorage.getItem(key);

      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (
            parsed.season === season &&
            parsed.episode === episode &&
            parsed.position === position
          ) {
            return;
          }
        } catch {
          /* overwrite corrupted data */
        }
      }

      localStorage.setItem(
        key,
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
    if (typeof window === "undefined") return;
    localStorage.removeItem(tvKeyFor(tvId));
  }, []);

  return {
    getTVProgress,
    setTVProgress,
    clearTVProgress,
  };
}
