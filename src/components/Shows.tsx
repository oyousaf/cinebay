import { useEffect, useState } from "react";
import Scroll from "@/components/Scroll";
import { fetchShows } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { motion } from "framer-motion";
import { Tv2 } from "lucide-react"; // 👈 TV icon for shows

export default function Shows({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [shows, setShows] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShows()
      .then(setShows)
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
          <Tv2 size={48} strokeWidth={2.2} />
        </motion.div>
        <div className="mt-4 text-lg font-medium">Loading shows...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Scroll title="Shows" items={shows} onSelect={onSelect} />
    </motion.div>
  );
}
