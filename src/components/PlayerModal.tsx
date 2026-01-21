"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
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
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { useResumeSignal } from "@/context/ResumeContext";

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext: (intent: PlaybackIntent) => void;
}

const NEAR_END_SECONDS = 120;

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [stillLoading, setStillLoading] = useState(false);
  const [nextOffer, setNextOffer] = useState<NextEpisodeResult | null>(null);

  const offeredRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const { setTVProgress } = useContinueWatching();

  /* ---------- Resume signal (safe) ---------- */
  let bump: (() => void) | null = null;
  try {
    bump = useResumeSignal().bump;
  } catch {
    bump = null;
  }

  /* -------------------------------------------------
     EMBED URL
  -------------------------------------------------- */
  const embedUrl = useMemo(
    () => buildEmbedUrl(EMBED_PROVIDERS[0], intent),
    [intent],
  );

  /* -------------------------------------------------
     LOAD WATCHDOG / RESET
  -------------------------------------------------- */
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setStillLoading(false);
    setNextOffer(null);
    offeredRef.current = false;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const t = window.setTimeout(() => {
      setStillLoading(true);
    }, 15000);

    return () => clearTimeout(t);
  }, [embedUrl]);

  /* -------------------------------------------------
     NEAR-END OFFER (TIME HEURISTIC)
  -------------------------------------------------- */
  useEffect(() => {
    if (intent.mediaType !== "tv") return;
    if (!loaded) return;

    const assumedDuration = 42 * 60;
    const fireAt = assumedDuration - NEAR_END_SECONDS;

    timerRef.current = window.setTimeout(async () => {
      if (offeredRef.current) return;
      offeredRef.current = true;

      const result = await resolveNextEpisode(intent);
      if (!result) return;

      setNextOffer(result);
    }, fireAt * 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [intent, loaded]);

  /* -------------------------------------------------
     IFRAME LOAD
  -------------------------------------------------- */
  const handleLoad = () => {
    setLoaded(true);
    setError(false);
    setStillLoading(false);

    if (
      intent.mediaType === "tv" &&
      typeof intent.season === "number" &&
      typeof intent.episode === "number"
    ) {
      setTVProgress(intent.tmdbId, intent.season, intent.episode);
    }
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur"
      >
        <div className="relative w-full max-w-6xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
          {!loaded && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white gap-2 text-sm px-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              {stillLoading && (
                <p className="text-xs text-zinc-300">
                  Still loading… try another source if needed.
                </p>
              )}
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-6 text-center">
              Sorry, the video could not be loaded.
            </div>
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full border-none"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
              onLoad={handleLoad}
              onError={() => setError(true)}
            />
          )}

          {/* ---------- NEXT EPISODE OVERLAY ---------- */}
          {nextOffer && nextOffer.kind !== "END" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur text-white px-4 py-3 rounded-xl flex items-center gap-4 shadow-lg">
              <span className="text-sm">
                {nextOffer.kind === "NEXT_SEASON"
                  ? "Start next season?"
                  : "Next episode ready"}
              </span>
              <button
                className="text-sm font-semibold underline"
                onClick={() => {
                  bump?.();
                  setNextOffer(null);
                  onPlayNext(nextOffer.intent);
                }}
              >
                Play
              </button>
            </div>
          )}

          {/* ---------- CLOSE ---------- */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 text-white"
            aria-label="Close player"
          >
            <X size={28} className="p-1 bg-black/60 rounded-full" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
