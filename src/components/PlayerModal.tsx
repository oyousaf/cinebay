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

interface PlayerModalProps {
  intent: PlaybackIntent;
  onClose: () => void;
  onPlayNext?: (intent: PlaybackIntent) => void;
}

const getIntentKey = (i: PlaybackIntent) =>
  i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;

export default function PlayerModal({
  intent,
  onClose,
  onPlayNext,
}: PlayerModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const { getTVProgress, reportTVPlayback } = useContinueWatching();
  const { setTabNavigator, setModalOpen } = useNavigation();

  const intentKey = useMemo(() => getIntentKey(intent), [intent]);

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

  const {
    episodeTitle,
    nextEpisodeTitle,
    hasNextEpisode,
    nextIntent,
    runtimeSeconds,
  } = useEpisodeMeta(intent);

  const { maybeQueueProgress, flushPendingProgress, resetProgressTracking } =
    useProgressTracker(intent, reportTVPlayback);

  const {
    showNextOverlay,
    lastKnownTimeRef,
    lastEventTimeRef,
    isScrubbingRef,
    resetPlaybackEvents,
    lastKnownDurationRef,
    isPlaybackActiveRef,
  } = usePlaybackEvents({
    iframeRef,
    markPlaybackStarted,
    intentKey,
    runtimeSeconds,
  });

  useWatchdog({
    provider,
    lastEventTimeRef,
    isScrubbingRef,
    isPlaybackActiveRef,
    fallbackProvider,
    scheduleHideLoader,
    playbackStartedRef,
    lastKnownTimeRef,
    lastKnownDurationRef,
    runtimeSeconds,
  });

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
  }, [intent, intentKey, getTVProgress, setStartAt]);

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

  useEffect(() => {
    if (intent.mediaType !== "tv") return;

    const interval = window.setInterval(() => {
      const t = lastKnownTimeRef.current;
      if (typeof t === "number" && t > 0) {
        maybeQueueProgress(t);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [intent.mediaType, maybeQueueProgress, lastKnownTimeRef]);

  const handleClose = useCallback(() => {
    flushPendingProgress();
    resetPlaybackEvents();
    onClose();
  }, [flushPendingProgress, resetPlaybackEvents, onClose]);

  const handlePlayNext = useCallback(() => {
    if (!nextIntent) return;

    flushPendingProgress();
    resetPlaybackEvents();
    onPlayNext?.(nextIntent);
  }, [nextIntent, flushPendingProgress, resetPlaybackEvents, onPlayNext]);

  useEffect(() => {
    const nav = (dir: "up" | "down" | "escape") => {
      if (dir === "escape") handleClose();
    };

    setTabNavigator(nav);
    setModalOpen(true);

    return () => {
      setTabNavigator(() => {});
      setModalOpen(false);
    };
  }, [handleClose, setTabNavigator, setModalOpen]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/0.35)] backdrop-blur-md px-3 sm:px-6"
    >
      <motion.div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]">
        <iframe
          ref={iframeRef}
          key={`${intentKey}-${providerIndex}`}
          src={embedUrl}
          className="w-full h-full border-none"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
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
          <div className="absolute top-4 left-4 z-20 text-sm bg-[hsl(var(--background)/0.9)] px-3 py-1.5 rounded-lg">
            S{intent.season} · E{intent.episode}
            <span className="ml-2 opacity-80">{episodeTitle}</span>
          </div>
        )}

        <AnimatePresence>
          {showNextOverlay && hasNextEpisode && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-20 right-6 z-40 bg-[hsl(var(--background)/0.95)] ring-2 ring-[hsl(var(--foreground))] rounded-xl px-4 py-3 shadow-lg flex items-center gap-4 max-w-xs"
            >
              <div className="text-sm">
                <div className="text-xs opacity-70">Up next</div>

                <div className="font-semibold">
                  {nextIntent
                    ? `S${nextIntent.season} · E${nextIntent.episode}`
                    : "Loading next episode..."}
                </div>

                {nextEpisodeTitle && (
                  <div className="text-xs opacity-80 mt-1 line-clamp-2">
                    {nextEpisodeTitle}
                  </div>
                )}
              </div>

              <button
                onClick={handlePlayNext}
                disabled={!nextIntent}
                className="h-10 w-10 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center disabled:opacity-50"
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
