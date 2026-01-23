"use client";

import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { FaPlay } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import type { Movie } from "@/types/movie";
import { useWatchlist } from "@/context/WatchlistContext";
import EpisodeSelector from "@/components/tv/EpisodeSelector";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function ModalActions({ movie }: { movie: Movie }) {
  const isPlayable = movie.media_type === "movie" || movie.media_type === "tv";
  if (!isPlayable) return null;

  const isTV = movie.media_type === "tv";

  const navigate = useNavigate();
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const isSaved = isInWatchlist(movie.id);

  /* ---------- PLAY ---------- */
  const play = (intent: PlaybackIntent) => {
    if (intent.mediaType === "movie") {
      navigate(`/watch/movie/${intent.tmdbId}`);
      return;
    }

    navigate(
      `/watch/tv/${intent.tmdbId}/${intent.season}/${intent.episode}`,
    );
  };

  return (
    <div className="space-y-4">
      {/* ACTION BAR */}
      <div className="flex gap-4 items-center justify-center sm:justify-start">
        {!isTV && (
          <motion.button
            onClick={() =>
              play({
                mediaType: "movie",
                tmdbId: movie.id,
              })
            }
            whileTap={{ scale: 0.96 }}
            className="px-6 py-3 rounded-full font-semibold flex items-center gap-2
              bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
          >
            <FaPlay size={20} />
          </motion.button>
        )}

        <motion.button
          onClick={() => toggleWatchlist(movie)}
          aria-pressed={isSaved}
          whileTap={{ scale: 0.96 }}
          className="p-3 rounded-full
            bg-[hsl(var(--foreground))]
            text-[hsl(var(--background))]"
        >
          <Bookmark
            size={22}
            strokeWidth={isSaved ? 3 : 2}
            className={isSaved ? "fill-current" : "fill-none"}
          />
        </motion.button>
      </div>

      {/* TV EPISODES */}
      {isTV && (
        <EpisodeSelector
          tv={movie}
          onPlay={(intent) => play(intent)}
        />
      )}
    </div>
  );
}
