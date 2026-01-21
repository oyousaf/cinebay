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
import { useResumeSignal } from "@/context/ResumeContext";

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext: (intent: PlaybackIntent) => void;
}

const FALLBACK_DURATION_SECONDS = 42 * 60;

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

  let bump: (() => void) | null = null;
  try {
    bump = useResumeSignal().bump;
  } catch {
    bump = null;
  }

  const embedUrl = useMemo(
    () => buildEmbedUrl(EMBED_PROVIDERS[0], intent),
    [intent],
  );

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

  useEffect(() => {
    if (intent.mediaType !== "tv") return;
    if (!loaded) return;

    let cancelled = false;

    const start = async () => {
      let runtimeSeconds = FALLBACK_DURATION_SECONDS;

      try {
        if (
          typeof intent.season === "number" &&
          typeof intent.episode === "number"
        ) {
          const r = await fetchEpisodeRuntime(
            intent.tmdbId,
            intent.season,
            intent.episode,
          );
          if (r && r > 600 && r < 10800) runtimeSeconds = r;
        }
      } catch {}

      const windowStart = Math.floor(runtimeSeconds * 0.9);
      const windowEnd = Math.floor(runtimeSeconds * 0.98);

      const attempt = async () => {
        if (cancelled || offeredRef.current) return;
        if (document.visibilityState !== "visible") {
          timerRef.current = window.setTimeout(attempt, 15000);
          return;
        }

        offeredRef.current = true;
        const result = await resolveNextEpisode(intent);
        if (result) setNextOffer(result);
      };

      timerRef.current = window.setTimeout(
        attempt,
        Math.max(0, windowStart * 1000),
      );

      window.setTimeout(() => {
        cancelled = true;
      }, windowEnd * 1000);
    };

    start();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [intent, loaded]);

  const handlePlayNext = (next: PlaybackIntent) => {
    bump?.();
    setNextOffer(null);
    onClose();
    queueMicrotask(() => onPlayNext(next));
  };

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
              onLoad={() => {
                setLoaded(true);
                setError(false);
                setStillLoading(false);
              }}
              onError={() => setError(true)}
            />
          )}

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
