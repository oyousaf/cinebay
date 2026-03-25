"use client";

import { useEffect, useRef, useCallback } from "react";

/* -------------------------------- CONFIG -------------------------------- */

const PROGRESS_QUEUE_STEP_SECONDS = 15;
const PROGRESS_FLUSH_INTERVAL_MS = 30000;

/* -------------------------------- TYPES -------------------------------- */

type PlaybackIntent = {
  mediaType: "movie" | "tv";
  tmdbId: number;
  season?: number;
  episode?: number;
};

type PendingProgress = {
  tmdbId: number;
  season: number;
  episode: number;
  position: number;
} | null;

/* ======================================================================== */

export function useProgressTracker(
  intent: PlaybackIntent,
  reportTVPlayback: (
    tmdbId: number,
    season: number,
    episode: number,
    position: number,
  ) => void,
) {
  const pendingProgressRef = useRef<PendingProgress>(null);
  const lastQueuedProgressRef = useRef(0);

  const progressFlushIntervalRef = useRef<number | null>(null);

  /* ------------------------------------------------------------------ */
  /* FLUSH                                                              */
  /* ------------------------------------------------------------------ */

  const flushPendingProgress = useCallback(() => {
    const pending = pendingProgressRef.current;
    if (!pending) return;

    reportTVPlayback(
      pending.tmdbId,
      pending.season,
      pending.episode,
      pending.position,
    );

    pendingProgressRef.current = null;
  }, [reportTVPlayback]);

  /* ------------------------------------------------------------------ */
  /* QUEUE                                                              */
  /* ------------------------------------------------------------------ */

  const queueProgressWrite = useCallback(
    (position: number) => {
      if (intent.mediaType !== "tv") return;
      if (!intent.season || !intent.episode) return;

      pendingProgressRef.current = {
        tmdbId: intent.tmdbId,
        season: intent.season,
        episode: intent.episode,
        position: Math.floor(position),
      };
    },
    [intent.mediaType, intent.tmdbId, intent.season, intent.episode],
  );

  /* ------------------------------------------------------------------ */
  /* STEP THROTTLING (external use)                                     */
  /* ------------------------------------------------------------------ */

  const maybeQueueProgress = useCallback(
    (currentTime: number) => {
      const floored = Math.floor(currentTime);

      if (
        floored - lastQueuedProgressRef.current >=
        PROGRESS_QUEUE_STEP_SECONDS
      ) {
        lastQueuedProgressRef.current = floored;
        queueProgressWrite(floored);
      }
    },
    [queueProgressWrite],
  );

  /* ------------------------------------------------------------------ */
  /* INTERVAL                                                           */
  /* ------------------------------------------------------------------ */

  const clearProgressFlushInterval = useCallback(() => {
    if (progressFlushIntervalRef.current !== null) {
      clearInterval(progressFlushIntervalRef.current);
      progressFlushIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearProgressFlushInterval();

    if (intent.mediaType !== "tv") {
      return;
    }

    progressFlushIntervalRef.current = window.setInterval(() => {
      flushPendingProgress();
    }, PROGRESS_FLUSH_INTERVAL_MS);

    return () => {
      clearProgressFlushInterval();
      flushPendingProgress();
    };
  }, [intent.mediaType, clearProgressFlushInterval, flushPendingProgress]);

  /* ------------------------------------------------------------------ */
  /* RESET (call on intent change)                                      */
  /* ------------------------------------------------------------------ */

  const resetProgressTracking = useCallback(() => {
    pendingProgressRef.current = null;
    lastQueuedProgressRef.current = 0;
  }, []);

  /* ------------------------------------------------------------------ */

  return {
    queueProgressWrite,
    maybeQueueProgress,
    flushPendingProgress,
    resetProgressTracking,
  };
}
