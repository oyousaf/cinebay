import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface DevsPickProps {
  onSelect: (movie: Movie) => void;
  onWatch: (movie: Movie) => void;
}

export default function DevsPick({ onSelect, onWatch }: DevsPickProps) {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await fetchDevsPick();
        if (active) setMovies(data);
      } catch (err) {
        console.error("Failed to fetch Dev’s Pick:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <ContentRail
      title="Dev’s Pick"
      items={movies}
      onSelect={onSelect}
      onWatch={onWatch}
    />
  );
}
