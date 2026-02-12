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

const RESUME_SECONDS = 30;
const LOADER_MIN_MS = 900;
const COUNTDOWN_SECONDS = 8;
const FALLBACK_RUNTIME = 42 * 60;
const TRIGGER_BEFORE_END = 180;

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [error, setError] = useState(false);
  const [nextOffer, setNextOffer] = useState<NextEpisodeResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const intentRef = useRef(intent);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const offeredRef = useRef(false);
  const cancelledByUserRef = useRef(false);
  const resumeWrittenRef = useRef(false);

  const loaderTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const { setTVProgress } = useContinueWatching();

  const embedUrl = useMemo(
    () => buildEmbedUrl(EMBED_PROVIDERS[0], intent),
    [intent],
  );

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  useEffect(() => {
    setError(false);
    setNextOffer(null);
    setCountdown(null);
    setShowLoader(true);

    offeredRef.current = false;
    cancelledByUserRef.current = false;
    resumeWrittenRef.current = false;

    loaderTimerRef.current && clearTimeout(loaderTimerRef.current);
    resumeTimerRef.current && clearTimeout(resumeTimerRef.current);
    fallbackTimerRef.current && clearTimeout(fallbackTimerRef.current);
    countdownTimerRef.current && clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;

    loaderTimerRef.current = window.setTimeout(
      () => setShowLoader(false),
      LOADER_MIN_MS,
    );

    return () => {
      loaderTimerRef.current && clearTimeout(loaderTimerRef.current);
    };
  }, [embedUrl]);

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

  const startCountdown = (nextIntent: PlaybackIntent) => {
    if (countdownTimerRef.current) return;

    setCountdown(COUNTDOWN_SECONDS);

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          onPlayNext(nextIntent);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    cancelledByUserRef.current = true;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }

    setCountdown(null);
    setNextOffer(null);
  };

  useEffect(() => {
    if (intent.mediaType !== "tv") return;

    let destroyed = false;

    const triggerOffer = async () => {
      if (destroyed) return;
      if (offeredRef.current) return;
      if (cancelledByUserRef.current) return;
      if (document.visibilityState !== "visible") return;

      offeredRef.current = true;

      const result = await resolveNextEpisode(intentRef.current);
      if (!result || result.kind === "END") return;

      setNextOffer(result);
      startCountdown(result.intent);
    };

    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current) return;
      if (event.source !== iframeRef.current.contentWindow) return;

      const message = event.data;
      if (!message || typeof message !== "object") return;
      if (message.type !== "PLAYER_EVENT") return;

      const payload = message.data;
      if (!payload) return;

      const current = payload.currentTime;
      const duration = payload.duration;
      const eventName = payload.event;

      if (!current || !duration) return;

      const remaining = duration - current;

      if (eventName === "timeupdate" && remaining <= TRIGGER_BEFORE_END) {
        triggerOffer();
      }

      if (eventName === "ended") {
        triggerOffer();
      }
    };

    window.addEventListener("message", handleMessage);

    const startFallback = async () => {
      let runtime = FALLBACK_RUNTIME;

      try {
        const i = intentRef.current;
        if (i.season && i.episode) {
          const r = await fetchEpisodeRuntime(i.tmdbId, i.season, i.episode);
          if (r && r > 600 && r < 10800) runtime = r;
        }
      } catch {}

      const delay = Math.max(runtime - TRIGGER_BEFORE_END, 60);

      fallbackTimerRef.current = window.setTimeout(() => {
        if (!cancelledByUserRef.current) triggerOffer();
      }, delay * 1000);
    };

    startFallback();

    return () => {
      destroyed = true;
      window.removeEventListener("message", handleMessage);
      fallbackTimerRef.current && clearTimeout(fallbackTimerRef.current);
    };
  }, [embedUrl]);

  const handlePlayNext = (next: PlaybackIntent) => {
    cancelCountdown();
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
          <AnimatePresence>
            {showLoader && !error && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]"
              >
                <div className="h-8 w-8 rounded-full border-2 border-[hsl(var(--foreground)/0.4)] border-t-[hsl(var(--foreground))] animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          <iframe
            ref={iframeRef}
            key={embedUrl}
            src={embedUrl}
            className="w-full h-full border-none"
            allow="autoplay *; fullscreen *; encrypted-media *; picture-in-picture *"
            allowFullScreen
            referrerPolicy="no-referrer"
            onError={() => setError(true)}
          />

          <AnimatePresence>
            {nextOffer && nextOffer.kind !== "END" && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                className="absolute right-6 bottom-24 mb-24 z-30
                  rounded-xl px-5 py-4
                  bg-[hsl(var(--background))]
                  ring-2 ring-[hsl(var(--foreground))]
                  shadow-2xl flex flex-col gap-3 min-w-55"
              >
                <span className="text-sm font-medium text-[hsl(var(--foreground)/0.85)]">
                  {nextOffer.kind === "NEXT_SEASON"
                    ? "Next season ready"
                    : "Next episode ready"}
                </span>

                {countdown !== null && (
                  <span className="text-xs text-[hsl(var(--foreground)/0.6)]">
                    Playing in {countdown}s
                  </span>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePlayNext(nextOffer.intent)}
                    className="flex-1 text-sm font-semibold px-3 py-1.5 rounded-md
                      bg-[hsl(var(--foreground))]
                      text-[hsl(var(--background))]
                      hover:scale-105 transition"
                  >
                    Play now
                  </button>

                  <button
                    onClick={cancelCountdown}
                    className="text-sm px-3 py-1.5 rounded-md
                      ring-1 ring-[hsl(var(--foreground)/0.4)]
                      hover:bg-[hsl(var(--foreground)/0.08)]"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
