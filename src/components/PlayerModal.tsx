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

  /* -------------------------------------------------
     REFS 
  -------------------------------------------------- */
  const offeredRef = useRef(false);
  const resumeWrittenRef = useRef(false);
  const intentRef = useRef(intent);

  const loaderTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const offerTimerRef = useRef<number | null>(null);
  const cancelTimerRef = useRef<number | null>(null);

  const { setTVProgress } = useContinueWatching();

  const embedUrl = useMemo(
    () => buildEmbedUrl(EMBED_PROVIDERS[0], intent),
    [intent],
  );

  /* -------------------------------------------------
     KEEP CURRENT INTENT SAFE FROM STALE CLOSURES
  -------------------------------------------------- */
  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  /* -------------------------------------------------
     RESET ON ROUTE / EMBED CHANGE
  -------------------------------------------------- */
  useEffect(() => {
    setError(false);
    setNextOffer(null);
    setShowLoader(true);

    offeredRef.current = false;
    resumeWrittenRef.current = false;

    if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);

    loaderTimerRef.current = window.setTimeout(() => {
      setShowLoader(false);
    }, LOADER_MIN_MS);

    return () => {
      if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
    };
  }, [embedUrl]);

  /* -------------------------------------------------
     RESUME WRITE
  -------------------------------------------------- */
  useEffect(() => {
    if (intent.mediaType !== "tv") return;
    if (resumeWrittenRef.current) return;

    resumeTimerRef.current = window.setTimeout(() => {
      const i = intentRef.current;
      if (typeof i.season === "number" && typeof i.episode === "number") {
        resumeWrittenRef.current = true;
        setTVProgress(i.tmdbId, i.season, i.episode, RESUME_SECONDS);
      }
    }, RESUME_SECONDS * 1000);

    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [embedUrl, setTVProgress]);

  /* -------------------------------------------------
     NEAR-END NEXT EPISODE OFFER (TV)
  -------------------------------------------------- */
  useEffect(() => {
    if (intent.mediaType !== "tv") return;

    let cancelled = false;

    const start = async () => {
      let runtimeSeconds = FALLBACK_DURATION_SECONDS;

      try {
        const i = intentRef.current;
        if (typeof i.season === "number" && typeof i.episode === "number") {
          const r = await fetchEpisodeRuntime(i.tmdbId, i.season, i.episode);
          if (r && r > 600 && r < 10800) runtimeSeconds = r;
        }
      } catch {}

      const windowStart = Math.floor(runtimeSeconds * 0.9);
      const windowEnd = Math.floor(runtimeSeconds * 0.98);

      const attempt = async () => {
        if (cancelled || offeredRef.current) return;

        if (document.visibilityState !== "visible") {
          offerTimerRef.current = window.setTimeout(attempt, 15000);
          return;
        }

        offeredRef.current = true;
        const result = await resolveNextEpisode(intentRef.current);
        if (result) setNextOffer(result);
      };

      offerTimerRef.current = window.setTimeout(attempt, windowStart * 1000);

      cancelTimerRef.current = window.setTimeout(() => {
        cancelled = true;
      }, windowEnd * 1000);
    };

    start();

    return () => {
      cancelled = true;
      if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    };
  }, [embedUrl]);

  /* -------------------------------------------------
     PLAY NEXT
  -------------------------------------------------- */
  const handlePlayNext = (next: PlaybackIntent) => {
    setNextOffer(null);
    onClose();
    queueMicrotask(() => onPlayNext(next));
  };

  /* -------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <AnimatePresence>
      <motion.div
        key={embedUrl}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center
          bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-6xl aspect-video
            rounded-2xl overflow-hidden
            bg-black
            ring-1 ring-white/5
            shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
        >
          {/* LOADER */}
          <AnimatePresence>
            {showLoader && !error && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black"
              >
                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ERROR */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-6 text-center">
              Sorry, the video could not be loaded.
            </div>
          )}

          {/* IFRAME */}
          <iframe
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
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-6 bottom-20 z-30
                  flex items-center gap-4
                  rounded-xl px-4 py-3
                  bg-black/70 backdrop-blur
                  ring-1 ring-white/10
                  shadow-xl"
              >
                <span className="text-sm text-zinc-200">
                  {nextOffer.kind === "NEXT_SEASON"
                    ? "Start next season?"
                    : "Next episode ready"}
                </span>

                <button
                  className="text-sm font-semibold px-3 py-1.5 rounded-md
                    bg-white text-black hover:bg-zinc-200 transition"
                  onClick={() => handlePlayNext(nextOffer.intent)}
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
            className="absolute top-4 right-4 z-20
              rounded-full bg-black/60 backdrop-blur
              ring-1 ring-white/10
              hover:bg-black/80 transition"
          >
            <X size={22} className="m-2 text-white/90" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
