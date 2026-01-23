"use client";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function WatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  let intent: PlaybackIntent | null = null;

  if (location.pathname.startsWith("/watch/movie")) {
    if (!params.tmdbId) return null;

    intent = {
      mediaType: "movie",
      tmdbId: Number(params.tmdbId),
    };
  }

  if (location.pathname.startsWith("/watch/tv")) {
    const { tmdbId, season, episode } = params;
    if (!tmdbId || !season || !episode) return null;

    intent = {
      mediaType: "tv",
      tmdbId: Number(tmdbId),
      season: Number(season),
      episode: Number(episode),
    };
  }

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
