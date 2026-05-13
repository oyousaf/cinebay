"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

/* CONFIG */

const WATCHDOG_CHECK_INTERVAL_MS = 2000;

const PRE_START_TIMEOUT_MS = 20000;

const STALL_FREEZE_WINDOW_MS = 45000;

const FALLBACK_COOLDOWN_MS = 45000;
const MAX_FALLBACKS = 2;

const END_PROTECTION_SECONDS = 90;

const START_GRACE_PERIOD_MS = 15000;

/* ======================================================================== */

type UseWatchdogParams = {
  provider: ProviderType;

  lastEventTimeRef: RefObject<number>;
  lastRealProgressAtRef: RefObject<number>;

  isScrubbingRef: RefObject<boolean>;
  isPlaybackActiveRef: RefObject<boolean>;
  isPlaybackPausedRef: RefObject<boolean>;

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
  lastRealProgressAtRef,

  isScrubbingRef,
  isPlaybackActiveRef,
  isPlaybackPausedRef,

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

  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    lastFallbackAtRef.current = 0;
    fallbackCountRef.current = 0;

    startTimeRef.current = Date.now();

    if (watchdogIntervalRef.current !== null) {
      clearInterval(watchdogIntervalRef.current);
    }

    watchdogIntervalRef.current = window.setInterval(() => {
      const now = Date.now();

      if (document.visibilityState === "hidden") {
        return;
      }

      const started = playbackStartedRef.current ?? false;

      const isActive = isPlaybackActiveRef.current ?? false;
      const isPaused = isPlaybackPausedRef.current ?? false;
      const isScrubbing = isScrubbingRef.current ?? false;

      const currentTime = lastKnownTimeRef.current ?? 0;

      const effectiveDuration =
        typeof runtimeSeconds === "number" && runtimeSeconds > 0
          ? runtimeSeconds
          : lastKnownDurationRef.current;

      const nearEnd =
        typeof effectiveDuration === "number" &&
        effectiveDuration > 0 &&
        effectiveDuration - currentTime <= END_PROTECTION_SECONDS;

      const cooldown = now - lastFallbackAtRef.current < FALLBACK_COOLDOWN_MS;

      const tooManyFallbacks = fallbackCountRef.current >= MAX_FALLBACKS;

      /* ---------------- LOADER CLEANUP ---------------- */

      if (currentTime > 1) {
        scheduleHideLoader(0);
      }

      /* ---------------- PRE-START ---------------- */

      if (!started) {
        if (!isActive) return;
        if (cooldown) return;
        if (tooManyFallbacks) return;

        const timedOut = now - startTimeRef.current >= PRE_START_TIMEOUT_MS;

        if (timedOut) {
          lastFallbackAtRef.current = now;
          fallbackCountRef.current += 1;

          fallbackProvider("pre-start-timeout");
        }

        return;
      }

      /* ---------------- START GRACE ---------------- */

      const inStartGrace = now - startTimeRef.current < START_GRACE_PERIOD_MS;

      if (inStartGrace) {
        return;
      }

      /* ---------------- SAFETY EXITS ---------------- */

      if (!isActive) return;
      if (isPaused) return;
      if (isScrubbing) return;
      if (nearEnd) return;
      if (cooldown) return;
      if (tooManyFallbacks) return;

      /* ---------------- STALL DETECTION ---------------- */

      const noRecentEvents =
        now - lastEventTimeRef.current >= STALL_FREEZE_WINDOW_MS;

      const noRealProgress =
        now - lastRealProgressAtRef.current >= STALL_FREEZE_WINDOW_MS;

      const enoughPlaybackOccurred = currentTime > 5;

      const isStalled =
        noRecentEvents && noRealProgress && enoughPlaybackOccurred;

      if (!isStalled) return;

      console.warn("[WATCHDOG] playback stalled", {
        provider,
        currentTime,
        noRecentEvents,
        noRealProgress,
      });

      lastFallbackAtRef.current = now;
      fallbackCountRef.current += 1;

      fallbackProvider("stalled");
    }, WATCHDOG_CHECK_INTERVAL_MS);

    return () => {
      if (watchdogIntervalRef.current !== null) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
    };
  }, [
    provider,

    lastEventTimeRef,
    lastRealProgressAtRef,

    isScrubbingRef,
    isPlaybackActiveRef,
    isPlaybackPausedRef,

    fallbackProvider,
    scheduleHideLoader,

    playbackStartedRef,

    lastKnownTimeRef,
    lastKnownDurationRef,

    runtimeSeconds,
  ]);
}
