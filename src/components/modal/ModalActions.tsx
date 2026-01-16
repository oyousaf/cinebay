"use client";

import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { FaPlay } from "react-icons/fa";

import type { Movie } from "@/types/movie";
import { useWatchlist } from "@/context/WatchlistContext";
import { useModalManager } from "@/context/ModalContext";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";
import EpisodeSelector from "@/components/tv/EpisodeSelector";

export default function ModalActions({ movie }: { movie: Movie }) {
  if (movie.media_type === "person") return null;

  const isTV = movie.media_type === "tv";

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { openPlayer } = useModalManager();

  const embedUrl = useVideoEmbed(movie.id, movie.media_type);
  const isSaved = isInWatchlist(movie.id);

  return (
    <div className="space-y-4">
      {/* ACTION BAR */}
      <div className="flex gap-4 items-center justify-center sm:justify-start">
        {/* PLAY BUTTON */}
        {!isTV && (
          <motion.button
            disabled={!embedUrl}
            onClick={() => embedUrl && openPlayer(embedUrl)}
            whileTap={{ scale: 0.96 }}
            className={`px-6 py-3 rounded-full font-semibold flex items-center gap-2 ${
              embedUrl
                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "bg-gray-600/50 text-gray-400"
            }`}
          >
            {embedUrl ? <FaPlay size={20} /> : "Loading…"}
          </motion.button>
        )}

        {/* BOOKMARK */}
        <motion.button
          onClick={() => toggleWatchlist(movie)}
          aria-pressed={isSaved}
          whileTap={{ scale: 0.96 }}
          className="p-3 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
        >
          <Bookmark
            size={22}
            strokeWidth={isSaved ? 3 : 2}
            className={isSaved ? "fill-[hsl(var(--background))]" : "fill-none"}
          />
        </motion.button>
      </div>

      {/* TV EPISODES */}
      {isTV && <EpisodeSelector tv={movie} onPlay={openPlayer} />}
    </div>
  );
}
