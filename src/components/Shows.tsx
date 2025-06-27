import { useEffect, useState } from "react";
import Scroll from "@/components/Scroll";
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

  return <Scroll title="Shows" items={shows} onSelect={onSelect} />;
}
