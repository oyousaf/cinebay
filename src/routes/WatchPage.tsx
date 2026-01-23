"use client";

import { useNavigate, useParams } from "react-router-dom";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function WatchPage() {
  const navigate = useNavigate();
  const { mediaType, tmdbId, season, episode } = useParams();

  const id = Number(tmdbId);
  if (!mediaType || !Number.isFinite(id)) return null;

  let intent: PlaybackIntent;

  /* ---------- TV ---------- */
  if (mediaType === "tv") {
    const s = Number(season);
    const e = Number(episode);

    if (!Number.isFinite(s) || !Number.isFinite(e)) return null;

    intent = {
      mediaType: "tv",
      tmdbId: id,
      season: s,
      episode: e,
    };
  } else if (mediaType === "movie") {

  /* ---------- MOVIE ---------- */
    intent = {
      mediaType: "movie",
      tmdbId: id,
    };
  } else {

  /* ---------- INVALID ---------- */
    return null;
  }

  return (
    <PlayerModal
      intent={intent}
      onClose={() => navigate(-1)}
      onPlayNext={(next) => {
        if (next.mediaType !== "tv") return;

        navigate(
          `/watch/tv/${next.tmdbId}/${next.season ?? 1}/${next.episode ?? 1}`,
          { replace: true },
        );
      }}
    />
  );
}
