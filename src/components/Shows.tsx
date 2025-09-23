import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchShows } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

export default function Shows({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [shows, setShows] = useState<Movie[]>([]);

  useEffect(() => {
    fetchShows().then(setShows);
  }, []);

  return (
    <ContentRail
      title="TV Shows"
      items={shows}
      onSelect={onSelect}
      infoPosition="prime"
    />
  );
}
