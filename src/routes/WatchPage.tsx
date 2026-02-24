"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

export default function WatchPage() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const [visible, setVisible] = useState(true);

  /* Lock body */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  /* Build intent */
  const intent = useMemo<PlaybackIntent | null>(() => {
    const tmdbId = Number(params.tmdbId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;

    const season = params.season ? Number(params.season) : undefined;
    const episode = params.episode ? Number(params.episode) : undefined;

    if (
      season !== undefined &&
      episode !== undefined &&
      Number.isFinite(season) &&
      Number.isFinite(episode)
    ) {
      return { mediaType: "tv", tmdbId, season, episode };
    }

    return { mediaType: "movie", tmdbId };
  }, [params.tmdbId, params.season, params.episode]);

  if (!intent) return null;

  const key = getIntentKey(intent);

  /* ---------- CLOSE STRATEGY ---------- */

  const handleClose = () => {
    // Start exit animation
    setVisible(false);

    // Wait for AnimatePresence exit
    setTimeout(() => {
      const state = location.state as { from?: string } | null;

      if (state?.from) {
        navigate(state.from, { replace: true });
        return;
      }

      if (window.history.length > 1) {
        navigate(-1);
        return;
      }

      navigate("/", { replace: true });
    }, 220);
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <PlayerModal key={key} intent={intent} onClose={handleClose} />
      )}
    </AnimatePresence>
  );
}
