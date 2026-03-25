"use client";

import { useEffect, useMemo, useCallback } from "react";
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

/* ======================================================================== */

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext?: (intent: PlaybackIntent) => void;
}

/* ======================================================================== */

function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

/* ======================================================================== */

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const { getTVProgress, reportTVPlayback } = useContinueWatching();
  const { setTabNavigator, setModalOpen } = useNavigation();

  const intentKey = useMemo(() => getIntentKey(intent), [intent]);

  /* ------------------------------------------------------------------ */
  /* PLAYER CORE                                                        */
  /* ------------------------------------------------------------------ */

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
  } = usePlayerCore(intent);

  /* ------------------------------------------------------------------ */
  /* EPISODE META                                                       */
  /* ------------------------------------------------------------------ */

  const { episodeTitle, nextEpisodeTitle, hasNextEpisode, nextIntent } =
    useEpisodeMeta(intent);

  /* ------------------------------------------------------------------ */
  /* PROGRESS                                                           */
  /* ------------------------------------------------------------------ */

  const { maybeQueueProgress, flushPendingProgress, resetProgressTracking } =
    useProgressTracker(intent, reportTVPlayback);

  /* ------------------------------------------------------------------ */
  /* PLAYBACK EVENTS                                                    */
  /* ------------------------------------------------------------------ */

  const {
    showNextOverlay,
    setShowNextOverlay,
    resetPlaybackEvents,
    lastEventTimeRef,
    isScrubbingRef,
  } = usePlaybackEvents({
    intent,
    hasNextEpisode,
    maybeQueueProgress,
    markPlaybackStarted,
  });

  /* ------------------------------------------------------------------ */
  /* WATCHDOG                                                           */
  /* ------------------------------------------------------------------ */

  useWatchdog({
    provider,
    lastEventTimeRef,
    isScrubbingRef,
    fallbackProvider,
    scheduleHideLoader,
    playbackStarted: true,
  });

  /* ------------------------------------------------------------------ */
  /* RESUME                                                             */
  /* ------------------------------------------------------------------ */

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
    } else {
      setStartAt(0);
    }
  }, [
    intentKey,
    intent.mediaType,
    intent.tmdbId,
    intent.season,
    intent.episode,
    getTVProgress,
    setStartAt,
  ]);

  /* ------------------------------------------------------------------ */
  /* RESET                                                              */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    flushPendingProgress();
    resetProgressTracking();
    resetPlaybackEvents();
    setShowNextOverlay(false);
  }, [
    intentKey,
    flushPendingProgress,
    resetProgressTracking,
    resetPlaybackEvents,
    setShowNextOverlay,
  ]);

  /* ------------------------------------------------------------------ */
  /* ACTIONS                                                            */
  /* ------------------------------------------------------------------ */

  const handleClose = useCallback(() => {
    flushPendingProgress();
    onClose();
  }, [flushPendingProgress, onClose]);

  const handlePlayNext = useCallback(() => {
    if (!nextIntent) return;

    flushPendingProgress();
    setShowNextOverlay(false);
    onPlayNext?.(nextIntent);
  }, [flushPendingProgress, nextIntent, onPlayNext, setShowNextOverlay]);

  /* ------------------------------------------------------------------ */
  /* NAVIGATION                                                         */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleNav = (dir: "up" | "down" | "escape") => {
      if (dir === "escape") handleClose();
    };

    setTabNavigator(handleNav);
    setModalOpen(true);

    return () => {
      setTabNavigator(() => {});
      setModalOpen(false);
    };
  }, [handleClose, setTabNavigator, setModalOpen]);

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/0.35)] backdrop-blur-md px-3 sm:px-6"
    >
      <motion.div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]">
        <iframe
          key={`${intentKey}-${providerIndex}`}
          src={embedUrl}
          className="w-full h-full border-none"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
          onLoad={onIframeLoad}
        />

        <AnimatePresence>
          {showLoader && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]"
            >
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
          <div className="absolute top-4 left-4 z-20 text-sm bg-[hsl(var(--background)/0.9)] px-3 py-1.5 rounded-lg">
            S{intent.season} · E{intent.episode}
            <span className="ml-2 opacity-80">{episodeTitle}</span>
          </div>
        )}

        <AnimatePresence>
          {showNextOverlay && nextIntent && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-20 right-6 z-30 bg-[hsl(var(--background)/0.95)] ring-2 ring-[hsl(var(--foreground))] rounded-xl px-4 py-3 shadow-lg flex items-center gap-4 max-w-xs"
            >
              <div className="text-sm">
                <div className="text-xs opacity-70">Up next</div>

                <div className="font-semibold">
                  S{nextIntent.season} · E{nextIntent.episode}
                </div>

                {nextEpisodeTitle && (
                  <div className="text-xs opacity-80 mt-1 line-clamp-2">
                    {nextEpisodeTitle}
                  </div>
                )}
              </div>

              <button
                onClick={handlePlayNext}
                className="h-10 w-10 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center"
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
