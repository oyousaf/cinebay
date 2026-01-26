"use client";

import ContentRail from "@/components/ContentRail";
import { fetchShows } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { useRailData } from "@/hooks/useRailData";

interface ShowsProps {
  onSelect: (movie: Movie) => void;
}

export default function Shows({ onSelect }: ShowsProps) {
  const shows = useRailData<Movie>(fetchShows);

  /* ---------- Not ready ---------- */
  if (shows === null) {
    return null;
  }

  /* ---------- Empty ---------- */
  if (shows.length === 0) {
    return null;
  }

  /* ---------- Ready ---------- */
  return <ContentRail items={shows} onSelect={onSelect} />;
}
