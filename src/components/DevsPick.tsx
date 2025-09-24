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
    let mounted = true;

    fetchDevsPick()
      .then((data) => {
        if (mounted) setMovies(data);
      })
      .catch((err) => {
        console.error("Failed to fetch dev’s picks:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ContentRail
      title="Dev’s Pick"
      items={movies}
      onSelect={onSelect}
      onWatch={onWatch}
      infoPosition="prime"
    />
  );
}
