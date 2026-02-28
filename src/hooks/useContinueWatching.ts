import { useCallback } from "react";

export type TVProgress = {
  season: number;
  episode: number;
  position: number;
  updatedAt: number;
};

const tvKeyFor = (tvId: number) => `watch:tv:${tvId}`;
const MIN_RESUME_SECONDS = 30;
const PROGRESS_EVENT = "tv-progress-updated";

/* ------------------------------------------------------------------ */
/* INTERNAL HELPERS                                                   */
/* ------------------------------------------------------------------ */

function dispatchProgressEvent(tvId: number) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PROGRESS_EVENT, {
      detail: { tvId },
    }),
  );
}

function safeParse(raw: string | null): TVProgress | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.season === "number" &&
      typeof parsed?.episode === "number" &&
      typeof parsed?.position === "number"
    ) {
      return parsed;
    }
  } catch {}

  return null;
}

/* ------------------------------------------------------------------ */
/* HOOK                                                               */
/* ------------------------------------------------------------------ */

export function useContinueWatching() {
  const isBrowser = typeof window !== "undefined";

  /* -------------------------------------------------
     READ
  -------------------------------------------------- */
  const getTVProgress = useCallback(
    (tvId: number): TVProgress | null => {
      if (!isBrowser) return null;

      const parsed = safeParse(localStorage.getItem(tvKeyFor(tvId)));
      if (!parsed) return null;

      if (parsed.position < MIN_RESUME_SECONDS) return null;

      return parsed;
    },
    [isBrowser],
  );

  /* -------------------------------------------------
     WRITE CORE
  -------------------------------------------------- */
  const writeProgress = useCallback(
    (tvId: number, season: number, episode: number, position: number) => {
      if (!isBrowser) return;

      const key = tvKeyFor(tvId);
      const existing = safeParse(localStorage.getItem(key));

      // Skip if same episode and already further ahead
      if (
        existing &&
        existing.season === season &&
        existing.episode === episode &&
        existing.position >= position
      ) {
        return;
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

      // 🔔 Notify app (reactive update)
      dispatchProgressEvent(tvId);
    },
    [isBrowser],
  );

  /* -------------------------------------------------
     WRITE
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

      writeProgress(tvId, season, episode, position);
    },
    [isBrowser, writeProgress],
  );

  /* -------------------------------------------------
     PLAYER REPORT
  -------------------------------------------------- */
  const reportTVPlayback = useCallback(
    (tvId: number, season: number, episode: number, currentTime: number) => {
      if (!isBrowser) return;
      if (!currentTime || currentTime < MIN_RESUME_SECONDS) return;

      writeProgress(tvId, season, episode, currentTime);
    },
    [isBrowser, writeProgress],
  );

  /* -------------------------------------------------
     CLEAR
  -------------------------------------------------- */
  const clearTVProgress = useCallback(
    (tvId: number) => {
      if (!isBrowser) return;

      localStorage.removeItem(tvKeyFor(tvId));
      dispatchProgressEvent(tvId);
    },
    [isBrowser],
  );

  return {
    getTVProgress,
    setTVProgress,
    reportTVPlayback,
    clearTVProgress,
    PROGRESS_EVENT,
  };
}
