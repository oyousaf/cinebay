"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  buildEmbedUrl,
  EMBED_PROVIDERS,
  type PlaybackIntent,
} from "@/lib/embed/buildEmbedUrl";
import {
  resolveNextEpisode,
  type NextEpisodeResult,
} from "@/lib/tv/resolveNextEpisode";
import { fetchEpisodeRuntime } from "@/lib/tv/fetchEpisodeRuntime";
import { useContinueWatching } from "@/hooks/useContinueWatching";

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext: (intent: PlaybackIntent) => void;
}

const FALLBACK_DURATION_SECONDS = 42 * 60;
const RESUME_SECONDS = 30;
const LOADER_MIN_MS = 900;

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [error, setError] = useState(false);
  const [nextOffer, setNextOffer] = useState<NextEpisodeResult | null>(null);

  const intentRef = useRef(intent);
  const offeredRef = useRef(false);
  const resumeWrittenRef = useRef(false);

  const loaderTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const offerTimerRef = useRef<number | null>(null);
  const cancelTimerRef = useRef<number | null>(null);

  const { setTVProgress } = useContinueWatching();

  const embedUrl = useMemo(
    () => buildEmbedUrl(EMBED_PROVIDERS[0], intent),
    [intent],
  );

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  /* RESET ON ROUTE CHANGE */
  useEffect(() => {
    setError(false);
    setNextOffer(null);
    setShowLoader(true);

    offeredRef.current = false;
    resumeWrittenRef.current = false;

    loaderTimerRef.current && clearTimeout(loaderTimerRef.current);
    resumeTimerRef.current && clearTimeout(resumeTimerRef.current);
    offerTimerRef.current && clearTimeout(offerTimerRef.current);
    cancelTimerRef.current && clearTimeout(cancelTimerRef.current);

    loaderTimerRef.current = window.setTimeout(
      () => setShowLoader(false),
      LOADER_MIN_MS,
    );

    return () => {
      loaderTimerRef.current && clearTimeout(loaderTimerRef.current);
    };
  }, [embedUrl]);

  /* RESUME WRITE */
  useEffect(() => {
    if (intent.mediaType !== "tv" || resumeWrittenRef.current) return;

    resumeTimerRef.current = window.setTimeout(() => {
      const i = intentRef.current;
      if (typeof i.season === "number" && typeof i.episode === "number") {
        resumeWrittenRef.current = true;
        setTVProgress(i.tmdbId, i.season, i.episode, RESUME_SECONDS);
      }
    }, RESUME_SECONDS * 1000);

    return () => {
      resumeTimerRef.current && clearTimeout(resumeTimerRef.current);
    };
  }, [embedUrl, setTVProgress]);

  /* NEXT EPISODE OFFER */
  useEffect(() => {
    if (intent.mediaType !== "tv") return;
    let cancelled = false;

    const maybeOffer = async () => {
      if (cancelled || offeredRef.current) return;
      if (document.visibilityState !== "visible") return;

      offeredRef.current = true;
      const result = await resolveNextEpisode(intentRef.current);
      if (result) setNextOffer(result);
    };

    const start = async () => {
      let runtime = FALLBACK_DURATION_SECONDS;

      try {
        const i = intentRef.current;
        if (typeof i.season === "number" && typeof i.episode === "number") {
          const r = await fetchEpisodeRuntime(i.tmdbId, i.season, i.episode);
          if (r && r > 600 && r < 10800) runtime = r;
        }
      } catch {}

      offerTimerRef.current = window.setTimeout(
        maybeOffer,
        runtime * 0.9 * 1000,
      );

      cancelTimerRef.current = window.setTimeout(
        () => (cancelled = true),
        runtime * 0.98 * 1000,
      );
    };

    document.addEventListener("visibilitychange", maybeOffer);
    start();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", maybeOffer);
      offerTimerRef.current && clearTimeout(offerTimerRef.current);
      cancelTimerRef.current && clearTimeout(cancelTimerRef.current);
    };
  }, [embedUrl]);

  const handlePlayNext = (next: PlaybackIntent) => {
    setNextOffer(null);
    onPlayNext(next);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={embedUrl}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/0.35)]
          backdrop-blur-md px-3 sm:px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-[hsl(var(--background))]
            ring-2 ring-[hsl(var(--foreground))] shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
        >
          {/* LOADER */}
          <AnimatePresence>
            {showLoader && !error && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]"
              >
                <div
                  className="h-8 w-8 rounded-full border-2 border-[hsl(var(--foreground)/0.4)] border-t-[hsl(var(--foreground))]
                    animate-spin"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* IFRAME */}
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="w-full h-full border-none"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onError={() => setError(true)}
          />

          {/* NEXT EPISODE */}
          <AnimatePresence>
            {nextOffer && nextOffer.kind !== "END" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 z-30 flex items-center gap-4
                  rounded-xl px-4 py-3 bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]
                  shadow-xl"
              >
                <span className="text-sm text-[hsl(var(--foreground)/0.8)]">
                  {nextOffer.kind === "NEXT_SEASON"
                    ? "Start next season?"
                    : "Next episode ready"}
                </span>

                <button
                  onClick={() => handlePlayNext(nextOffer.intent)}
                  className="text-sm font-semibold px-3 py-1.5 rounded-md bg-[hsl(var(--foreground))] text-[hsl(var(--background))]
                    hover:scale-105 transition"
                >
                  Play
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CLOSE */}
          <button
            onClick={onClose}
            aria-label="Close player"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 rounded-full bg-[hsl(var(--background))]
              ring-2 ring-[hsl(var(--foreground))] hover:scale-105 transition"
          >
            <X size={22} className="m-2 text-[hsl(var(--foreground))]" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
