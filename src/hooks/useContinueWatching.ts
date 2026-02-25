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
  const isBrowser = typeof window !== "undefined";

  /* -------------------------------------------------
     READ
  -------------------------------------------------- */
  const getTVProgress = useCallback(
    (tvId: number): TVProgress | null => {
      if (!isBrowser) return null;

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
      } catch {
        // corrupted → ignore
      }

      return null;
    },
    [isBrowser],
  );

  /* -------------------------------------------------
     WRITE (manual)
  -------------------------------------------------- */
  const setTVProgress = useCallback(
    (
      tvId: number,
      season: number,
      episode: number,
      position: number = MIN_RESUME_SECONDS,
    ) => {
      if (!isBrowser) return;
      if (position < MIN_RESUME_SECONDS) return;

      const key = tvKeyFor(tvId);
      const existing = localStorage.getItem(key);

      if (existing) {
        try {
          const parsed = JSON.parse(existing);

          // Same episode + already further ahead → skip
          if (
            parsed.season === season &&
            parsed.episode === episode &&
            parsed.position >= position
          ) {
            return;
          }
        } catch {
          // overwrite corrupted
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
    [isBrowser],
  );

  /* -------------------------------------------------
     PLAYER REPORT (MEDIA_DATA)
  -------------------------------------------------- */
  const reportTVPlayback = useCallback(
    (tvId: number, season: number, episode: number, currentTime: number) => {
      if (!isBrowser) return;
      if (!currentTime || currentTime < MIN_RESUME_SECONDS) return;

      const key = tvKeyFor(tvId);
      const existing = localStorage.getItem(key);

      if (existing) {
        try {
          const parsed = JSON.parse(existing);

          // Same episode + already further ahead → skip
          if (
            parsed.season === season &&
            parsed.episode === episode &&
            parsed.position >= currentTime
          ) {
            return;
          }
        } catch {
          // overwrite corrupted
        }
      }

      localStorage.setItem(
        key,
        JSON.stringify({
          season,
          episode,
          position: currentTime,
          updatedAt: Date.now(),
        }),
      );
    },
    [isBrowser],
  );

  /* -------------------------------------------------
     CLEAR
  -------------------------------------------------- */
  const clearTVProgress = useCallback(
    (tvId: number) => {
      if (!isBrowser) return;
      localStorage.removeItem(tvKeyFor(tvId));
    },
    [isBrowser],
  );

  return {
    getTVProgress,
    setTVProgress,
    reportTVPlayback,
    clearTVProgress,
  };
}
