"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  buildEmbedUrl,
  PROVIDER_ORDER,
  type PlaybackIntent,
  type ProviderType,
} from "@/lib/embed/buildEmbedUrl";
import { useContinueWatching } from "@/hooks/useContinueWatching";

/* ---------------------------------- CONFIG ---------------------------------- */
const LOADER_MIN_MS = 900;
const LOAD_TIMEOUT_VIDLINK = 9000;
const LOAD_TIMEOUT_OTHER = 4000;

const VIDLINK_HOSTS = new Set(["vidlink.pro", "www.vidlink.pro"]);

const THEME = "2dd4bf";
const START_THRESHOLD_SECONDS = 30;
const NEXT_READY_POSITION = START_THRESHOLD_SECONDS; // must be >= 30 to be stored by your hook

/* ---------------------------------- HELPERS ---------------------------------- */
function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

function isVidlinkOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (VIDLINK_HOSTS.has(host)) return true;
    // allow subdomains (e.g. cdn.vidlink.pro)
    return host.endsWith(".vidlink.pro");
  } catch {
    return false;
  }
}

function safeMsgData(data: unknown): any | null {
  if (!data) return null;
  if (typeof data === "object") return data as any;
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

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
}

export default function PlayerModal({ intent, onClose }: PlayerModalProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [providerIndex, setProviderIndex] = useState(0);

  const [hasNextEpisode, setHasNextEpisode] = useState(false);
  const [nextSeasonFirst, setNextSeasonFirst] = useState<{
    season: number;
    episode: number;
  } | null>(null);

  const loadTimerRef = useRef<number | null>(null);
  const loadStartRef = useRef<number>(0);
  const hasReportedRef = useRef(false);

  const { getTVProgress, reportTVPlayback } = useContinueWatching();

  /* Identity */
  const intentKey = useMemo(
    () => getIntentKey(intent),
    [intent.mediaType, intent.tmdbId, intent.season, intent.episode],
  );

  /* Provider */
  const provider = PROVIDER_ORDER[providerIndex] as ProviderType;

  /* ------------------------------------------------------------------ */
  /* NEXT EPISODE + SEASON ROLLOVER CHECK                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (intent.mediaType !== "tv") {
      setHasNextEpisode(false);
      setNextSeasonFirst(null);
      return;
    }

    if (!intent.season || !intent.episode) return;

    let active = true;

    import("@/lib/tmdb").then(({ fetchSeasonEpisodes }) => {
      fetchSeasonEpisodes(intent.tmdbId, intent.season!).then(async (eps) => {
        if (!active || !Array.isArray(eps) || eps.length === 0) return;

        const maxEpisode = Math.max(...eps.map((e: any) => e.episode_number));

        // Normal next episode
        if (intent.episode! < maxEpisode) {
          setHasNextEpisode(true);
          setNextSeasonFirst(null);
          return;
        }

        // End of season → check next season
        const nextSeasonNumber = intent.season! + 1;
        const nextSeasonEps = await fetchSeasonEpisodes(
          intent.tmdbId,
          nextSeasonNumber,
        );

        if (
          active &&
          Array.isArray(nextSeasonEps) &&
          nextSeasonEps.length > 0
        ) {
          setHasNextEpisode(true);
          setNextSeasonFirst({
            season: nextSeasonNumber,
            episode: nextSeasonEps[0].episode_number,
          });
        } else {
          setHasNextEpisode(false);
          setNextSeasonFirst(null);
        }
      });
    });

    return () => {
      active = false;
    };
  }, [intentKey]);

  /* ------------------------------------------------------------------ */
  /* RESUME START POSITION                                              */
  /* ------------------------------------------------------------------ */
  const startAt = useMemo(() => {
    if (intent.mediaType !== "tv") return 0;
    if (!intent.season || !intent.episode) return 0;

    const progress = getTVProgress(intent.tmdbId);
    if (!progress) return 0;

    if (
      progress.season === intent.season &&
      progress.episode === intent.episode
    ) {
      return progress.position;
    }

    return 0;
  }, [intentKey, getTVProgress]);

  const embedUrl = useMemo(
    () =>
      buildEmbedUrl(intent, {
        provider,
        startAt,
        autoplay: true,
        fullscreenButton: true,
        theme: THEME,
        subtitles: "en",
        nextButton: intent.mediaType === "tv" && hasNextEpisode,
        autoNext: intent.mediaType === "tv" && hasNextEpisode,
      }),
    [intentKey, provider, startAt, hasNextEpisode],
  );

  /* Reset when content changes */
  useEffect(() => {
    setProviderIndex(0);
    setShowLoader(true);
    hasReportedRef.current = false;
  }, [intentKey]);

  /* Provider timeout fallback */
  const handleFallback = useCallback(() => {
    setProviderIndex((i) => (i < PROVIDER_ORDER.length - 1 ? i + 1 : i));
  }, []);

  useEffect(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);

    const timeout =
      provider === "vidlink" ? LOAD_TIMEOUT_VIDLINK : LOAD_TIMEOUT_OTHER;

    loadStartRef.current = Date.now();
    setShowLoader(true);

    loadTimerRef.current = window.setTimeout(handleFallback, timeout);

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [embedUrl, provider, handleFallback]);

  /* ------------------------------------------------------------------ */
  /* PLAYBACK TRACKING (VIDLINK ONLY)                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (provider !== "vidlink") return;
    if (intent.mediaType !== "tv") return;
    if (!intent.season || !intent.episode) return;

    const tmdbId = intent.tmdbId;
    const season = intent.season;
    const episode = intent.episode;

    const handleMessage = (event: MessageEvent) => {
      if (!isVidlinkOrigin(event.origin)) return;
      if (hasReportedRef.current) return;

      const msg = safeMsgData(event.data);
      if (!msg) return;

      const currentTime: number | undefined = msg?.data?.currentTime;
      const duration: number | undefined = msg?.data?.duration;

      if (typeof currentTime !== "number") return;
      if (currentTime < START_THRESHOLD_SECONDS) return;

      hasReportedRef.current = true;

      // Completion threshold (>= 90%)
      if (
        typeof duration === "number" &&
        duration > 0 &&
        currentTime >= duration * 0.9
      ) {
        // Same season next
        if (hasNextEpisode && !nextSeasonFirst) {
          reportTVPlayback(tmdbId, season, episode + 1, NEXT_READY_POSITION);
          return;
        }

        // Season rollover
        if (nextSeasonFirst) {
          reportTVPlayback(
            tmdbId,
            nextSeasonFirst.season,
            nextSeasonFirst.episode,
            NEXT_READY_POSITION,
          );
          return;
        }
      }

      // Otherwise save current position
      reportTVPlayback(tmdbId, season, episode, Math.floor(currentTime));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    intentKey,
    provider,
    intent.mediaType,
    intent.season,
    intent.episode,
    hasNextEpisode,
    nextSeasonFirst,
    reportTVPlayback,
  ]);

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/0.35)] backdrop-blur-md px-3 sm:px-6"
    >
      <motion.div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]">
        <AnimatePresence>
          {showLoader && (
            <motion.div className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]">
              <div className="h-8 w-8 rounded-full border-2 border-[hsl(var(--foreground)/0.4)] border-t-[hsl(var(--foreground))] animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        <iframe
          key={`${intentKey}-${providerIndex}`}
          src={embedUrl}
          className="w-full h-full border-none"
          allow="autoplay; fullscreen *; picture-in-picture *; encrypted-media *"
          referrerPolicy="no-referrer"
          onLoad={() => {
            if (loadTimerRef.current) {
              clearTimeout(loadTimerRef.current);
              loadTimerRef.current = null;
            }
            const elapsed = Date.now() - loadStartRef.current;
            const remaining = Math.max(LOADER_MIN_MS - elapsed, 0);
            setTimeout(() => setShowLoader(false), remaining);
          }}
        />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]"
        >
          <X size={22} className="m-2 text-[hsl(var(--foreground))]" />
        </button>
      </motion.div>
    </motion.div>
  );
}
