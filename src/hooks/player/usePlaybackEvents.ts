"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------------------- CONFIG -------------------------------- */

const START_THRESHOLD_SECONDS = 30;
const NEXT_OVERLAY_THRESHOLD = 0.9;

const SCRUB_DELTA_SECONDS = 5;
const STABLE_DELTA_SECONDS = 1;

/* ======================================================================== */

function safeMsgData(data: unknown): Record<string, any> | null {
  if (!data) return null;

  if (typeof data === "object") {
    return data as Record<string, any>;
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === "object" && parsed ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

function isPlayerOrigin(origin: string) {
  if (!origin) return false;

  const o = origin.toLowerCase();

  return (
    o.includes("vidlink") ||
    o.includes("vidfast") ||
    o.includes("multiembed") ||
    o.includes("embed")
  );
}

function extractPlayerMetrics(msg: Record<string, any>) {
  const payload =
    msg?.data && typeof msg.data === "object" ? msg.data : (msg ?? {});

  const rawCurrentTime = payload?.currentTime ?? payload?.current_time;
  const rawDuration = payload?.duration ?? payload?.totalDuration;
  const rawEvent =
    msg?.event ?? msg?.type ?? payload?.event ?? payload?.type ?? "";

  const currentTime =
    typeof rawCurrentTime === "number" ? rawCurrentTime : undefined;

  const duration = typeof rawDuration === "number" ? rawDuration : undefined;

  const eventType = String(rawEvent).toLowerCase();

  return { currentTime, duration, eventType };
}

/* ======================================================================== */

export function usePlaybackEvents({
  intent,
  hasNextEpisode,
  maybeQueueProgress,
  markPlaybackStarted,
}: {
  intent: {
    mediaType: "movie" | "tv";
  };
  hasNextEpisode: boolean;
  maybeQueueProgress: (t: number) => void;
  markPlaybackStarted: () => void;
}) {
  const [showNextOverlay, setShowNextOverlay] = useState(false);

  const hasStartedRef = useRef(false);
  const showNextOverlayRef = useRef(false);

  const lastEventTimeRef = useRef(Date.now());
  const lastKnownTimeRef = useRef(0);
  const isScrubbingRef = useRef(false);

  const lastProcessedRef = useRef(0);

  /* ------------------------------------------------------------------ */
  /* MESSAGE HANDLER                                                   */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPlayerOrigin(event.origin)) return;

      const now = Date.now();

      if (now - lastProcessedRef.current < 250) return;
      lastProcessedRef.current = now;

      const msg = safeMsgData(event.data);
      if (!msg) return;

      const { currentTime, duration, eventType } = extractPlayerMetrics(msg);

      lastEventTimeRef.current = now;

      /* ---------------- SCRUB DETECTION ---------------- */

      if (typeof currentTime === "number") {
        const delta = Math.abs(currentTime - lastKnownTimeRef.current);

        if (delta >= SCRUB_DELTA_SECONDS) {
          isScrubbingRef.current = true;
        } else if (delta <= STABLE_DELTA_SECONDS) {
          isScrubbingRef.current = false;
        }

        lastKnownTimeRef.current = currentTime;
      }

      /* ---------------- PLAYBACK START ---------------- */

      const started =
        (typeof currentTime === "number" && currentTime > 0) ||
        eventType === "play" ||
        eventType === "playing" ||
        eventType === "ready" ||
        eventType === "canplay" ||
        eventType === "loadeddata";

      if (started) {
        markPlaybackStarted();
      }

      /* ---------------- START THRESHOLD ---------------- */

      if (
        typeof currentTime === "number" &&
        !hasStartedRef.current &&
        currentTime >= START_THRESHOLD_SECONDS
      ) {
        hasStartedRef.current = true;
      }

      /* ---------------- PROGRESS ---------------- */

      if (
        intent.mediaType === "tv" &&
        typeof currentTime === "number" &&
        hasStartedRef.current
      ) {
        maybeQueueProgress(currentTime);
      }

      /* ---------------- NEXT EPISODE OVERLAY ---------------- */

      if (
        typeof currentTime === "number" &&
        hasNextEpisode &&
        typeof duration === "number" &&
        duration > 60 &&
        currentTime >= duration * NEXT_OVERLAY_THRESHOLD &&
        !showNextOverlayRef.current
      ) {
        showNextOverlayRef.current = true;

        requestAnimationFrame(() => {
          setShowNextOverlay(true);
        });
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    intent.mediaType,
    hasNextEpisode,
    maybeQueueProgress,
    markPlaybackStarted,
  ]);

  /* ------------------------------------------------------------------ */
  /* RESET (on intent change externally)                               */
  /* ------------------------------------------------------------------ */

  const resetPlaybackEvents = () => {
    hasStartedRef.current = false;
    showNextOverlayRef.current = false;
    lastEventTimeRef.current = Date.now();
    lastKnownTimeRef.current = 0;
    isScrubbingRef.current = false;
    setShowNextOverlay(false);
  };

  /* ------------------------------------------------------------------ */

  return {
    showNextOverlay,
    setShowNextOverlay,
    resetPlaybackEvents,

    /* exposed for watchdog */
    lastEventTimeRef,
    isScrubbingRef,
  };
}
