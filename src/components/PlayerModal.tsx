"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { FaPlay } from "react-icons/fa";
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
const FALLBACK_RUNTIME = 42 * 60;
const DEFAULT_TRIGGER_WINDOW = 120;

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [error, setError] = useState(false);
  const [nextOffer, setNextOffer] = useState<NextEpisodeResult | null>(null);
  const [frameKey, setFrameKey] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const intentRef = useRef(intent);

  const offeredRef = useRef(false);
  const resumeWrittenRef = useRef(false);
  const lastTimeRef = useRef(0);
  const triggerWindowRef = useRef(DEFAULT_TRIGGER_WINDOW);

  const cooldownRef = useRef(false);
  const inFlightRef = useRef(false);

  const loaderTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);

  const { setTVProgress } = useContinueWatching();

  const embedUrl = useMemo(
    () => buildEmbedUrl(EMBED_PROVIDERS[0], intent),
    [intent],
  );

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  const clearTimers = () => {
    if (loaderTimerRef.current) {
      clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  };

  /* Reset when episode changes */
  useEffect(() => {
    setError(false);
    setNextOffer(null);
    setShowLoader(true);

    offeredRef.current = false;
    resumeWrittenRef.current = false;
    lastTimeRef.current = 0;

    triggerWindowRef.current = DEFAULT_TRIGGER_WINDOW;

    cooldownRef.current = false;
    inFlightRef.current = false;

    clearTimers();

    loaderTimerRef.current = window.setTimeout(
      () => setShowLoader(false),
      LOADER_MIN_MS,
    );

    return clearTimers;
  }, [embedUrl]);

  /* Continue Watching */
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
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };
  }, [embedUrl, setTVProgress]);

  /* Next episode detection */
  useEffect(() => {
    if (intent.mediaType !== "tv") return;

    const armCooldown = () => {
      cooldownRef.current = true;
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = window.setTimeout(() => {
        cooldownRef.current = false;
        cooldownTimerRef.current = null;
      }, 800);
    };

    const triggerOffer = async () => {
      if (offeredRef.current || cooldownRef.current || inFlightRef.current)
        return;

      const startSeason = intentRef.current.season;
      const startEpisode = intentRef.current.episode;

      if (typeof startSeason !== "number" || typeof startEpisode !== "number")
        return;

      armCooldown();
      inFlightRef.current = true;

      try {
        const result = await resolveNextEpisode(intentRef.current);

        if (
          intentRef.current.season !== startSeason ||
          intentRef.current.episode !== startEpisode
        ) {
          return;
        }

        if (!result || result.kind === "END") return;

        offeredRef.current = true;
        setNextOffer(result);
      } finally {
        inFlightRef.current = false;
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;

      const message = event.data;
      if (!message || typeof message !== "object") return;
      if ((message as any).type !== "PLAYER_EVENT") return;

      const payload = (message as any).data;
      if (!payload) return;

      const current = payload.currentTime;
      const duration = payload.duration;
      const eventName = payload.event;

      if (
        typeof current !== "number" ||
        typeof duration !== "number" ||
        duration <= 0
      )
        return;

      const remaining = duration - current;

      const jumpedForward = current - lastTimeRef.current > 20;
      lastTimeRef.current = current;

      if (eventName === "timeupdate") {
        if (remaining <= triggerWindowRef.current) triggerOffer();
        if (jumpedForward && remaining <= triggerWindowRef.current + 15)
          triggerOffer();
      }

      if (eventName === "ended" || remaining <= 1) {
        triggerOffer();
      }
    };

    window.addEventListener("message", handleMessage);

    /* Runtime fallback */
    const startFallback = async () => {
      let runtime = FALLBACK_RUNTIME;

      try {
        const i = intentRef.current;
        if (typeof i.season === "number" && typeof i.episode === "number") {
          const r = await fetchEpisodeRuntime(i.tmdbId, i.season, i.episode);
          if (r && r > 600 && r < 10800) runtime = r;
        }
      } catch {}

      if (runtime < 25 * 60) triggerWindowRef.current = 90;
      else if (runtime < 60 * 60) triggerWindowRef.current = 120;
      else triggerWindowRef.current = 180;

      const delay = Math.max(runtime - triggerWindowRef.current, 60);

      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = window.setTimeout(() => {
        triggerOffer();
      }, delay * 1000);
    };

    startFallback();

    return () => {
      window.removeEventListener("message", handleMessage);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [embedUrl, intent.mediaType]);

  /* Play next */
  const handlePlayNext = (next: PlaybackIntent) => {
    offeredRef.current = false;
    inFlightRef.current = false;
    lastTimeRef.current = 0;
    cooldownRef.current = false;

    clearTimers();

    setNextOffer(null);
    setFrameKey((k) => k + 1);
    onPlayNext(next);
  };

  /* UI */
  return (
    <AnimatePresence>
      <motion.div
        key={embedUrl}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/0.35)]
        backdrop-blur-md px-3 sm:px-6"
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
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
            key={`${embedUrl}-${frameKey}`}
            src={embedUrl}
            className="w-full h-full border-none"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onError={() => setError(true)}
          />

          <AnimatePresence>
            {nextOffer && nextOffer.kind !== "END" && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                className="absolute right-6 bottom-24 z-30 rounded-xl px-4 py-3 bg-[hsl(var(--background))]
                  ring-2 ring-[hsl(var(--foreground))] shadow-2xl flex items-center gap-3"
              >
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-[hsl(var(--foreground)/0.9)]">
                    {nextOffer.kind === "NEXT_SEASON"
                      ? "Next season ready"
                      : "Next episode ready"}
                  </span>

                  {typeof (nextOffer as any).intent?.season === "number" &&
                    typeof (nextOffer as any).intent?.episode === "number" && (
                      <span className="text-xs text-[hsl(var(--foreground)/0.6)]">
                        S{(nextOffer as any).intent.season} · E
                        {(nextOffer as any).intent.episode}
                      </span>
                    )}
                </div>

                {"intent" in nextOffer && (
                  <button
                    onClick={() => handlePlayNext(nextOffer.intent)}
                    className="flex items-center justify-center h-10 w-10 rounded-full
                      bg-[hsl(var(--foreground))] text-[hsl(var(--background))]
                      hover:scale-105 transition"
                  >
                    <FaPlay size={18} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 rounded-full bg-[hsl(var(--background))]
              ring-2 ring-[hsl(var(--foreground))] hover:scale-105 transition"
          >
            <X size={22} className="m-2 text-[hsl(var(--foreground))]" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
