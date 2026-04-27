"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

/* CONFIG */

const WATCHDOG_CHECK_INTERVAL_MS = 2000;

const PRE_START_TIMEOUT_MS = 20000;
const STALL_FREEZE_WINDOW_MS = 15000;

const MIN_TIME_DELTA = 0.35;

const FALLBACK_COOLDOWN_MS = 20000;
const MAX_FALLBACKS = 2;

const END_PROTECTION_SECONDS = 90;

/* ======================================================================== */

type UseWatchdogParams = {
  provider: ProviderType;
  lastEventTimeRef: RefObject<number>;
  isScrubbingRef: RefObject<boolean>;
  isPlaybackActiveRef: RefObject<boolean>;
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
  isPlaybackActiveRef,
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

  useEffect(() => {
    lastFallbackAtRef.current = 0;
    fallbackCountRef.current = 0;

    lastProgressTimeRef.current = 0;
    lastProgressAtRef.current = Date.now();

    startTimeRef.current = Date.now();

    if (watchdogIntervalRef.current !== null) {
      clearInterval(watchdogIntervalRef.current);
    }

    watchdogIntervalRef.current = window.setInterval(() => {
      const now = Date.now();

      if (document.visibilityState === "hidden") return;

      const started = playbackStartedRef.current ?? false;
      const isScrubbing = isScrubbingRef.current ?? false;
      const isActive = isPlaybackActiveRef.current ?? false;
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

      const lastTime = lastProgressTimeRef.current;
      const delta = Math.abs(currentTime - lastTime);

      if (delta >= MIN_TIME_DELTA) {
        lastProgressTimeRef.current = currentTime;
        lastProgressAtRef.current = now;
      }

      if (currentTime > 1) {
        scheduleHideLoader(0);
      }

      /* ---------------- PRE-START ---------------- */

      if (!started) {
        if (!isActive) return;
        if (cooldown) return;
        if (fallbackCountRef.current >= MAX_FALLBACKS) return;

        if (now - startTimeRef.current >= PRE_START_TIMEOUT_MS) {
          lastFallbackAtRef.current = now;
          fallbackCountRef.current += 1;
          fallbackProvider("pre-start-timeout");
        }

        return;
      }

      /* ---------------- START GRACE PERIOD ---------------- */

      const justStarted = now - startTimeRef.current < 15000;

      if (justStarted) return;

      /* ---------------- STALL DETECTION ---------------- */

      if (!isActive) return;
      if (isScrubbing) return;
      if (nearEnd) return;
      if (cooldown) return;
      if (fallbackCountRef.current >= MAX_FALLBACKS) return;

      const noRecentEvents =
        now - lastEventTimeRef.current >= STALL_FREEZE_WINDOW_MS;

      const noProgress =
        now - lastProgressAtRef.current >= STALL_FREEZE_WINDOW_MS;

      const isStalled = noRecentEvents && noProgress;

      if (isStalled) {
        lastFallbackAtRef.current = now;
        fallbackCountRef.current += 1;
        fallbackProvider("stalled");
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
    lastEventTimeRef,
    isScrubbingRef,
    isPlaybackActiveRef,
    fallbackProvider,
    scheduleHideLoader,
    playbackStartedRef,
    lastKnownTimeRef,
    lastKnownDurationRef,
    runtimeSeconds,
  ]);
}
