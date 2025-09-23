import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchMovies } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

export default function Movies({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetchMovies().then(setMovies);
  }, []);

  return (
    <ContentRail
      title="Movies"
      items={movies}
      onSelect={onSelect}
      infoPosition="prime"
    />
  );
}
