import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import Skeleton from "@/components/Skeleton";
import { fetchShows } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface ShowsProps {
  onSelect: (movie: Movie) => void;
}

export default function Shows({ onSelect }: ShowsProps) {
  const [shows, setShows] = useState<Movie[] | null>(null);

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
        if (active) setShows([]);
      });

    return () => {
      active = false;
    };
  }, []);

  /* ---------- Loading ---------- */
  if (shows === null) {
    return <Skeleton />;
  }

  /* ---------- Empty ---------- */
  if (shows.length === 0) {
    return null;
  }

  /* ---------- Ready ---------- */
  return <ContentRail items={shows} onSelect={onSelect} />;
}
