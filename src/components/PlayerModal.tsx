"use client";

import { useEffect, useMemo, useCallback, useRef } from "react";

import { X, Play, LoaderCircle } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

import { useContinueWatching } from "@/hooks/useContinueWatching";

import { useNavigation } from "@/context/NavigationContext";

import { usePlayerCore } from "@/hooks/player/usePlayerCore";
import { useEpisodeMeta } from "@/hooks/player/useEpisodeMeta";
import { useProgressTracker } from "@/hooks/player/useProgressTracker";
import { usePlaybackEvents } from "@/hooks/player/usePlaybackEvents";
import { useWatchdog } from "@/hooks/player/useWatchdog";

/* ---------------------------------- TYPES ---------------------------------- */

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext?: (intent: PlaybackIntent) => void;
}

/* ---------------------------------- HELPERS ---------------------------------- */

const getIntentKey = (intent: PlaybackIntent) =>
  intent.mediaType === "tv"
    ? `${intent.tmdbId}-s${intent.season ?? 1}-e${intent.episode ?? 1}`
    : `${intent.tmdbId}-movie`;

/* ---------------------------------- COMPONENT ---------------------------------- */

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /* ---------------------------------- CONTEXT ---------------------------------- */

  const { getTVProgress, reportTVPlayback } = useContinueWatching();

  const { setTabNavigator, setModalOpen } = useNavigation();

  /* ---------------------------------- MEMO ---------------------------------- */

  const intentKey = useMemo(() => getIntentKey(intent), [intent]);

  /* ---------------------------------- PLAYER CORE ---------------------------------- */

  const {
    provider,
    providerIndex,
    embedUrl,

    showLoader,
    onIframeLoad,

    fallbackProvider,

    markPlaybackStarted,

    setStartAt,

    scheduleHideLoader,

    playbackStartedRef,
  } = usePlayerCore(intent);

  /* ---------------------------------- EPISODE META ---------------------------------- */

  const {
    episodeTitle,
    nextEpisodeTitle,

    hasNextEpisode,
    nextIntent,

    runtimeSeconds,
  } = useEpisodeMeta(intent);

  /* ---------------------------------- PROGRESS ---------------------------------- */

  const { maybeQueueProgress, flushPendingProgress, resetProgressTracking } =
    useProgressTracker(intent, reportTVPlayback);

  /* ---------------------------------- PLAYBACK EVENTS ---------------------------------- */

  const {
    showNextOverlay,

    lastKnownTimeRef,
    lastKnownDurationRef,

    lastEventTimeRef,
    lastRealProgressAtRef,

    isScrubbingRef,
    isPlaybackActiveRef,
    isPlaybackPausedRef,

    resetPlaybackEvents,
  } = usePlaybackEvents({
    iframeRef,
    markPlaybackStarted,
    intentKey,
    runtimeSeconds,
  });

  /* ---------------------------------- WATCHDOG ---------------------------------- */

  useWatchdog({
    provider,

    lastEventTimeRef,
    lastRealProgressAtRef,

    isScrubbingRef,
    isPlaybackActiveRef,
    isPlaybackPausedRef,

    fallbackProvider,
    scheduleHideLoader,

    playbackStartedRef,

    lastKnownTimeRef,
    lastKnownDurationRef,

    runtimeSeconds,
  });

  /* ---------------------------------- PRECONNECT ---------------------------------- */

  useEffect(() => {
    try {
      const url = new URL(embedUrl);

      const link = document.createElement("link");

      link.rel = "preconnect";
      link.href = url.origin;

      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    } catch {
      return;
    }
  }, [embedUrl]);

  /* ---------------------------------- RESUME POSITION ---------------------------------- */

  useEffect(() => {
    if (intent.mediaType !== "tv") {
      setStartAt(0);

      return;
    }

    const progress = getTVProgress(intent.tmdbId);

    if (
      progress &&
      progress.season === intent.season &&
      progress.episode === intent.episode
    ) {
      setStartAt(progress.position);

      return;
    }

    setStartAt(0);
  }, [intent, getTVProgress, setStartAt]);

  /* ---------------------------------- RESET ON CHANGE ---------------------------------- */

  useEffect(() => {
    flushPendingProgress();

    resetProgressTracking();

    resetPlaybackEvents();
  }, [
    intentKey,
    flushPendingProgress,
    resetProgressTracking,
    resetPlaybackEvents,
  ]);

  /* ---------------------------------- TV PROGRESS LOOP ---------------------------------- */

  useEffect(() => {
    if (intent.mediaType !== "tv") {
      return;
    }

    const interval = window.setInterval(() => {
      if (!isPlaybackActiveRef.current) {
        return;
      }

      if (isPlaybackPausedRef.current) {
        return;
      }

      const currentTime = lastKnownTimeRef.current;

      if (typeof currentTime === "number" && currentTime > 0) {
        maybeQueueProgress(currentTime);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [
    intent.mediaType,
    maybeQueueProgress,
    isPlaybackActiveRef,
    isPlaybackPausedRef,
    lastKnownTimeRef,
  ]);

  /* ---------------------------------- CLOSE ---------------------------------- */

  const handleClose = useCallback(() => {
    flushPendingProgress();

    resetPlaybackEvents();

    onClose();
  }, [flushPendingProgress, resetPlaybackEvents, onClose]);

  /* ---------------------------------- NEXT EPISODE ---------------------------------- */

  const handlePlayNext = useCallback(() => {
    if (!nextIntent) {
      return;
    }

    flushPendingProgress();

    resetPlaybackEvents();

    onPlayNext?.(nextIntent);
  }, [nextIntent, flushPendingProgress, resetPlaybackEvents, onPlayNext]);

  /* ---------------------------------- NAVIGATION ---------------------------------- */

  useEffect(() => {
    const nav = (dir: "up" | "down" | "escape") => {
      if (dir === "escape") {
        handleClose();
      }
    };

    setTabNavigator(nav);

    setModalOpen(true);

    return () => {
      setTabNavigator(null);

      setModalOpen(false);
    };
  }, [handleClose, setTabNavigator, setModalOpen]);

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-3 sm:px-6"
    >
      <motion.div className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-2xl bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]">
        <iframe
          ref={iframeRef}
          key={`${intentKey}-${providerIndex}`}
          src={embedUrl}
          className="h-full w-full border-none"
          loading="eager"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={onIframeLoad}
        />

        <AnimatePresence>
          {showLoader && (
            <motion.div className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]">
              <LoaderCircle className="h-10 w-10 animate-spin text-[hsl(var(--foreground))]" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]"
        >
          <X size={22} className="m-2" />
        </button>

        {episodeTitle && intent.mediaType === "tv" && (
          <div className="absolute top-4 left-4 z-20 rounded-lg bg-[hsl(var(--background)/0.9)] px-3 py-1.5 text-sm">
            S{intent.season} · E{intent.episode}
            <span className="ml-2 opacity-80">{episodeTitle}</span>
          </div>
        )}

        <AnimatePresence>
          {showNextOverlay && hasNextEpisode && (
            <motion.div
              initial={{
                opacity: 0,
                y: 16,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              className="absolute right-6 bottom-20 z-40 flex max-w-xs items-center gap-4 rounded-xl bg-[hsl(var(--background)/0.95)] px-4 py-3 shadow-lg ring-2 ring-[hsl(var(--foreground))]"
            >
              <div className="text-sm">
                <div className="text-xs opacity-70">Up next</div>

                <div className="font-semibold">
                  {nextIntent
                    ? `S${nextIntent.season} · E${nextIntent.episode}`
                    : "Loading next episode..."}
                </div>

                {nextEpisodeTitle && (
                  <div className="mt-1 line-clamp-2 text-xs opacity-80">
                    {nextEpisodeTitle}
                  </div>
                )}
              </div>

              <button
                onClick={handlePlayNext}
                disabled={!nextIntent}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] disabled:opacity-50"
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
