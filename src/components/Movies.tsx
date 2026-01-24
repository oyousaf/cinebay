import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchMovies } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface MoviesProps {
  onSelect: (movie: Movie) => void;
}

export default function Movies({ onSelect }: MoviesProps) {
  const [movies, setMovies] = useState<Movie[]>([]);

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
      });

    return () => {
      active = false;
    };
  }, []);

  return <ContentRail items={movies} onSelect={onSelect} />;
}
