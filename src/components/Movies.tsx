import { useEffect, useState } from "react";
import Scroll from "@/components/Scroll";
import { fetchMovies } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { motion } from "framer-motion";
import { Clapperboard } from "lucide-react";

export default function Movies({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies()
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center text-zinc-500">
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        >
          <Clapperboard size={48} strokeWidth={2.2} />
        </motion.div>
        <div className="mt-4 text-lg font-medium">Loading movies...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Scroll title="Movies" items={movies} onSelect={onSelect} />
    </motion.div>
  );
}
