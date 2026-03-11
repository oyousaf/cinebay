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

/* -------------------------------- CONFIG -------------------------------- */

const LOADER_MIN_MS = 900;

const IFRAME_LOAD_TIMEOUT = 9000;
const PLAYBACK_START_TIMEOUT = 8000;

const START_THRESHOLD_SECONDS = 30;
const NEXT_OVERLAY_THRESHOLD = 0.9;

const PROGRESS_WRITE_INTERVAL = 10;

const THEME = "2dd4bf";

/* -------------------------------- HELPERS -------------------------------- */

function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

function safeMsgData(data: unknown): any | null {
  if (!data) return null;

  if (typeof data === "object") return data as any;

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === "object" ? parsed : null;
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
    o.includes("vidlink") || o.includes("vidfast") || o.includes("multiembed")
  );
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

  const iframeTimerRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const loadStartRef = useRef(0);

  const playbackStartedRef = useRef(false);

  const startAtRef = useRef(0);

  const hasStartedRef = useRef(false);
  const lastWriteRef = useRef(0);

  const { getTVProgress, reportTVPlayback } = useContinueWatching();

  const intentKey = useMemo(() => getIntentKey(intent), [intent]);

  const provider = PROVIDER_ORDER[providerIndex] as ProviderType;

  /* ------------------------------------------------------------------ */
  /* PROVIDER FAILOVER                                                 */
  /* ------------------------------------------------------------------ */

  const fallbackProvider = useCallback(() => {
    setProviderIndex((i) => {
      if (i >= PROVIDER_ORDER.length - 1) return i;
      return i + 1;
    });
  }, []);

  function clearTimers() {
    if (iframeTimerRef.current) {
      clearTimeout(iframeTimerRef.current);
      iframeTimerRef.current = null;
    }

    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* SEASON DATA                                                        */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (intent.mediaType !== "tv" || !intent.season) return;

    let active = true;

    async function loadSeason() {
      const eps = await fetchSeasonEpisodes(intent.tmdbId, intent.season!);

      if (!active || !Array.isArray(eps)) return;

      const current = eps.find((e: any) => e.episode_number === intent.episode);

      setEpisodeTitle(current?.name || "");

      const maxEpisode = Math.max(...eps.map((e: any) => e.episode_number));

      if (intent.episode! < maxEpisode) {
        const nextEp = eps.find(
          (e: any) => e.episode_number === intent.episode! + 1,
        );

        setHasNextEpisode(true);
        setNextSeasonFirst(null);
        setNextEpisodeTitle(nextEp?.name || "");
        return;
      }

      const nextSeason = intent.season! + 1;

      const nextEps = await fetchSeasonEpisodes(intent.tmdbId, nextSeason);

      if (active && nextEps?.length) {
        setHasNextEpisode(true);

        setNextSeasonFirst({
          season: nextSeason,
          episode: nextEps[0].episode_number,
        });

        setNextEpisodeTitle(nextEps[0].name || "");
      } else {
        setHasNextEpisode(false);
        setNextSeasonFirst(null);
        setNextEpisodeTitle("");
      }
    }

    loadSeason();

    return () => {
      active = false;
    };
  }, [intentKey]);

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
  }, [intentKey]);

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
      subtitles: "en",
      nextButton: false,
      autoNext: false,
    });
  }, [provider, intentKey, startAt]);

  /* ------------------------------------------------------------------ */
  /* RESET PLAYER                                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    setProviderIndex(0);
    setShowLoader(true);
    setShowNextOverlay(false);

    playbackStartedRef.current = false;

    hasStartedRef.current = false;
    lastWriteRef.current = 0;
  }, [intentKey]);

  /* ------------------------------------------------------------------ */
  /* FAILOVER TIMERS                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    clearTimers();

    loadStartRef.current = Date.now();

    setShowLoader(true);

    playbackStartedRef.current = false;

    iframeTimerRef.current = window.setTimeout(() => {
      if (!playbackStartedRef.current) {
        fallbackProvider();
      }
    }, IFRAME_LOAD_TIMEOUT);

    playbackTimerRef.current = window.setTimeout(() => {
      if (!playbackStartedRef.current) {
        fallbackProvider();
      }
    }, PLAYBACK_START_TIMEOUT);

    setTimeout(() => {
      setShowLoader(false);
    }, LOADER_MIN_MS + 2000);

    return clearTimers;
  }, [embedUrl]);

  /* ------------------------------------------------------------------ */
  /* PLAYER MESSAGE HANDLER                                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPlayerOrigin(event.origin)) return;

      const msg = safeMsgData(event.data);
      if (!msg) return;

      const currentTime = msg?.data?.currentTime;
      const duration = msg?.data?.duration;

      if (typeof currentTime !== "number") return;

      if (currentTime > 0) {
        playbackStartedRef.current = true;
        clearTimers();
      }

      if (!hasStartedRef.current && currentTime >= START_THRESHOLD_SECONDS) {
        hasStartedRef.current = true;
      }

      if (
        hasStartedRef.current &&
        currentTime - lastWriteRef.current >= PROGRESS_WRITE_INTERVAL
      ) {
        lastWriteRef.current = currentTime;

        reportTVPlayback(
          intent.tmdbId,
          intent.season!,
          intent.episode!,
          Math.floor(currentTime),
        );
      }

      if (
        hasNextEpisode &&
        typeof duration === "number" &&
        duration > 60 &&
        currentTime >= duration * NEXT_OVERLAY_THRESHOLD
      ) {
        if (!showNextOverlay) {
          setShowNextOverlay(true);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [intentKey, hasNextEpisode, reportTVPlayback, showNextOverlay]);

  /* ------------------------------------------------------------------ */
  /* NEXT EPISODE                                                       */
  /* ------------------------------------------------------------------ */

  const nextIntent = useMemo(() => {
    if (!hasNextEpisode) return null;

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
  }, [intentKey, hasNextEpisode, nextSeasonFirst]);

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
            const elapsed = Date.now() - loadStartRef.current;
            const remaining = Math.max(LOADER_MIN_MS - elapsed, 0);

            setTimeout(() => setShowLoader(false), remaining);
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
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]"
        >
          <X size={22} className="m-2" />
        </button>

        {episodeTitle && (
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
                onClick={() => {
                  setShowNextOverlay(false);
                  onPlayNext?.(nextIntent);
                }}
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
