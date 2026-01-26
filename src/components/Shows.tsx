"use client";

import ContentRail from "@/components/ContentRail";
import Skeleton from "@/components/Skeleton";
import { fetchShows } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { useRailData } from "@/hooks/useRailData";

interface ShowsProps {
  onSelect: (movie: Movie) => void;
}

export default function Shows({ onSelect }: ShowsProps) {
  const shows = useRailData<Movie>(fetchShows);

  /* ---------- Loading ---------- */
  if (shows === null) {
    return <Skeleton />;
  }

  /* ---------- Empty ---------- */
  if (shows.length === 0) {
    return null;
  }

  /* ---------- Ready ---------- */
  return <ContentRail items={shows} onSelect={onSelect} />;
}
