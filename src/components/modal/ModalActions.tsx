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
  const isPlayable = movie.media_type === "movie" || movie.media_type === "tv";

  const isTV = movie.media_type === "tv";

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { openPlayer } = useModalManager();

  const playableType: "movie" | "tv" | undefined =
    movie.media_type === "movie" || movie.media_type === "tv"
      ? movie.media_type
      : undefined;

  const embedUrl = useVideoEmbed(
    playableType ? movie.id : undefined,
    playableType,
  );

  if (!playableType) return null;

  const isSaved = isInWatchlist(movie.id);

  if (!isPlayable) return null;

  return (
    <div className="space-y-4">
      {/* ACTION BAR */}
      <div className="flex gap-4 items-center justify-center sm:justify-start">
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

      {isTV && <EpisodeSelector tv={movie} onPlay={openPlayer} />}
    </div>
  );
}
