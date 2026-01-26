import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import Skeleton from "@/components/Skeleton";
import { fetchMovies } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface MoviesProps {
  onSelect: (movie: Movie) => void;
}

export default function Movies({ onSelect }: MoviesProps) {
  const [movies, setMovies] = useState<Movie[] | null>(null);

  useEffect(() => {
    let active = true;

    fetchMovies()
      .then((data) => {
        if (active && Array.isArray(data)) {
          setMovies(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch movies:", err);
        if (active) setMovies([]);
      });

    return () => {
      active = false;
    };
  }, []);

  /* ---------- Loading ---------- */
  if (movies === null) {
    return <Skeleton />;
  }

  /* ---------- Empty ---------- */
  if (movies.length === 0) {
    return null;
  }

  /* ---------- Ready ---------- */
  return <ContentRail items={movies} onSelect={onSelect} />;
}
