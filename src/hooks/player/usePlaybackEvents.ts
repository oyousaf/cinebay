"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------------------- CONFIG -------------------------------- */

const POLL_INTERVAL_MS = 1000;

const SCRUB_DELTA_SECONDS = 10;
const STABLE_DELTA_SECONDS = 2;
const SCRUB_RELEASE_MS = 800;

const OVERLAY_PROGRESS_THRESHOLD = 0.9;
const OVERLAY_REMAINING_SECONDS = 120;

const ENDED_EVENTS = new Set([
  "ended",
  "end",
  "complete",
  "completed",
  "finished",
]);

/* ======================================================================== */

function safeMsgData(data: unknown): Record<string, any> | null {
  if (!data) return null;

  if (typeof data === "object") return data as Record<string, any>;

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
  const payload = msg?.data && typeof msg.data === "object" ? msg.data : msg;

  const rawCurrentTime = payload?.currentTime ?? payload?.current_time;
  const rawDuration = payload?.duration ?? payload?.totalDuration;
  const rawEvent =
    msg?.event ?? msg?.type ?? payload?.event ?? payload?.type ?? "";

  return {
    currentTime:
      typeof rawCurrentTime === "number" ? rawCurrentTime : undefined,
    duration: typeof rawDuration === "number" ? rawDuration : undefined,
    eventType: String(rawEvent).toLowerCase().trim(),
  };
}

function shouldShowOverlay(params: {
  ended: boolean;
  currentTime: number;
  duration?: number;
}) {
  const { ended, currentTime, duration } = params;

  if (ended) return true;
  if (typeof duration !== "number" || duration <= 0) return false;

  const remaining = duration - currentTime;
  const progress = currentTime / duration;

  return (
    progress >= OVERLAY_PROGRESS_THRESHOLD ||
    remaining <= OVERLAY_REMAINING_SECONDS
  );
}

export function usePlaybackEvents({
  iframeRef,
  markPlaybackStarted,
}: {
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  markPlaybackStarted: () => void;
}) {
  const [showNextOverlay, setShowNextOverlay] = useState(false);

  const lastKnownTimeRef = useRef(0);
  const lastKnownDurationRef = useRef<number | undefined>(undefined);
  const lastEventTimeRef = useRef(Date.now());

  const hasStartedRef = useRef(false);
  const endedRef = useRef(false);

  const isScrubbingRef = useRef(false);
  const lastScrubTimeRef = useRef(0);

  const lastProcessedRef = useRef(0);
  const overlayShownRef = useRef(false);

  const maybeShowOverlay = () => {
    if (overlayShownRef.current) return;

    const shouldTrigger = shouldShowOverlay({
      ended: endedRef.current,
      currentTime: lastKnownTimeRef.current,
      duration: lastKnownDurationRef.current,
    });

    if (!shouldTrigger) return;

    overlayShownRef.current = true;
    setShowNextOverlay(true);
  };

  /* ------------------------------------------------------------------ */
  /* MESSAGE HANDLER                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPlayerOrigin(event.origin)) return;

      const now = Date.now();
      if (now - lastProcessedRef.current < 120) return;
      lastProcessedRef.current = now;

      const msg = safeMsgData(event.data);
      if (!msg) return;

      const { currentTime, duration, eventType } = extractPlayerMetrics(msg);

      lastEventTimeRef.current = now;

      /* -------- DURATION -------- */

      if (typeof duration === "number" && duration > 0) {
        const prev = lastKnownDurationRef.current;

        if (!prev || Math.abs(duration - prev) < 30) {
          lastKnownDurationRef.current = duration;
        }
      }

      /* -------- TIME -------- */

      if (typeof currentTime === "number") {
        const prev = lastKnownTimeRef.current;
        const delta = Math.abs(currentTime - prev);

        /* SCRUB DETECTION */

        if (delta >= SCRUB_DELTA_SECONDS) {
          isScrubbingRef.current = true;
          lastScrubTimeRef.current = now;
        } else if (
          isScrubbingRef.current &&
          now - lastScrubTimeRef.current >= SCRUB_RELEASE_MS &&
          delta <= STABLE_DELTA_SECONDS
        ) {
          isScrubbingRef.current = false;
        }

        /* MONOTONIC TIME PROTECTION */

        if (currentTime >= prev || Math.abs(currentTime - prev) < 5) {
          lastKnownTimeRef.current = currentTime;
        }

        /* START DETECTION */

        if (!hasStartedRef.current && currentTime > 1) {
          hasStartedRef.current = true;
          markPlaybackStarted();
        }
      }

      /* -------- ENDED -------- */

      if (ENDED_EVENTS.has(eventType)) {
        endedRef.current = true;
      }

      /* -------- OVERLAY TRIGGER -------- */

      maybeShowOverlay();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [markPlaybackStarted]);

  /* ------------------------------------------------------------------ */
  /* POLLING                                                            */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const interval = window.setInterval(() => {
      try {
        const target = iframeRef?.current?.contentWindow;
        if (!target) return;

        target.postMessage({ event: "getTime" }, "*");
        target.postMessage({ event: "getDuration" }, "*");
      } catch {}
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [iframeRef]);

  /* ------------------------------------------------------------------ */
  /* FAILSAFE OVERLAY CHECK                                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const interval = window.setInterval(() => {
      maybeShowOverlay();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  /* ------------------------------------------------------------------ */
  /* RESET                                                              */
  /* ------------------------------------------------------------------ */

  const resetPlaybackEvents = () => {
    lastKnownTimeRef.current = 0;
    lastKnownDurationRef.current = undefined;
    lastEventTimeRef.current = Date.now();

    hasStartedRef.current = false;
    endedRef.current = false;

    isScrubbingRef.current = false;
    lastScrubTimeRef.current = 0;

    lastProcessedRef.current = 0;
    overlayShownRef.current = false;

    setShowNextOverlay(false);
  };

  return {
    showNextOverlay,
    lastKnownTimeRef,
    lastKnownDurationRef,
    lastEventTimeRef,
    hasStartedRef,
    endedRef,
    isScrubbingRef,
    resetPlaybackEvents,
  };
}
