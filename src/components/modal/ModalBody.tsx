"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import type { Movie } from "@/types/movie";
import { fetchDetails } from "@/lib/tmdb";

export default function ModalBody({
  movie,
  onSelect,
}: {
  movie: Movie;
  onSelect?: (item: Movie) => void;
}) {
  const [showBio, setShowBio] = useState(false);
  const isPerson = movie.media_type === "person";

  const cast = movie.credits?.cast?.slice(0, 5) ?? [];

  return (
    <div className="space-y-4">
      {/* OVERVIEW */}
      {!isPerson && movie.overview && (
        <p className="text-[hsl(var(--foreground)/0.85)] leading-relaxed">
          {movie.overview}
        </p>
      )}

      {/* PERSON BIO */}
      {isPerson && movie.biography && (
        <>
          <div className="flex justify-center">
            <motion.button
              onClick={() => setShowBio((v) => !v)}
              whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-full font-semibold bg-[hsl(var(--foreground))]
                text-[hsl(var(--background))]"
            >
              {showBio ? <ArrowUp size={18} /> : "BIO"}
            </motion.button>
          </div>

          <AnimatePresence>
            {showBio && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="rounded-xl p-4 max-h-80 overflow-y-auto bg-[hsl(var(--foreground)/0.05)]
                  text-sm sm:text-base text-[hsl(var(--foreground)/0.8)]"
              >
                {movie.biography}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* CAST */}
      {!isPerson && cast.length > 0 && (
        <div className="pt-3 text-sm text-[hsl(var(--foreground)/0.75)]">
          <span className="font-semibold text-[hsl(var(--foreground))]">
            Starring:
          </span>{" "}
          {cast.map((actor, i) => (
            <span key={actor.id}>
              <button
                type="button"
                onClick={() =>
                  fetchDetails(actor.id, "person").then(
                    (res) => res && onSelect?.(res),
                  )
                }
                className="underline underline-offset-2 hover:text-[hsl(var(--foreground))] transition
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--foreground))]"
              >
                {actor.name}
              </button>
              {i < cast.length - 1 && ", "}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
