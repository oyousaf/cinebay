import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

export default function DevsPick({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetchDevsPick().then(setMovies);
  }, []);

  return (
    <ContentRail
      title="Dev’s Pick"
      items={movies}
      onSelect={onSelect}
      infoPosition="prime"
    />
  );
}
