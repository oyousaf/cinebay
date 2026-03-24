"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { X, Play, LoaderCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  buildEmbedUrl,
  PROVIDER_ORDER,
  type PlaybackIntent,
  type ProviderType,
} from "@/lib/embed/buildEmbedUrl";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { fetchSeasonEpisodes } from "@/lib/tmdb";
import { useNavigation } from "@/context/NavigationContext";

/* -------------------------------- CONFIG -------------------------------- */

const LOADER_MIN_MS = 900;

/* Hard fail only if iframe itself never loads */
const IFRAME_LOAD_TIMEOUT = 12000;

/*
  Event-driven playback timeout.
  Used only for providers that actually emit progress / playback events.
  Give them more breathing room before failover.
*/
const EVENT_PLAYBACK_START_TIMEOUT = 22000;

const START_THRESHOLD_SECONDS = 30;
const NEXT_OVERLAY_THRESHOLD = 0.9;

/* Progress batching */
const PROGRESS_QUEUE_STEP_SECONDS = 15;
const PROGRESS_FLUSH_INTERVAL_MS = 30000;

/* Watchdog */
const WATCHDOG_CHECK_INTERVAL_MS = 2500;
const WATCHDOG_SOFT_STALL_MS = 4000;
const WATCHDOG_HARD_STALL_MS = 12000;
const SCRUB_DELTA_SECONDS = 5;
const STABLE_DELTA_SECONDS = 1;

const playbackConfirmedAtRef = useRef<number | null>(null);

const THEME = "2dd4bf";

/* -------------------------------- TYPES -------------------------------- */

type SeasonEpisode = {
  episode_number: number;
  name?: string;
};

type PendingProgress = {
  tmdbId: number;
  season: number;
  episode: number;
  position: number;
} | null;

/* -------------------------------- CACHE -------------------------------- */

const seasonEpisodesCache = new Map<string, SeasonEpisode[]>();

function getSeasonCacheKey(tmdbId: number, season: number) {
  return `${tmdbId}-season-${season}`;
}

async function getSeasonEpisodesCached(
  tmdbId: number,
  season: number,
): Promise<SeasonEpisode[]> {
  const key = getSeasonCacheKey(tmdbId, season);

  if (seasonEpisodesCache.has(key)) {
    return seasonEpisodesCache.get(key)!;
  }

  try {
    const eps = await fetchSeasonEpisodes(tmdbId, season);
    const safe = Array.isArray(eps) ? (eps as SeasonEpisode[]) : [];
    seasonEpisodesCache.set(key, safe);
    return safe;
  } catch {
    return [];
  }
}

function prefetchSeasonEpisodes(tmdbId: number, season: number) {
  const key = getSeasonCacheKey(tmdbId, season);
  if (seasonEpisodesCache.has(key)) return;
  void getSeasonEpisodesCached(tmdbId, season);
}

/* -------------------------------- HELPERS -------------------------------- */

function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

