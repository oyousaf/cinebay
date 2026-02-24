"use client";

import { useEffect, useMemo } from "react";
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

  /* Lock body */
  useEffect(() => {
    document.body.classList.add("player-open");
    return () => document.body.classList.remove("player-open");
  }, []);

  /* Build intent */
  const intent = useMemo<PlaybackIntent | null>(() => {
    const tmdbId = Number(params.tmdbId);
    if (!Number.isFinite(tmdbId)) return null;

    const season = params.season ? Number(params.season) : undefined;
    const episode = params.episode ? Number(params.episode) : undefined;

    if (Number.isFinite(season) && Number.isFinite(episode)) {
      return { mediaType: "tv", tmdbId, season, episode };
    }

    return { mediaType: "movie", tmdbId };
  }, [params.tmdbId, params.season, params.episode]);

  if (!intent) return null;

  const key = getIntentKey(intent);

  /* ---------- CLOSE STRATEGY ---------- */
  const handleClose = () => {
    const from = (location.state as any)?.from;
    navigate(from || "/", { replace: true });
  };

  return (
    <AnimatePresence mode="wait">
      <PlayerModal
        key={key}
        intent={intent}
        onClose={handleClose}
        onPlayNext={(next) => {
          if (next.mediaType === "tv") {
            navigate(
              `/watch/tv/${next.tmdbId}/${next.season}/${next.episode}`,
              { replace: true },
            );
          }
        }}
      />
    </AnimatePresence>
  );
}
