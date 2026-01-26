"use client";

import ContentRail from "@/components/ContentRail";
import { fetchMovies } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { useRailData } from "@/hooks/useRailData";

interface MoviesProps {
  onSelect: (movie: Movie) => void;
}

export default function Movies({ onSelect }: MoviesProps) {
  const movies = useRailData<Movie>(fetchMovies);

  /* ---------- Not ready ---------- */
  if (movies === null) {
    return null;
  }

  /* ---------- Empty ---------- */
  if (movies.length === 0) {
    return null;
  }

  /* ---------- Ready ---------- */
  return <ContentRail items={movies} onSelect={onSelect} />;
}
