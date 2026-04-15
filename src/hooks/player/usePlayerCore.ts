"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  buildEmbedUrl,
  PROVIDER_ORDER,
  type PlaybackIntent,
  type ProviderType,
} from "@/lib/embed/buildEmbedUrl";

/* -------------------------------- CONFIG -------------------------------- */

const LOADER_MIN_MS = 900;
const IFRAME_LOAD_TIMEOUT = 12000;
const THEME = "2dd4bf";

/* ======================================================================== */

export function usePlayerCore(intent: PlaybackIntent) {
  const [showLoader, setShowLoader] = useState(true);
  const [providerIndex, setProviderIndex] = useState(0);
  const [startAt, setStartAt] = useState(0);

  const providerIndexRef = useRef(0);
  const iframeLoadedRef = useRef(false);
  const playbackStartedRef = useRef(false);

  const iframeLoadTimerRef = useRef<number | null>(null);
  const loaderTimerRef = useRef<number | null>(null);

  const loadStartRef = useRef(0);

  const provider: ProviderType =
    PROVIDER_ORDER[providerIndex] ?? PROVIDER_ORDER[0];

  useEffect(() => {
    providerIndexRef.current = providerIndex;
  }, [providerIndex]);

  const embedUrl = useMemo(() => {
    return buildEmbedUrl(intent, {
      provider,
      startAt,
      autoplay: true,
      theme: THEME,
    });
  }, [intent, provider, startAt]);

  const clearLoaderTimer = useCallback(() => {
    if (loaderTimerRef.current !== null) {
      clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }
  }, []);

  const clearFailoverTimers = useCallback(() => {
    if (iframeLoadTimerRef.current !== null) {
      clearTimeout(iframeLoadTimerRef.current);
      iframeLoadTimerRef.current = null;
    }
  }, []);

  const scheduleHideLoader = useCallback(
    (minimumVisibleMs = LOADER_MIN_MS) => {
      clearLoaderTimer();

      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(minimumVisibleMs - elapsed, 0);

      loaderTimerRef.current = window.setTimeout(() => {
        setShowLoader(false);
      }, remaining);
    },
    [clearLoaderTimer],
  );

  const fallbackProvider = useCallback(
    (reason?: string) => {
      clearFailoverTimers();
      clearLoaderTimer();

      const current = providerIndexRef.current;
      const isLast = current >= PROVIDER_ORDER.length - 1;

      if (isLast) {
        console.warn("[PLAYER] all providers exhausted", { reason });
        scheduleHideLoader(LOADER_MIN_MS);
        return;
      }

      console.warn("[PLAYER] switching provider", {
        from: PROVIDER_ORDER[current],
        to: PROVIDER_ORDER[current + 1],
        reason,
      });

      iframeLoadedRef.current = false;
      playbackStartedRef.current = false;

      setShowLoader(true);
      setProviderIndex(current + 1);
    },
    [clearFailoverTimers, clearLoaderTimer, scheduleHideLoader],
  );

  const getIntentKey = (i: PlaybackIntent) =>
    i.mediaType === "tv"
      ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
      : `${i.tmdbId}-movie`;

  const intentKey = useMemo(() => getIntentKey(intent), [intent]);

  useEffect(() => {
    setProviderIndex(0);
    setShowLoader(true);
    setStartAt(0);

    playbackStartedRef.current = false;
    iframeLoadedRef.current = false;

    clearFailoverTimers();
    clearLoaderTimer();
  }, [intentKey, clearFailoverTimers, clearLoaderTimer]);

  useEffect(() => {
    clearFailoverTimers();
    clearLoaderTimer();

    loadStartRef.current = Date.now();
    setShowLoader(true);

    iframeLoadedRef.current = false;
    playbackStartedRef.current = false;

    iframeLoadTimerRef.current = window.setTimeout(() => {
      if (!iframeLoadedRef.current) {
        fallbackProvider("iframe-load-timeout");
      }
    }, IFRAME_LOAD_TIMEOUT);

    return () => {
      clearFailoverTimers();
      clearLoaderTimer();
    };
  }, [
    providerIndex,
    intentKey,
    fallbackProvider,
    clearFailoverTimers,
    clearLoaderTimer,
  ]);

  const onIframeLoad = useCallback(() => {
    iframeLoadedRef.current = true;

    if (iframeLoadTimerRef.current !== null) {
      clearTimeout(iframeLoadTimerRef.current);
      iframeLoadTimerRef.current = null;
    }

    // playback events are sparse or delayed. Let the watchdog judge real stalls.
    scheduleHideLoader(LOADER_MIN_MS);
  }, [scheduleHideLoader]);

  const markPlaybackStarted = useCallback(() => {
    if (!playbackStartedRef.current) {
      playbackStartedRef.current = true;
      clearFailoverTimers();
      scheduleHideLoader(LOADER_MIN_MS);
    }
  }, [clearFailoverTimers, scheduleHideLoader]);

  return {
    provider,
    providerIndex,
    embedUrl,
    showLoader,
    onIframeLoad,
    fallbackProvider,
    markPlaybackStarted,
    setStartAt,
    scheduleHideLoader,
    playbackStartedRef,
  };
}
