"use client";

import { useEffect, useRef, type RefObject } from "react";
import { PROVIDER_ORDER, type ProviderType } from "@/lib/embed/buildEmbedUrl";

const WATCHDOG_CHECK_INTERVAL_MS = 2000;

const PRE_START_TIMEOUT_MS = 20000;
const STALL_FREEZE_WINDOW_MS = 20000;

const REAL_MESSAGE_RECENT_MS = 6000;

const FALLBACK_COOLDOWN_MS = 30000;
const MAX_FALLBACKS = 2;

const END_PROTECTION_SECONDS = 90;

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
  const intervalRef = useRef<number | null>(null);
  const lastFallbackAtRef = useRef(0);
  const fallbackCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    lastFallbackAtRef.current = 0;
    fallbackCountRef.current = 0;
    startTimeRef.current = Date.now();

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      const now = Date.now();

      if (document.visibilityState === "hidden") return;

      const finalProvider =
        provider === PROVIDER_ORDER[PROVIDER_ORDER.length - 1];

      const started = playbackStartedRef.current ?? false;
      const active = isPlaybackActiveRef.current ?? false;
      const paused = isPlaybackPausedRef.current ?? false;
      const scrubbing = isScrubbingRef.current ?? false;
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

      if (currentTime > 1 && started) {
        scheduleHideLoader(0);
      }

      if (finalProvider) {
        return;
      }

      if (!started) {
        if (cooldown) return;
        if (fallbackCountRef.current >= MAX_FALLBACKS) return;

        if (now - startTimeRef.current >= PRE_START_TIMEOUT_MS) {
          lastFallbackAtRef.current = now;
          fallbackCountRef.current += 1;
          fallbackProvider("pre-start-timeout");
        }

        return;
      }

      if (!active) return;
      if (paused) return;
      if (scrubbing) return;
      if (nearEnd) return;
      if (cooldown) return;
      if (fallbackCountRef.current >= MAX_FALLBACKS) return;

      const providerStillTalking =
        now - lastEventTimeRef.current <= REAL_MESSAGE_RECENT_MS;

      const noRealProgress =
        now - lastRealProgressAtRef.current >= STALL_FREEZE_WINDOW_MS;

      if (providerStillTalking && noRealProgress && currentTime > 5) {
        lastFallbackAtRef.current = now;
        fallbackCountRef.current += 1;
        fallbackProvider("real-time-frozen");
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
