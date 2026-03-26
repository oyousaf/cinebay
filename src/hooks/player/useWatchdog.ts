"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

/* -------------------------------- CONFIG -------------------------------- */

const WATCHDOG_CHECK_INTERVAL_MS = 2500;
const WATCHDOG_SOFT_STALL_MS = 3000;
const WATCHDOG_HARD_STALL_MS = 6000;

const NEAR_END_SECONDS = 120;
const FALLBACK_PERCENT = 0.9;

/* ======================================================================== */

function providerSupportsPlaybackEvents(provider: ProviderType) {
  const p = String(provider).toLowerCase();
  return p.includes("vidlink") || p.includes("vidfast");
}

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

  useEffect(() => {
    const supportsEvents = providerSupportsPlaybackEvents(provider);

    if (!supportsEvents) {
      if (watchdogIntervalRef.current !== null) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
      return;
    }

    if (watchdogIntervalRef.current !== null) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }

    watchdogIntervalRef.current = window.setInterval(() => {
      if (!playbackStartedRef.current) return;

      const now = Date.now();
      const lastEventAt = lastEventTimeRef.current ?? now;
      const silence = now - lastEventAt;

      const isScrubbing = isScrubbingRef.current ?? false;
      const currentTime = lastKnownTimeRef.current;
      const duration = lastKnownDurationRef.current;

      /* ---------------- NEAR END DETECTION ---------------- */

      let isNearEnd = false;

      if (
        typeof currentTime === "number" &&
        typeof duration === "number" &&
        duration > 60
      ) {
        const remaining = duration - currentTime;

        if (remaining <= NEAR_END_SECONDS) {
          isNearEnd = true;
        }

        if (currentTime >= duration * FALLBACK_PERCENT) {
          isNearEnd = true;
        }
      }

      /* ---------------- SOFT STALL ---------------- */

      if (silence >= WATCHDOG_SOFT_STALL_MS) {
        scheduleHideLoader(0);
      }

      /* ---------------- GUARDS ---------------- */

      if (isScrubbing) return;
      if (isNearEnd) return;

      /* ---------------- HARD STALL ---------------- */

      if (silence >= WATCHDOG_HARD_STALL_MS) {
        fallbackProvider("hard-stall");
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
