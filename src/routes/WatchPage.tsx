"use client";

import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

/* ---------------------------------- HELPERS ---------------------------------- */

function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

export default function WatchPage() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  /* ---------------------------------- BODY LOCK ---------------------------------- */

  useEffect(() => {
    const body = document.body;
    body.classList.add("player-open");
    body.style.overflow = "hidden";

    return () => {
      body.classList.remove("player-open");
      body.style.overflow = "";
    };
  }, []);

  /* ---------------------------------- BUILD INTENT ---------------------------------- */

  const intent = useMemo<PlaybackIntent | null>(() => {
    const tmdbId = Number(params.tmdbId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;

    const seasonParam = params.season;
    const episodeParam = params.episode;

    const season = seasonParam ? Number(seasonParam) : undefined;
    const episode = episodeParam ? Number(episodeParam) : undefined;

    if (
      season !== undefined &&
      episode !== undefined &&
      Number.isFinite(season) &&
      Number.isFinite(episode) &&
      season > 0 &&
      episode > 0
    ) {
      return {
        mediaType: "tv",
        tmdbId,
        season,
        episode,
      };
    }

    return {
      mediaType: "movie",
      tmdbId,
    };
  }, [params.tmdbId, params.season, params.episode]);

  /* Invalid route → go home */
  useEffect(() => {
    if (!intent) {
      navigate("/", { replace: true });
    }
  }, [intent, navigate]);

  if (!intent) return null;

  const key = getIntentKey(intent);

  /* ---------------------------------- CLOSE STRATEGY ---------------------------------- */

  const handleClose = () => {
    const state = location.state as { from?: string } | null;

    // If opened from another page
    if (state?.from) {
      navigate(state.from, { replace: true });
      return;
    }

    // If user opened directly
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    // Fallback
    navigate("/", { replace: true });
  };

  /* ---------------------------------- RENDER ---------------------------------- */

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PlayerModal key={key} intent={intent} onClose={handleClose} />
    </AnimatePresence>
  );
}
