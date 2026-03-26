"use client";

import { useEffect, useRef } from "react";
import type { ProviderType } from "@/lib/embed/buildEmbedUrl";

const WATCHDOG_CHECK_INTERVAL_MS = 2500;
const WATCHDOG_SOFT_STALL_MS = 3000;
const WATCHDOG_HARD_STALL_MS = 6000;

function providerSupportsPlaybackEvents(provider: ProviderType) {
  const p = String(provider).toLowerCase();
  return p.includes("vidlink") || p.includes("vidfast");
}

export function useWatchdog({
  provider,
  lastEventTimeRef,
  isScrubbingRef,
  fallbackProvider,
  scheduleHideLoader,
  playbackStartedRef,
}: {
  provider: ProviderType;
  lastEventTimeRef: React.MutableRefObject<number>;
  isScrubbingRef: React.MutableRefObject<boolean>;
  fallbackProvider: (reason?: string) => void;
  scheduleHideLoader: (ms?: number) => void;
  playbackStartedRef: React.MutableRefObject<boolean>;
}) {
  const watchdogIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!providerSupportsPlaybackEvents(provider)) return;

    watchdogIntervalRef.current = window.setInterval(() => {
      if (!playbackStartedRef.current) return;

      const silence = Date.now() - lastEventTimeRef.current;

      // soft stall → hide loader only
      if (silence >= WATCHDOG_SOFT_STALL_MS) {
        scheduleHideLoader(0);
      }
      if (isScrubbingRef.current) return;

      // hard stall → real failure
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
  ]);
}
