"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* CONFIG */

const POLL_INTERVAL_MS = 1000;

const SCRUB_DELTA_SECONDS = 10;
const STABLE_DELTA_SECONDS = 2;
const SCRUB_RELEASE_MS = 800;

const OVERLAY_PROGRESS_THRESHOLD = 0.92;
const OVERLAY_REMAINING_SECONDS = 90;

const HARD_FALLBACK_NEAR_END_SECONDS = 25 * 60;
const STORAGE_TTL_MS = 5 * 60 * 1000;

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

  const rawCurrentTime =
    payload?.currentTime ??
    payload?.current_time ??
    payload?.time ??
    payload?.position ??
    payload?.playerState?.currentTime;

  const rawDuration =
    payload?.duration ??
    payload?.totalDuration ??
    payload?.length ??
    payload?.playerState?.duration;

  const rawEvent =
    msg?.event ??
    msg?.type ??
    payload?.event ??
    payload?.type ??
    payload?.name ??
    "";

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
  effectiveDuration?: number;
}) {
  const { ended, currentTime, effectiveDuration } = params;

  if (ended) return true;

  if (typeof effectiveDuration === "number" && effectiveDuration > 0) {
    const progress = currentTime / effectiveDuration;
    const remaining = effectiveDuration - currentTime;

    return (
      progress >= OVERLAY_PROGRESS_THRESHOLD ||
      remaining <= OVERLAY_REMAINING_SECONDS
    );
  }

  return currentTime >= HARD_FALLBACK_NEAR_END_SECONDS;
}

/* ======================================================================== */

export function usePlaybackEvents({
  iframeRef,
  markPlaybackStarted,
  intentKey,
  runtimeSeconds,
}: {
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  markPlaybackStarted: () => void;
  intentKey: string;
  runtimeSeconds?: number;
}) {
  const STORAGE_KEY = `omega-near-end:${intentKey}`;

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
  const nearEndRef = useRef(false);

  /* NEW */
  const isPlaybackActiveRef = useRef(false);
  const lastTickRef = useRef(Date.now());

  const getEffectiveDuration = useCallback(() => {
    if (typeof runtimeSeconds === "number" && runtimeSeconds > 0) {
      return runtimeSeconds;
    }

    const providerDuration = lastKnownDurationRef.current;
    if (typeof providerDuration === "number" && providerDuration > 0) {
      return providerDuration;
    }

    return undefined;
  }, [runtimeSeconds]);

  const persistOverlayState = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now() }));
    } catch {}
  }, [STORAGE_KEY]);

  const maybeShowOverlay = useCallback(() => {
    if (overlayShownRef.current || nearEndRef.current) return;

    const isNearEnd = shouldShowOverlay({
      ended: endedRef.current,
      currentTime: lastKnownTimeRef.current,
      effectiveDuration: getEffectiveDuration(),
    });

    if (!isNearEnd) return;

    nearEndRef.current = true;
    overlayShownRef.current = true;
    persistOverlayState();
    setShowNextOverlay(true);
  }, [getEffectiveDuration, persistOverlayState]);

  /* ---------------- MESSAGE HANDLER ---------------- */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPlayerOrigin(event.origin)) return;

      const now = Date.now();

      if (now - lastProcessedRef.current < 60) return;
      lastProcessedRef.current = now;

      const msg = safeMsgData(event.data);
      if (!msg) return;

      const { currentTime, duration, eventType } = extractPlayerMetrics(msg);

      lastEventTimeRef.current = now;

      if (typeof duration === "number" && duration > 0) {
        const prev = lastKnownDurationRef.current;
        if (!prev || Math.abs(duration - prev) < 120) {
          lastKnownDurationRef.current = duration;
        }
      }

      if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
        isPlaybackActiveRef.current = true;

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

        if (currentTime >= prev - 3) {
          lastKnownTimeRef.current = currentTime;
        }

        if (!hasStartedRef.current && lastKnownTimeRef.current > 0.3) {
          hasStartedRef.current = true;
          markPlaybackStarted();
        }
      }

      if (ENDED_EVENTS.has(eventType)) {
        endedRef.current = true;
      }

      maybeShowOverlay();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [markPlaybackStarted, maybeShowOverlay]);

  /* ---------------- PROVIDER POLL ---------------- */

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

  /* ---------------- SYNTHETIC TIME (ANTI-FREEZE) ---------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (now - lastEventTimeRef.current > 2000) {
        lastKnownTimeRef.current += delta;
      }

      maybeShowOverlay();
    }, 1000);

    return () => clearInterval(interval);
  }, [maybeShowOverlay]);

  /* ---------------- RESET ---------------- */

  const resetPlaybackEvents = useCallback(() => {
    lastKnownTimeRef.current = 0;
    lastKnownDurationRef.current = undefined;
    lastEventTimeRef.current = Date.now();

    hasStartedRef.current = false;
    endedRef.current = false;

    isScrubbingRef.current = false;
    lastScrubTimeRef.current = 0;

    isPlaybackActiveRef.current = false;

    lastProcessedRef.current = 0;
    overlayShownRef.current = false;
    nearEndRef.current = false;

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}

    setShowNextOverlay(false);
  }, [STORAGE_KEY]);

  return {
    showNextOverlay,
    lastKnownTimeRef,
    lastKnownDurationRef,
    lastEventTimeRef,
    hasStartedRef,
    endedRef,
    isScrubbingRef,
    isPlaybackActiveRef, // NEW
    resetPlaybackEvents,
  };
}
