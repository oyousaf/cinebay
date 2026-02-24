"use client";

import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function WatchPage() {
  const navigate = useNavigate();
  const params = useParams();

  useEffect(() => {
    document.body.classList.add("player-open");
    return () => document.body.classList.remove("player-open");
  }, []);

  const intent = useMemo<PlaybackIntent | null>(() => {
    const tmdbId = params.tmdbId ? Number(params.tmdbId) : NaN;
    if (!Number.isFinite(tmdbId)) return null;

    const season = params.season ? Number(params.season) : undefined;
    const episode = params.episode ? Number(params.episode) : undefined;

    if (Number.isFinite(season) && Number.isFinite(episode)) {
      return {
        mediaType: "tv",
        tmdbId,
        season: season as number,
        episode: episode as number,
      };
    }

    return { mediaType: "movie", tmdbId };
  }, [params.tmdbId, params.season, params.episode]);

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
