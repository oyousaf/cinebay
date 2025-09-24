import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchShows } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface ShowsProps {
  onSelect: (movie: Movie) => void;
  onWatch: (movie: Movie) => void;
}

export default function Shows({ onSelect, onWatch }: ShowsProps) {
  const [shows, setShows] = useState<Movie[]>([]);

  useEffect(() => {
    let mounted = true;

    fetchShows()
      .then((data) => {
        if (mounted) setShows(data);
      })
      .catch((err) => {
        console.error("Failed to fetch shows:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ContentRail
      title="TV Shows"
      items={shows}
      onSelect={onSelect}
      onWatch={onWatch}
      infoPosition="prime"
    />
  );
}
