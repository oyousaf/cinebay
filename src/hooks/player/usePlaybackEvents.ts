"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------------------- CONFIG -------------------------------- */

const START_THRESHOLD_SECONDS = 30;
const NEAR_END_SECONDS = 180;

const SCRUB_DELTA_SECONDS = 10;
const STABLE_DELTA_SECONDS = 2;
const SCRUB_RELEASE_MS = 800;

const POLL_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 800;

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

/* ======================================================================== */

export function usePlaybackEvents({
  intent,
  hasNextEpisode,
  maybeQueueProgress,
  markPlaybackStarted,
  iframeRef,
}: {
  intent: { mediaType: "movie" | "tv" };
  hasNextEpisode: boolean;
  maybeQueueProgress: (t: number) => void;
  markPlaybackStarted: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [showNextOverlay, setShowNextOverlay] = useState(false);

  const hasStartedRef = useRef(false);
  const hasNextEpisodeRef = useRef(hasNextEpisode);
  const mountedRef = useRef(true);

  const lastEventTimeRef = useRef(Date.now());
  const lastKnownTimeRef = useRef(0);
  const lastKnownDurationRef = useRef<number | undefined>(undefined);

  const internalTimeRef = useRef(0);

  const isScrubbingRef = useRef(false);
  const lastScrubTimeRef = useRef(0);

  const lastProcessedRef = useRef(0);
  const pollIntervalRef = useRef<number | null>(null);
  const internalTimerRef = useRef<number | null>(null);

  /* ---------- LATCHED END STATE ---------- */

  const endStateRef = useRef(false);

  /* ---------------- STATE SYNC ---------------- */

  useEffect(() => {
    hasNextEpisodeRef.current = hasNextEpisode;
  }, [hasNextEpisode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------------- INTERNAL TIMER ---------------- */

  useEffect(() => {
    if (internalTimerRef.current !== null) {
      clearInterval(internalTimerRef.current);
    }

    internalTimerRef.current = window.setInterval(() => {
      if (!hasStartedRef.current) return;

      internalTimeRef.current += 1;

      if (
        Date.now() - lastEventTimeRef.current > 4000 &&
        lastKnownTimeRef.current === 0
      ) {
        lastKnownTimeRef.current = internalTimeRef.current;
      }
    }, 1000);

    return () => {
      if (internalTimerRef.current !== null) {
        clearInterval(internalTimerRef.current);
      }
    };
  }, []);

  /* ---------------- MESSAGE HANDLER ---------------- */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPlayerOrigin(event.origin)) return;

      const now = Date.now();
      if (now - lastProcessedRef.current < 150) return;
      lastProcessedRef.current = now;

      const msg = safeMsgData(event.data);
      if (!msg) return;

      const { currentTime, duration, eventType } = extractPlayerMetrics(msg);

      lastEventTimeRef.current = now;

      if (typeof duration === "number" && duration > 0) {
        lastKnownDurationRef.current = duration;
      }

      if (typeof currentTime === "number") {
        const delta = Math.abs(currentTime - lastKnownTimeRef.current);

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

        lastKnownTimeRef.current = currentTime;
      }

      /* ---------- START ---------- */

      const started =
        (typeof currentTime === "number" && currentTime > 0) ||
        eventType === "play" ||
        eventType === "playing" ||
        eventType === "ready";

      if (started) {
        markPlaybackStarted();
        hasStartedRef.current = true;
      }

      if (
        typeof currentTime === "number" &&
        !hasStartedRef.current &&
        currentTime >= START_THRESHOLD_SECONDS
      ) {
        hasStartedRef.current = true;
      }

      /* ---------- PROGRESS ---------- */

      if (
        intent.mediaType === "tv" &&
        typeof currentTime === "number" &&
        hasStartedRef.current &&
        !isScrubbingRef.current
      ) {
        maybeQueueProgress(currentTime);
      }

      /* ---------- END STATE ENTRY ---------- */

      const time = lastKnownTimeRef.current;
      const durationSafe = lastKnownDurationRef.current;

      const isNearEnd =
        typeof durationSafe === "number" && durationSafe > 60
          ? durationSafe - time <= NEAR_END_SECONDS
          : time >= 900;

      if (isNearEnd) {
        endStateRef.current = true;
      }

      if (ENDED_EVENTS.has(eventType)) {
        endStateRef.current = true;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [intent.mediaType, maybeQueueProgress, markPlaybackStarted]);

  /* ---------------- HEARTBEAT (CRITICAL) ---------------- */

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!hasStartedRef.current) return;
      if (!hasNextEpisodeRef.current) return;

      const time = lastKnownTimeRef.current;
      const duration = lastKnownDurationRef.current;

      const isNearEnd =
        typeof duration === "number" && duration > 60
          ? duration - time <= NEAR_END_SECONDS
          : time >= 900;

      if (isNearEnd) {
        endStateRef.current = true;
      }

      if (endStateRef.current && mountedRef.current) {
        setShowNextOverlay(true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- POLLING ---------------- */

  useEffect(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(() => {
      try {
        const target = iframeRef?.current?.contentWindow;
        if (!target) return;

        target.postMessage({ event: "getTime" }, "*");
        target.postMessage({ event: "getDuration" }, "*");
      } catch {}
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [iframeRef]);

  /* ---------------- RESET ---------------- */

  const resetPlaybackEvents = () => {
    hasStartedRef.current = false;
    lastEventTimeRef.current = Date.now();
    lastKnownTimeRef.current = 0;
    lastKnownDurationRef.current = undefined;
    internalTimeRef.current = 0;
    isScrubbingRef.current = false;
    lastScrubTimeRef.current = 0;
    lastProcessedRef.current = 0;

    endStateRef.current = false;

    setShowNextOverlay(false);
  };

  useEffect(() => {
    resetPlaybackEvents();
  }, [intent]);

  return {
    showNextOverlay,
    setShowNextOverlay,
    resetPlaybackEvents,
    lastEventTimeRef,
    isScrubbingRef,
    lastKnownTimeRef,
    lastKnownDurationRef,
  };
}
