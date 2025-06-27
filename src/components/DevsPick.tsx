import { useEffect, useState } from "react";
import Scroll from "@/components/Scroll";
import { DEVS_PICK_TITLES } from "@/lib/constants/devsPick";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

export default function DevsPick({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [movies, setMovies] = useState<Movie[]>([]);
  useEffect(() => {
    fetchDevsPick(DEVS_PICK_TITLES).then(setMovies);
  }, []);

  return <Scroll title="Dev's Pick" items={movies} onSelect={onSelect} />;
}
