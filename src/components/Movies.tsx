import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchMovies } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface MoviesProps {
  onSelect: (movie: Movie) => void;
  onWatch: (movie: Movie) => void;
}

export default function Movies({ onSelect, onWatch }: MoviesProps) {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    let mounted = true;

    fetchMovies()
      .then((data) => {
        if (mounted) setMovies(data);
      })
      .catch((err) => {
        console.error("Failed to fetch movies:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ContentRail
      title="Movies"
      items={movies}
      onSelect={onSelect}
      onWatch={onWatch}
    />
  );
}
