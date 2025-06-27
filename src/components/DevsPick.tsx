import { useEffect, useState } from "react";
import Scroll from "@/components/Scroll";
import { DEVS_PICK_TITLES } from "@/lib/constants/devsPick";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export default function DevsPick({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevsPick(DEVS_PICK_TITLES)
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center text-zinc-500">
        <motion.div
          initial={{ scale: 0.8, rotate: 0 }}
          animate={{ scale: 1.1, rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            ease: "linear",
            repeatType: "loop",
          }}
        >
          <Star size={48} strokeWidth={2.2} />
        </motion.div>
        <div className="mt-4 text-lg font-medium">Loading Dev’s Picks...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Scroll title="Dev's Pick" items={movies} onSelect={onSelect} />
    </motion.div>
  );
}
