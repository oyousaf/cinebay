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
const VIDLINK_ORIGIN = "https://vidlink.pro";
const THEME = "2dd4bf";
const START_THRESHOLD_SECONDS = 30;

/* ---------------------------------- HELPERS ---------------------------------- */
function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
}

/* ---------------------------------- COMPONENT ---------------------------------- */
export default function PlayerModal({ intent, onClose }: PlayerModalProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [providerIndex, setProviderIndex] = useState(0);

  const loadTimerRef = useRef<number | null>(null);
  const loadStartRef = useRef<number>(0);
  const hasReportedRef = useRef(false);

  const { getTVProgress, reportTVPlayback } = useContinueWatching();

  /* Identity */
  const intentKey = useMemo(
    () => getIntentKey(intent),
    [intent.mediaType, intent.tmdbId, intent.season, intent.episode],
  );

  /* Resume StartAt */
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

  /* Provider */
  const provider = PROVIDER_ORDER[providerIndex] as ProviderType;

  const embedUrl = useMemo(
    () =>
      buildEmbedUrl(intent, {
        provider,
        startAt,
        autoplay: true,
        fullscreenButton: true,
        theme: THEME,
        subtitles: "en",
        nextButton: intent.mediaType === "tv",
        autoNext: intent.mediaType === "tv",
      }),
    [intentKey, providerIndex, startAt],
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

  /* ---------------------------------- PLAYBACK TRACKING ---------------------------------- */
  useEffect(() => {
    if (intent.mediaType !== "tv") return;
    if (!intent.season || !intent.episode) return;

    const tmdbId = intent.tmdbId;
    const season = intent.season;
    const episode = intent.episode;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== VIDLINK_ORIGIN) return;

      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      let currentTime: number | undefined;

      /* Preferred: MEDIA_DATA */
      if ((msg as any).type === "MEDIA_DATA") {
        currentTime = (msg as any)?.data?.currentTime;
      }

      /* Fallback: PLAYER_EVENT */
      if (!currentTime && (msg as any).type === "PLAYER_EVENT") {
        currentTime = (msg as any)?.data?.currentTime;
      }

      if (typeof currentTime !== "number") return;
      if (hasReportedRef.current) return;

      if (currentTime >= START_THRESHOLD_SECONDS) {
        hasReportedRef.current = true;
        reportTVPlayback(tmdbId, season, episode, Math.floor(currentTime));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [intentKey, reportTVPlayback]);

  /* ---------------------------------- RENDER ---------------------------------- */
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
