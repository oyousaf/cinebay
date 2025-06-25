import { useEffect, useState } from "react";
import Scroll from "@/components/Scroll";
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

  return <Scroll title="Movies" items={movies} onSelect={onSelect} />;
}
