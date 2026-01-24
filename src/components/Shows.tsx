import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchShows } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface ShowsProps {
  onSelect: (movie: Movie) => void;
}

export default function Shows({ onSelect }: ShowsProps) {
  const [shows, setShows] = useState<Movie[]>([]);

  useEffect(() => {
    let active = true;

    fetchShows()
      .then((data) => {
        if (active && Array.isArray(data)) {
          setShows(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch shows:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  return <ContentRail items={shows} onSelect={onSelect} />;
}
