import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchMovies } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface MoviesProps {
  onSelect: (movie: Movie) => void;
}

export default function Movies({ onSelect }: MoviesProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await fetchMovies();
        if (active) setMovies(data);
      } catch (err) {
        console.error("Failed to fetch movies:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (loading) return null;

  return <ContentRail title="Movies" items={movies} onSelect={onSelect} />;
}
