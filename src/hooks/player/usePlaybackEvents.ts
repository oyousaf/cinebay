"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------------------- CONFIG -------------------------------- */

const START_THRESHOLD_SECONDS = 30;
const NEXT_OVERLAY_THRESHOLD = 0.9;

const SCRUB_DELTA_SECONDS = 5;
const STABLE_DELTA_SECONDS = 2;
const SCRUB_RELEASE_MS = 800;

const POLL_INTERVAL_MS = 1000;
const NEXT_OVERLAY_FALLBACK_SECONDS = 1200;

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
  iframeRef,
}: {
  intent: {
    mediaType: "movie" | "tv";
  };
  hasNextEpisode: boolean;
  maybeQueueProgress: (t: number) => void;
  markPlaybackStarted: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [showNextOverlay, setShowNextOverlay] = useState(false);

  const hasStartedRef = useRef(false);
  const showNextOverlayRef = useRef(false);

  const hasNextEpisodeRef = useRef(hasNextEpisode);
  const mountedRef = useRef(true);

  const lastEventTimeRef = useRef(Date.now());
  const lastKnownTimeRef = useRef(0);
  const lastKnownDurationRef = useRef<number | undefined>(undefined);

  const isScrubbingRef = useRef(false);
  const lastScrubTimeRef = useRef(0);

  const lastProcessedRef = useRef(0);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    hasNextEpisodeRef.current = hasNextEpisode;
  }, [hasNextEpisode]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const openNextOverlay = () => {
      if (showNextOverlayRef.current) return;

      showNextOverlayRef.current = true;

      if (mountedRef.current) {
        setShowNextOverlay(true);
      }
    };

    const maybeShowNextOverlay = (currentTime?: number, duration?: number) => {
      if (showNextOverlayRef.current) return;

      if (typeof currentTime !== "number" || !hasNextEpisodeRef.current) {
        return;
      }

      const nearEnd =
        typeof duration === "number" &&
        duration > 60 &&
        currentTime >= duration * NEXT_OVERLAY_THRESHOLD;

      const fallback = currentTime >= NEXT_OVERLAY_FALLBACK_SECONDS;

      if (nearEnd || fallback) {
        openNextOverlay();
      }
    };

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
        const prev = lastKnownTimeRef.current;
        const delta = Math.abs(currentTime - prev);

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

      if (!hasStartedRef.current) {
        if (
          (typeof currentTime === "number" && currentTime > 5) ||
          eventType === "playing"
        ) {
          hasStartedRef.current = true;
        }
      }

      if (
        intent.mediaType === "tv" &&
        typeof currentTime === "number" &&
        hasStartedRef.current &&
        !isScrubbingRef.current
      ) {
        maybeQueueProgress(currentTime);
      }

      maybeShowNextOverlay(
        currentTime,
        typeof duration === "number" ? duration : lastKnownDurationRef.current,
      );
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [intent.mediaType, maybeQueueProgress, markPlaybackStarted]);

  useEffect(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    pollIntervalRef.current = window.setInterval(() => {
      try {
        const target = iframeRef?.current?.contentWindow;
        if (!target) return;

        target.postMessage({ event: "getTime" }, "*");
        target.postMessage({ type: "getTime" }, "*");
        target.postMessage(JSON.stringify({ event: "getTime" }), "*");

        target.postMessage({ event: "getDuration" }, "*");
        target.postMessage({ type: "getDuration" }, "*");
        target.postMessage(JSON.stringify({ event: "getDuration" }), "*");
      } catch {}
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [iframeRef]);

  const resetPlaybackEvents = () => {
    hasStartedRef.current = false;
    showNextOverlayRef.current = false;
    lastEventTimeRef.current = Date.now();
    lastKnownTimeRef.current = 0;
    lastKnownDurationRef.current = undefined;
    isScrubbingRef.current = false;
    lastScrubTimeRef.current = 0;
    lastProcessedRef.current = 0;
    setShowNextOverlay(false);
  };

  return {
    showNextOverlay,
    setShowNextOverlay,
    resetPlaybackEvents,
    lastEventTimeRef,
    isScrubbingRef,
  };
}
