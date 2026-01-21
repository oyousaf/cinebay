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
import { fetchEpisodeRuntime } from "@/lib/tv/fetchEpisodeRuntime";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { useResumeSignal } from "@/context/ResumeContext";

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext: (intent: PlaybackIntent) => void;
}

/* -------------------------------------------------
   CONFIG
-------------------------------------------------- */

const NEAR_END_SECONDS = 120;
const FALLBACK_DURATION_SECONDS = 42 * 60;

/* -------------------------------------------------
   COMPONENT
-------------------------------------------------- */

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
     RESET ON REMOUNT
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

    const t = window.setTimeout(() => setStillLoading(true), 15000);
    return () => clearTimeout(t);
  }, [embedUrl]);

  /* -------------------------------------------------
     NEAR-END OFFER (RUNTIME-AWARE, GUARDED)
  -------------------------------------------------- */
  useEffect(() => {
    if (intent.mediaType !== "tv") return;
    if (!loaded) return;

    let cancelled = false;

    const schedule = async () => {
      let runtimeSeconds = FALLBACK_DURATION_SECONDS;
      let fireAt = runtimeSeconds - NEAR_END_SECONDS;

      try {
        if (
          typeof intent.season === "number" &&
          typeof intent.episode === "number"
        ) {
          const runtime = await fetchEpisodeRuntime(
            intent.tmdbId,
            intent.season,
            intent.episode,
          );

          if (runtime && runtime > 10 * 60 && runtime < 3 * 60 * 60) {
            runtimeSeconds = runtime;
            fireAt = runtime - NEAR_END_SECONDS;
          }
        }
      } catch {
        // silent fallback
      }

      // Clamp: never early, never too late
      const minFireAt = Math.floor(runtimeSeconds * 0.6);
      const maxFireAt = Math.floor(runtimeSeconds * 0.98);
      fireAt = Math.max(fireAt, minFireAt);
      fireAt = Math.min(fireAt, maxFireAt);

      if (cancelled) return;

      timerRef.current = window.setTimeout(async () => {
        if (offeredRef.current) return;
        if (!loaded) return;
        if (document.visibilityState !== "visible") return;

        offeredRef.current = true;

        const result = await resolveNextEpisode(intent);
        if (!result) return;

        setNextOffer(result);
      }, fireAt * 1000);
    };

    schedule();

    return () => {
      cancelled = true;
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
     PLAY NEXT (HARD REMOUNT)
  -------------------------------------------------- */
  const handlePlayNext = (next: PlaybackIntent) => {
    bump?.();
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
            <div
              className="absolute right-6 bottom-20 z-30 flex items-center gap-4 rounded-xl px-4 py-3 shadow-xl backdrop-blur border"
              style={{
                backgroundColor: "hsl(var(--background) / 0.92)",
                color: "hsl(var(--foreground))",
                borderColor: "hsl(var(--foreground) / 0.15)",
              }}
            >
              <span className="text-sm opacity-90">
                {nextOffer.kind === "NEXT_SEASON"
                  ? "Start next season?"
                  : "Next episode ready"}
              </span>

              <button
                className="text-sm font-semibold px-3 py-1 rounded-md transition hover:opacity-90"
                style={{
                  backgroundColor: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                }}
                onClick={() => handlePlayNext(nextOffer.intent)}
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
