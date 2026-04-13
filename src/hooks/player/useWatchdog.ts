"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

/* CONFIG */

const WATCHDOG_CHECK_INTERVAL_MS = 2500;

// Before playback starts
const PRE_START_TIMEOUT_MS = 15000;

// After playback starts
const POST_START_SILENT_MS = 15000;

// Real stall detection
const STALL_FREEZE_WINDOW_MS = 10000;
const MIN_TIME_DELTA = 0.5;

// Grace windows
const START_GRACE_MS = 8000;
const SCRUB_GRACE_MS = 5000;

// Prevent rapid provider flipping
const FALLBACK_COOLDOWN_MS = 10000;

const MAX_FALLBACKS = 3;
const END_PROTECTION_SECONDS = 30;

function providerSupportsPlaybackEvents(provider: ProviderType) {
  const p = String(provider).toLowerCase();
  return p.includes("vidlink") || p.includes("vidfast");
}

type UseWatchdogParams = {
  provider: ProviderType;
  lastEventTimeRef: RefObject<number>;
  isScrubbingRef: RefObject<boolean>;
  fallbackProvider: (reason?: string) => void;
  scheduleHideLoader: (ms?: number) => void;
  playbackStartedRef: RefObject<boolean>;
  lastKnownTimeRef: RefObject<number>;
  lastKnownDurationRef: RefObject<number | undefined>;
};

export function useWatchdog({
  provider,
  lastEventTimeRef,
  isScrubbingRef,
  fallbackProvider,
  scheduleHideLoader,
  playbackStartedRef,
  lastKnownTimeRef,
  lastKnownDurationRef,
}: UseWatchdogParams) {
  const watchdogIntervalRef = useRef<number | null>(null);

  const lastFallbackAtRef = useRef(0);
  const fallbackCountRef = useRef(0);

  const lastProgressTimeRef = useRef(0);
  const lastProgressAtRef = useRef(Date.now());

  const startTimeRef = useRef(Date.now());
  const lastScrubAtRef = useRef(0);

  const isBufferingRef = useRef(false);

  useEffect(() => {
    const supportsEvents = providerSupportsPlaybackEvents(provider);

    if (!supportsEvents) {
      if (watchdogIntervalRef.current !== null) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
      return;
    }

    lastFallbackAtRef.current = 0;
    fallbackCountRef.current = 0;

    lastProgressTimeRef.current = 0;
    lastProgressAtRef.current = Date.now();

    startTimeRef.current = Date.now();
    lastScrubAtRef.current = 0;

    isBufferingRef.current = false;

    if (watchdogIntervalRef.current !== null) {
      clearInterval(watchdogIntervalRef.current);
    }

    watchdogIntervalRef.current = window.setInterval(() => {
      const now = Date.now();

      if (document.visibilityState === "hidden") return;

      const isScrubbing = isScrubbingRef.current ?? false;

      if (isScrubbing) {
        lastScrubAtRef.current = now;
        return;
      }

      const started = playbackStartedRef.current;

      const lastEventAt = lastEventTimeRef.current ?? now;
      const silence = now - lastEventAt;

      const currentTime = lastKnownTimeRef.current ?? 0;
      const duration = lastKnownDurationRef.current;

      /* PRE-START */

      if (!started) {
        const cooldown = now - lastFallbackAtRef.current < FALLBACK_COOLDOWN_MS;

        if (silence >= PRE_START_TIMEOUT_MS && !cooldown) {
          lastFallbackAtRef.current = now;
          fallbackProvider("pre-start-stall");
        }

        return;
      }

      /* BUFFERING DETECTION */

      const recentlyActive = silence < 4000;

      if (
        recentlyActive &&
        Math.abs(currentTime - lastProgressTimeRef.current) < 0.1
      ) {
        isBufferingRef.current = true;
      } else if (
        Math.abs(currentTime - lastProgressTimeRef.current) >= MIN_TIME_DELTA
      ) {
        isBufferingRef.current = false;
      }

      /* TRACK PROGRESSION */

      const lastTime = lastProgressTimeRef.current;

      if (Math.abs(currentTime - lastTime) >= MIN_TIME_DELTA) {
        lastProgressTimeRef.current = currentTime;
        lastProgressAtRef.current = now;
      }

      const freezeDuration = now - lastProgressAtRef.current;

      /* GRACE WINDOWS */

      const inStartGrace = now - startTimeRef.current < START_GRACE_MS;
      const inScrubGrace = now - lastScrubAtRef.current < SCRUB_GRACE_MS;

      /* UI CLEANUP */

      if (silence >= POST_START_SILENT_MS) {
        scheduleHideLoader(0);
      }

      /* END PROTECTION */

      const nearEnd =
        typeof duration === "number" &&
        duration > 0 &&
        duration - currentTime <= END_PROTECTION_SECONDS;

      /* MULTI-SIGNAL STALL */

      const cooldown = now - lastFallbackAtRef.current < FALLBACK_COOLDOWN_MS;

      const shouldFallback =
        freezeDuration >= STALL_FREEZE_WINDOW_MS &&
        !isBufferingRef.current &&
        !inStartGrace &&
        !inScrubGrace &&
        !cooldown &&
        !nearEnd &&
        fallbackCountRef.current < MAX_FALLBACKS;

      if (shouldFallback) {
        lastFallbackAtRef.current = now;
        fallbackCountRef.current += 1;

        fallbackProvider("time-frozen");
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);

    return () => {
      if (watchdogIntervalRef.current !== null) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
    };
  }, [
    provider,
    fallbackProvider,
    scheduleHideLoader,
    lastEventTimeRef,
    isScrubbingRef,
    playbackStartedRef,
    lastKnownTimeRef,
    lastKnownDurationRef,
  ]);
}
