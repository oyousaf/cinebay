"use client";

import { useEffect, useRef } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

/* -------------------------------- CONFIG -------------------------------- */

const WATCHDOG_CHECK_INTERVAL_MS = 2500;
const WATCHDOG_SOFT_STALL_MS = 3000;
const WATCHDOG_HARD_STALL_MS = 6000;

/* ======================================================================== */

function providerSupportsPlaybackEvents(provider: ProviderType) {
  const p = String(provider).toLowerCase();
  return p.includes("vidlink") || p.includes("vidfast");
}

/* ======================================================================== */

export function useWatchdog({
  provider,
  lastEventTimeRef,
  isScrubbingRef,
  fallbackProvider,
  scheduleHideLoader,
  playbackStarted,
}: {
  provider: ProviderType;
  lastEventTimeRef: React.MutableRefObject<number>;
  isScrubbingRef: React.MutableRefObject<boolean>;
  fallbackProvider: (reason?: string) => void;
  scheduleHideLoader: (ms?: number) => void;
  playbackStarted: boolean;
}) {
  const watchdogIntervalRef = useRef<number | null>(null);

  /* ------------------------------------------------------------------ */
  /* CLEAR                                                              */
  /* ------------------------------------------------------------------ */

  const clearWatchdogInterval = () => {
    if (watchdogIntervalRef.current !== null) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  };

  /* ------------------------------------------------------------------ */
  /* WATCHDOG LOOP                                                      */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    clearWatchdogInterval();

    if (!providerSupportsPlaybackEvents(provider)) {
      return;
    }

    watchdogIntervalRef.current = window.setInterval(() => {
      if (!playbackStarted) return;

      const silence = Date.now() - lastEventTimeRef.current;

      /* soft stall → hide loader */
      if (silence >= WATCHDOG_SOFT_STALL_MS) {
        scheduleHideLoader(0);
      }

      /* hard stall while scrubbing → fallback */
      if (
        silence >= WATCHDOG_HARD_STALL_MS &&
        isScrubbingRef.current &&
        providerSupportsPlaybackEvents(provider)
      ) {
        fallbackProvider("scrub-stall");
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);

    return () => {
      clearWatchdogInterval();
    };
  }, [
    provider,
    playbackStarted,
    fallbackProvider,
    scheduleHideLoader,
    lastEventTimeRef,
    isScrubbingRef,
  ]);
}