function safeMsgData(data: unknown): Record<string, any> | null {
  if (!data) return null;

  if (typeof data === "object") {
    return data as Record<string, any>;
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === "object" && parsed ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

function isPlayerOrigin(origin: string) {
  if (!origin) return false;

  const o = origin.toLowerCase();

  return (
    o.includes("vidlink") ||
    o.includes("vidfast") ||
    o.includes("multiembed") ||
    o.includes("embed")
  );
}

function providerSupportsPlaybackEvents(provider: ProviderType) {
  const p = String(provider).toLowerCase();
  return p.includes("vidlink") || p.includes("vidfast");
}

function extractPlayerMetrics(msg: Record<string, any>) {
  const payload =
    msg?.data && typeof msg.data === "object" ? msg.data : (msg ?? {});

  const rawCurrentTime = payload?.currentTime ?? payload?.current_time;
  const rawDuration = payload?.duration ?? payload?.totalDuration;
  const rawEvent =
    msg?.event ?? msg?.type ?? payload?.event ?? payload?.type ?? "";

  const currentTime =
    typeof rawCurrentTime === "number" ? rawCurrentTime : undefined;

  const duration = typeof rawDuration === "number" ? rawDuration : undefined;

  const eventType = String(rawEvent).toLowerCase();

  return { currentTime, duration, eventType };
}

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext?: (intent: PlaybackIntent) => void;
}

/* ======================================================================== */

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [providerIndex, setProviderIndex] = useState(0);

  const [episodeTitle, setEpisodeTitle] = useState("");
  const [nextEpisodeTitle, setNextEpisodeTitle] = useState("");

  const [hasNextEpisode, setHasNextEpisode] = useState(false);

  const [nextSeasonFirst, setNextSeasonFirst] = useState<{
    season: number;
    episode: number;
  } | null>(null);

  const [showNextOverlay, setShowNextOverlay] = useState(false);

  const iframeLoadTimerRef = useRef<number | null>(null);
  const playbackStartTimerRef = useRef<number | null>(null);
  const loaderTimerRef = useRef<number | null>(null);
  const progressFlushIntervalRef = useRef<number | null>(null);
  const watchdogIntervalRef = useRef<number | null>(null);

  const loadStartRef = useRef(0);

  const iframeLoadedRef = useRef(false);
  const playbackStartedRef = useRef(false);
  const providerIndexRef = useRef(0);

  const startAtRef = useRef(0);

  const hasStartedRef = useRef(false);
  const lastQueuedProgressRef = useRef(0);
  const pendingProgressRef = useRef<PendingProgress>(null);

  const showNextOverlayRef = useRef(false);
  const mountedRef = useRef(false);

  const lastEventTimeRef = useRef(Date.now());
  const lastKnownTimeRef = useRef(0);
  const isScrubbingRef = useRef(false);

  const rafLockRef = useRef(false);
  const lastProgressRef = useRef(0);
  const lastProgressTsRef = useRef(Date.now());
  const loaderVisibleRef = useRef(true);

  const { getTVProgress, reportTVPlayback } = useContinueWatching();

  const intentKey = useMemo(() => getIntentKey(intent), [intent]);

  const provider = PROVIDER_ORDER[providerIndex] ?? PROVIDER_ORDER[0];

  const { setTabNavigator, setModalOpen } = useNavigation();

  /* ------------------------------------------------------------------ */
  /* MOUNT STATE                                                        */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    providerIndexRef.current = providerIndex;
  }, [providerIndex]);

  /* ------------------------------------------------------------------ */
  /* TIMER HELPERS                                                      */
  /* ------------------------------------------------------------------ */

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

    if (playbackStartTimerRef.current !== null) {
      clearTimeout(playbackStartTimerRef.current);
      playbackStartTimerRef.current = null;
    }
  }, []);

  const clearProgressFlushInterval = useCallback(() => {
    if (progressFlushIntervalRef.current !== null) {
      clearInterval(progressFlushIntervalRef.current);
      progressFlushIntervalRef.current = null;
    }
  }, []);

  const clearWatchdogInterval = useCallback(() => {
    if (watchdogIntervalRef.current !== null) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearLoaderTimer();
    clearFailoverTimers();
    clearProgressFlushInterval();
    clearWatchdogInterval();
  }, [
    clearLoaderTimer,
    clearFailoverTimers,
    clearProgressFlushInterval,
    clearWatchdogInterval,
  ]);

  const scheduleHideLoader = useCallback(
    (minimumVisibleMs = LOADER_MIN_MS) => {
      clearLoaderTimer();

      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(minimumVisibleMs - elapsed, 0);

      loaderTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        if (!loaderVisibleRef.current) return;

        loaderVisibleRef.current = false;
        setShowLoader(false);
        loaderTimerRef.current = null;
      }, remaining);
    },
    [clearLoaderTimer],
  );

  const showLoaderNow = useCallback(() => {
    clearLoaderTimer();
    loaderVisibleRef.current = true;
    if (mountedRef.current) {
      setShowLoader(true);
    }
  }, [clearLoaderTimer]);

  const safeHideLoader = useCallback(() => {
    clearLoaderTimer();

    loaderTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      if (!loaderVisibleRef.current) return;

      loaderVisibleRef.current = false;
      setShowLoader(false);
      loaderTimerRef.current = null;
    }, 300);
  }, [clearLoaderTimer]);

  /* ------------------------------------------------------------------ */
  /* PROGRESS BATCHING                                                  */
  /* ------------------------------------------------------------------ */

  const flushPendingProgress = useCallback(() => {
    const pending = pendingProgressRef.current;
    if (!pending) return;

    reportTVPlayback(
      pending.tmdbId,
      pending.season,
      pending.episode,
      pending.position,
    );

    pendingProgressRef.current = null;
  }, [reportTVPlayback]);

  const queueProgressWrite = useCallback(
    (position: number) => {
      if (intent.mediaType !== "tv") return;
      if (!intent.season || !intent.episode) return;

      pendingProgressRef.current = {
        tmdbId: intent.tmdbId,
        season: intent.season,
        episode: intent.episode,
        position: Math.floor(position),
      };
    },
    [intent.mediaType, intent.tmdbId, intent.season, intent.episode],
  );

  useEffect(() => {
    clearProgressFlushInterval();

    if (intent.mediaType !== "tv") {
      return;
    }

    progressFlushIntervalRef.current = window.setInterval(() => {
      flushPendingProgress();
    }, PROGRESS_FLUSH_INTERVAL_MS);

    return () => {
      clearProgressFlushInterval();
      flushPendingProgress();
    };
  }, [
    intentKey,
    intent.mediaType,
    clearProgressFlushInterval,
    flushPendingProgress,
  ]);

  /* ------------------------------------------------------------------ */
  /* PROVIDER FAILOVER                                                  */
  /* ------------------------------------------------------------------ */

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
      hasStartedRef.current = false;
      showNextOverlayRef.current = false;

      lastEventTimeRef.current = Date.now();
      lastKnownTimeRef.current = 0;
      isScrubbingRef.current = false;

      lastProgressRef.current = 0;
      lastProgressTsRef.current = Date.now();

      setShowNextOverlay(false);
      showLoaderNow();
      setProviderIndex(current + 1);
    },
    [clearFailoverTimers, clearLoaderTimer, scheduleHideLoader, showLoaderNow],
  );

  /* ------------------------------------------------------------------ */
  /* SEASON DATA + PREFETCH CACHE                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (intent.mediaType !== "tv" || !intent.season || !intent.episode) {
      setEpisodeTitle("");
      setNextEpisodeTitle("");
      setHasNextEpisode(false);
      setNextSeasonFirst(null);
      return;
    }

    let cancelled = false;

    async function loadSeasonMeta() {
      const currentSeasonEpisodes = await getSeasonEpisodesCached(
        intent.tmdbId,
        intent.season!,
      );

      if (cancelled) return;

      if (!currentSeasonEpisodes.length) {
        setEpisodeTitle("");
        setNextEpisodeTitle("");
        setHasNextEpisode(false);
        setNextSeasonFirst(null);
        return;
      }

      const currentEpisode = currentSeasonEpisodes.find(
        (e) => e.episode_number === intent.episode,
      );

      setEpisodeTitle(currentEpisode?.name || "");

      const maxEpisode = Math.max(
        ...currentSeasonEpisodes.map((e) => e.episode_number),
      );

      const season = intent.season ?? 1;
      const episode = intent.episode ?? 1;

      if (episode >= maxEpisode - 1) {
        prefetchSeasonEpisodes(intent.tmdbId, season + 1);
      }

      if (episode < maxEpisode) {
        const nextEp = currentSeasonEpisodes.find(
          (e) => e.episode_number === episode + 1,
        );

        setHasNextEpisode(true);
        setNextSeasonFirst(null);
        setNextEpisodeTitle(nextEp?.name || "");
        return;
      }

      const nextSeason = season + 1;

      const nextSeasonEpisodes = await getSeasonEpisodesCached(
        intent.tmdbId,
        nextSeason,
      );

      if (cancelled) return;

      if (nextSeasonEpisodes.length) {
        setHasNextEpisode(true);
        setNextSeasonFirst({
          season: nextSeason,
          episode: nextSeasonEpisodes[0].episode_number,
        });
        setNextEpisodeTitle(nextSeasonEpisodes[0].name || "");
      } else {
        setHasNextEpisode(false);
        setNextSeasonFirst(null);
        setNextEpisodeTitle("");
      }
    }

    void loadSeasonMeta();

    return () => {
      cancelled = true;
    };
  }, [
    intentKey,
    intent.mediaType,
    intent.tmdbId,
    intent.season,
    intent.episode,
  ]);

  /* ------------------------------------------------------------------ */
  /* RESUME LOCK                                                        */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (intent.mediaType !== "tv") {
      startAtRef.current = 0;
      return;
    }

    const progress = getTVProgress(intent.tmdbId);

    if (
      progress &&
      progress.season === intent.season &&
      progress.episode === intent.episode
    ) {
      startAtRef.current = progress.position;
    } else {
      startAtRef.current = 0;
    }
  }, [
    intentKey,
    intent.mediaType,
    intent.tmdbId,
    intent.season,
    intent.episode,
    getTVProgress,
  ]);

  const startAt = startAtRef.current;

  /* ------------------------------------------------------------------ */
  /* EMBED URL                                                          */
  /* ------------------------------------------------------------------ */

  const embedUrl = useMemo(() => {
    return buildEmbedUrl(intent, {
      provider,
      startAt,
      autoplay: true,
      theme: THEME,
    });
  }, [provider, startAt, intent]);

  /* ------------------------------------------------------------------ */
  /* RESET PLAYER                                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    flushPendingProgress();

    setProviderIndex(0);
    showLoaderNow();
    setShowNextOverlay(false);

    playbackStartedRef.current = false;
    iframeLoadedRef.current = false;

    hasStartedRef.current = false;
    lastQueuedProgressRef.current = 0;
    pendingProgressRef.current = null;
    showNextOverlayRef.current = false;

    lastEventTimeRef.current = Date.now();
    lastKnownTimeRef.current = 0;
    isScrubbingRef.current = false;

    lastProgressRef.current = 0;
    lastProgressTsRef.current = Date.now();

    clearFailoverTimers();
    clearLoaderTimer();
  }, [
    intentKey,
    flushPendingProgress,
    clearFailoverTimers,
    clearLoaderTimer,
    showLoaderNow,
  ]);

  /* ------------------------------------------------------------------ */
  /* FAILOVER TIMERS                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    clearFailoverTimers();
    clearLoaderTimer();

    loadStartRef.current = Date.now();
    showLoaderNow();

    iframeLoadedRef.current = false;
    playbackStartedRef.current = false;

    lastEventTimeRef.current = Date.now();
    lastKnownTimeRef.current = 0;
    isScrubbingRef.current = false;

    lastProgressRef.current = 0;
    lastProgressTsRef.current = Date.now();

    iframeLoadTimerRef.current = window.setTimeout(() => {
      if (!iframeLoadedRef.current && !playbackStartedRef.current) {
        fallbackProvider("iframe-load-timeout");
      }
      iframeLoadTimerRef.current = null;
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
    showLoaderNow,
  ]);

  /* ------------------------------------------------------------------ */
  /* PLAYER MESSAGE HANDLER                                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPlayerOrigin(event.origin)) return;
      if (rafLockRef.current) return;

      rafLockRef.current = true;

      requestAnimationFrame(() => {
        rafLockRef.current = false;

        const msg = safeMsgData(event.data);
        if (!msg) return;

        const now = Date.now();

        const { currentTime, duration, eventType } = extractPlayerMetrics(msg);

        lastEventTimeRef.current = now;

        if (typeof currentTime === "number") {
          const delta = Math.abs(currentTime - lastKnownTimeRef.current);

          if (delta >= SCRUB_DELTA_SECONDS) {
            isScrubbingRef.current = true;
          } else if (delta <= STABLE_DELTA_SECONDS) {
            isScrubbingRef.current = false;
          }

          lastKnownTimeRef.current = currentTime;

          if (currentTime > lastProgressRef.current) {
            lastProgressRef.current = currentTime;
            lastProgressTsRef.current = now;
            
            if (currentTime > 5 && !playbackConfirmedAtRef.current) {
              playbackConfirmedAtRef.current = now;
            }
          }
        }

        const started =
          (typeof currentTime === "number" && currentTime > 0) ||
          eventType === "play" ||
          eventType === "playing" ||
          eventType === "ready" ||
          eventType === "canplay" ||
          eventType === "loadeddata";

        if (started && !playbackStartedRef.current) {
          playbackStartedRef.current = true;
          clearFailoverTimers();
          scheduleHideLoader(LOADER_MIN_MS);
        }

        if (
          typeof currentTime === "number" &&
          !hasStartedRef.current &&
          currentTime >= START_THRESHOLD_SECONDS
        ) {
          hasStartedRef.current = true;
        }

        if (
          intent.mediaType === "tv" &&
          typeof currentTime === "number" &&
          hasStartedRef.current
        ) {
          const floored = Math.floor(currentTime);

          if (
            floored - lastQueuedProgressRef.current >=
            PROGRESS_QUEUE_STEP_SECONDS
          ) {
            lastQueuedProgressRef.current = floored;
            queueProgressWrite(floored);
          }
        }

        if (
          typeof currentTime === "number" &&
          hasNextEpisode &&
          typeof duration === "number" &&
          duration > 60 &&
          currentTime >= duration * NEXT_OVERLAY_THRESHOLD &&
          !showNextOverlayRef.current
        ) {
          showNextOverlayRef.current = true;

          requestAnimationFrame(() => {
            if (mountedRef.current) {
              setShowNextOverlay(true);
            }
          });
        }
      });
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [
    intent.mediaType,
    hasNextEpisode,
    queueProgressWrite,
    clearFailoverTimers,
    scheduleHideLoader,
  ]);

  /* ------------------------------------------------------------------ */
  /* WATCHDOG                                                           */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    clearWatchdogInterval();

    if (!providerSupportsPlaybackEvents(provider)) {
      return;
    }

    watchdogIntervalRef.current = window.setInterval(() => {
      if (!playbackStartedRef.current) return;

      const now = Date.now();
      const silence = now - lastEventTimeRef.current;
      const noProgress = now - lastProgressTsRef.current;

      if (silence >= WATCHDOG_SOFT_STALL_MS) {
        safeHideLoader();
      }

      if (noProgress >= WATCHDOG_HARD_STALL_MS) {
        fallbackProvider("true-stall");
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);

    return () => {
      clearWatchdogInterval();
    };
  }, [provider, fallbackProvider, safeHideLoader, clearWatchdogInterval]);

  /* ------------------------------------------------------------------ */
  /* NEXT EPISODE                                                       */
  /* ------------------------------------------------------------------ */

  const nextIntent = useMemo(() => {
    if (!hasNextEpisode) return null;
    if (intent.mediaType !== "tv") return null;

    if (nextSeasonFirst) {
      return {
        ...intent,
        season: nextSeasonFirst.season,
        episode: nextSeasonFirst.episode,
      };
    }

    return {
      ...intent,
      episode: (intent.episode ?? 1) + 1,
    };
  }, [hasNextEpisode, nextSeasonFirst, intent]);

  /* ------------------------------------------------------------------ */
  /* ACTIONS                                                            */
  /* ------------------------------------------------------------------ */

  const handleClose = useCallback(() => {
    flushPendingProgress();
    clearAllTimers();
    onClose();
  }, [flushPendingProgress, clearAllTimers, onClose]);

  const handlePlayNext = useCallback(() => {
    if (!nextIntent) return;

    flushPendingProgress();
    setShowNextOverlay(false);
    showNextOverlayRef.current = false;
    onPlayNext?.(nextIntent);
  }, [flushPendingProgress, nextIntent, onPlayNext]);

  /* ------------------------------------------------------------------ */
  /* NAVIGATION (BACK / ESCAPE / CONTROLLER B)                          */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleNav = (dir: "up" | "down" | "escape") => {
      if (dir === "escape") {
        handleClose();
      }
    };

    setTabNavigator(handleNav);
    setModalOpen(true);

    return () => {
      setTabNavigator(() => {});
      setModalOpen(false);
    };
  }, [handleClose, setTabNavigator, setModalOpen]);

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/0.35)] backdrop-blur-md px-3 sm:px-6"
    >
      <motion.div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]">
        <iframe
          key={`${intentKey}-${providerIndex}`}
          src={embedUrl}
          className="w-full h-full border-none"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
          onLoad={() => {
            iframeLoadedRef.current = true;
            lastEventTimeRef.current = Date.now();
            lastProgressTsRef.current = Date.now();

            if (iframeLoadTimerRef.current !== null) {
              clearTimeout(iframeLoadTimerRef.current);
              iframeLoadTimerRef.current = null;
            }

            /*
              Only vidlink / vidfast get event-driven playback failover.
              Providers like superembed/multiembed may not emit usable playback
              events, so we do not auto-fail them after load.
            */
            if (providerSupportsPlaybackEvents(provider)) {
              if (playbackStartTimerRef.current !== null) {
                clearTimeout(playbackStartTimerRef.current);
                playbackStartTimerRef.current = null;
              }

              playbackStartTimerRef.current = window.setTimeout(() => {
                if (!playbackStartedRef.current) {
                  fallbackProvider("playback-event-timeout");
                }
                playbackStartTimerRef.current = null;
              }, EVENT_PLAYBACK_START_TIMEOUT);
            } else {
              scheduleHideLoader(LOADER_MIN_MS);
            }
          }}
        />

        <AnimatePresence>
          {showLoader && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]"
            >
              <LoaderCircle className="h-10 w-10 animate-spin text-[hsl(var(--foreground))]" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]"
        >
          <X size={22} className="m-2" />
        </button>

        {episodeTitle && intent.mediaType === "tv" && (
          <div className="absolute top-4 left-4 z-20 text-sm bg-[hsl(var(--background)/0.9)] px-3 py-1.5 rounded-lg">
            S{intent.season} · E{intent.episode}
            <span className="ml-2 opacity-80">{episodeTitle}</span>
          </div>
        )}

        <AnimatePresence>
          {showNextOverlay && nextIntent && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-20 right-6 z-30 bg-[hsl(var(--background)/0.95)] ring-2 ring-[hsl(var(--foreground))] rounded-xl px-4 py-3 shadow-lg flex items-center gap-4 max-w-xs"
            >
              <div className="text-sm">
                <div className="text-xs opacity-70">Up next</div>

                <div className="font-semibold">
                  S{nextIntent.season} · E{nextIntent.episode}
                </div>

                {nextEpisodeTitle && (
                  <div className="text-xs opacity-80 mt-1 line-clamp-2">
                    {nextEpisodeTitle}
                  </div>
                )}
              </div>

              <button
                onClick={handlePlayNext}
                className="h-10 w-10 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center"
              >
                <Play size={20} fill="currentColor" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
