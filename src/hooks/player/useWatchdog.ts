"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

/* -------------------------------- CONFIG -------------------------------- */

const WATCHDOG_CHECK_INTERVAL_MS = 2500;

// Before playback starts
const PRE_START_TIMEOUT_MS = 15000;

// After playback starts
const POST_START_SILENT_MS = 15000;

// Prevent rapid provider flipping
const FALLBACK_COOLDOWN_MS = 10000;

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
};

export function useWatchdog({
  provider,
  lastEventTimeRef,
  isScrubbingRef,
  fallbackProvider,
  scheduleHideLoader,
  playbackStartedRef,
}: UseWatchdogParams) {
  const watchdogIntervalRef = useRef<number | null>(null);
  const lastFallbackAtRef = useRef(0);
  const hasFallenBackRef = useRef(false);

  useEffect(() => {
    const supportsEvents = providerSupportsPlaybackEvents(provider);

    if (!supportsEvents) {
      if (watchdogIntervalRef.current !== null) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
      return;
    }

    // reset per provider
    hasFallenBackRef.current = false;
    lastFallbackAtRef.current = 0;

    if (watchdogIntervalRef.current !== null) {
      clearInterval(watchdogIntervalRef.current);
    }

    watchdogIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const lastEventAt = lastEventTimeRef.current ?? now;
      const silence = now - lastEventAt;

      const isScrubbing = isScrubbingRef.current ?? false;
      const started = playbackStartedRef.current;

      if (document.visibilityState === "hidden") return;
      if (isScrubbing) return;

      /* ===================================================== */
      /* PRE-START: aggressive recovery                        */
      /* ===================================================== */

      if (!started) {
        const cooldown = now - lastFallbackAtRef.current < FALLBACK_COOLDOWN_MS;

        if (
          silence >= PRE_START_TIMEOUT_MS &&
          !hasFallenBackRef.current &&
          !cooldown
        ) {
          hasFallenBackRef.current = true;
          lastFallbackAtRef.current = now;

          fallbackProvider("pre-start-stall");
        }

        return;
      }

      /* ===================================================== */
      /* POST-START: do NOT fallback on silence                */
      /* ===================================================== */

      if (silence >= POST_START_SILENT_MS) {
        // Just ensure UI is clean
        scheduleHideLoader(0);
      }

      // No fallback here. Silent providers are normal.
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
  ]);
}
