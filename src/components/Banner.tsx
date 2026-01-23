"use client";

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import type { Movie } from "@/types/movie";
import { FaInfoCircle, FaPlay } from "react-icons/fa";
import { Bookmark } from "lucide-react";

import { useWatchlist } from "@/context/WatchlistContext";
import { useContinueWatching } from "@/hooks/useContinueWatching";

interface BannerProps {
  item: Movie;
  onSelect: (movie: Movie) => void;
}

export default function Banner({ item, onSelect }: BannerProps) {
  const navigate = useNavigate();
  const isTV = item.media_type === "tv";

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const isSaved = isInWatchlist(item.id);

  const { getTVProgress } = useContinueWatching();

  /* ---------- RESUME (SYNC, FAST) ---------- */
  const resume = useMemo(() => {
    if (!isTV) return null;
    return getTVProgress(item.id);
  }, [isTV, item.id, getTVProgress]);

  const hasResume = Boolean(resume);

  /* ---------- PLAY (ROUTE-BASED) ---------- */
  const handlePlay = () => {
    if (isTV) {
      navigate(
        `/watch/tv/${item.id}/${resume?.season ?? 1}/${resume?.episode ?? 1}`,
      );
      return;
    }

    navigate(`/watch/movie/${item.id}`);
  };

  /* ---------- MOTION ---------- */
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.18, ease: "easeOut" },
    },
    exit: { opacity: 0, y: 4 },
  };

  const childVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.16, ease: "easeOut" },
    },
  };

  /* ---------- UI ---------- */
  return (
    <div className="relative w-full h-[70vh] sm:h-full flex flex-col justify-end overflow-hidden shadow-2xl snap-start bg-black">
      <AnimatePresence initial={false}>
        <motion.img
          key={item.id}
          src={
            item.backdrop_path
              ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
              : "/fallback-bg.png"
          }
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "linear" }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-black/30 pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          className="relative z-10 px-4 md:px-12 py-6 md:py-10 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <motion.h2
            className="font-extrabold mb-4 text-[clamp(1.9rem,4.5vw,3.1rem)]"
            variants={childVariants}
          >
            {item.title || item.name}
          </motion.h2>

          <motion.p
            className="text-gray-200 max-w-4xl mb-8 text-[clamp(1rem,1.2vw,1.25rem)] leading-relaxed line-clamp-5 md:line-clamp-6"
            variants={childVariants}
          >
            {item.overview}
          </motion.p>

          <motion.div
            className="flex items-center gap-3"
            variants={childVariants}
          >
            <motion.button
              onClick={handlePlay}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`relative inline-flex items-center justify-center gap-3 h-12
                ${hasResume ? "px-7" : "px-6"}
                rounded-full font-semibold leading-none
                transition-colors select-none
                shadow-lg shadow-black/40
                bg-[hsl(var(--foreground))] text-[hsl(var(--background))]`}
            >
              <span className="absolute inset-0 rounded-full ring-1 ring-white/15 pointer-events-none" />
              <FaPlay size={22} />
              {hasResume && <span>Resume</span>}
            </motion.button>

            <button
              onClick={() => onSelect(item)}
              className="inline-flex items-center justify-center h-12 w-12 rounded-full
                bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
            >
              <FaInfoCircle size={22} />
            </button>

            <button
              onClick={() => toggleWatchlist(item)}
              aria-pressed={isSaved}
              className="inline-flex items-center justify-center h-12 w-12 rounded-full
                bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
            >
              <Bookmark
                size={22}
                strokeWidth={isSaved ? 3 : 2}
                className={isSaved ? "fill-current" : "fill-none"}
              />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
