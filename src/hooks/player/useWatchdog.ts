"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

/* CONFIG */

const WATCHDOG_CHECK_INTERVAL_MS = 2000;

const PRE_START_TIMEOUT_MS = 20000;

// after playback starts
const STALL_FREEZE_WINDOW_MS = 20000;

const MIN_TIME_DELTA = 0.35;

const START_GRACE_MS = 12000;
const SCRUB_GRACE_MS = 6000;

const FALLBACK_COOLDOWN_MS = 20000;
const MAX_FALLBACKS = 2;

const END_PROTECTION_SECONDS = 90;

/* ======================================================================== */

type UseWatchdogParams = {
  provider: ProviderType;
  lastEventTimeRef: RefObject<number>;
  isScrubbingRef: RefObject<boolean>;
  fallbackProvider: (reason?: string) => void;
  scheduleHideLoader: (ms?: number) => void;
  playbackStartedRef: RefObject<boolean>;
  lastKnownTimeRef: RefObject<number>;
  lastKnownDurationRef: RefObject<number | undefined>;
  runtimeSeconds?: number;
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
  runtimeSeconds,
}: UseWatchdogParams) {
  const watchdogIntervalRef = useRef<number | null>(null);

  const lastFallbackAtRef = useRef(0);
  const fallbackCountRef = useRef(0);

  const lastProgressTimeRef = useRef(0);
  const lastProgressAtRef = useRef(Date.now());

  const startTimeRef = useRef(Date.now());
  const lastScrubAtRef = useRef(0);

  useEffect(() => {
    lastFallbackAtRef.current = 0;
    fallbackCountRef.current = 0;

    lastProgressTimeRef.current = 0;
    lastProgressAtRef.current = Date.now();

    startTimeRef.current = Date.now();
    lastScrubAtRef.current = 0;

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
      const currentTime = lastKnownTimeRef.current ?? 0;

      const effectiveDuration =
        typeof runtimeSeconds === "number" && runtimeSeconds > 0
          ? runtimeSeconds
          : lastKnownDurationRef.current;

      const lastTime = lastProgressTimeRef.current;
      const delta = Math.abs(currentTime - lastTime);

      if (delta >= MIN_TIME_DELTA) {
        lastProgressTimeRef.current = currentTime;
        lastProgressAtRef.current = now;
      }

      const freezeDuration = now - lastProgressAtRef.current;

      const inStartGrace = now - startTimeRef.current < START_GRACE_MS;
      const inScrubGrace = now - lastScrubAtRef.current < SCRUB_GRACE_MS;

      const nearEnd =
        typeof effectiveDuration === "number" &&
        effectiveDuration > 0 &&
        effectiveDuration - currentTime <= END_PROTECTION_SECONDS;

      const cooldown = now - lastFallbackAtRef.current < FALLBACK_COOLDOWN_MS;

      /* ---------------- PRE-START ---------------- */

      if (!started) {
        if (
          now - startTimeRef.current >= PRE_START_TIMEOUT_MS &&
          !cooldown
        ) {
          lastFallbackAtRef.current = now;
          fallbackCountRef.current += 1;
          fallbackProvider("pre-start-timeout");
        }
        return;
      }

      /* ---------------- CLEAN LOADER ---------------- */

      if (currentTime > 1) {
        scheduleHideLoader(0);
      }

      /* ---------------- STALL DETECTION ---------------- */

      const shouldFallback =
        freezeDuration >= STALL_FREEZE_WINDOW_MS &&
        !inStartGrace &&
        !inScrubGrace &&
        !nearEnd &&
        !cooldown &&
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
    runtimeSeconds,
  ]);
}