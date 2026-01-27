"use client";

import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function WatchPage() {
  const navigate = useNavigate();
  const params = useParams();

  /* -------------------------------------------------
     BODY STATE (SYNC, NO LAYOUT SHIFT)
  -------------------------------------------------- */
  if (typeof document !== "undefined") {
    document.body.classList.add("player-open");
  }

  useEffect(() => {
    return () => {
      document.body.classList.remove("player-open");
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
  }, [params.tmdbId, params.season, params.episode]);

  if (!intent) return null;

  /* -------------------------------------------------
     RENDER
  -------------------------------------------------- */
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
