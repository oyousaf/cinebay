"use client";

import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function WatchPage() {
  const navigate = useNavigate();
  const params = useParams()

  /* -------------------------------------------------
     LOCK BODY SCROLL (ROUTE-LEVEL PLAYER)
  -------------------------------------------------- */
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  /* -------------------------------------------------
     BUILD PLAYBACK INTENT
  -------------------------------------------------- */
  const intent = useMemo<PlaybackIntent | null>(() => {
    if (params.tmdbId && params.season && params.episode) {
      return {
        mediaType: "tv",
        tmdbId: Number(params.tmdbId),
        season: Number(params.season),
        episode: Number(params.episode),
      };
    }

    if (params.tmdbId) {
      return {
        mediaType: "movie",
        tmdbId: Number(params.tmdbId),
      };
    }

    return null;
  }, [params]);

  if (!intent) return null;

  return (
    <PlayerModal
      intent={intent}
      onClose={() => navigate(-1)}
      onPlayNext={(next) => {
        if (next.mediaType === "tv") {
          navigate(`/watch/tv/${next.tmdbId}/${next.season}/${next.episode}`, {
            replace: true,
          });
        }
      }}
    />
  );
}
