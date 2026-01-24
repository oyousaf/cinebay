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
        <p className="text-[hsl(var(--surface-foreground)/0.85)] leading-relaxed">
          {movie.overview}
        </p>
      )}

      {/* PERSON BIO */}
      {isPerson && movie.biography && (
        <>
          <div className="flex justify-center">
            <motion.button
              onClick={() => setShowBio((v) => !v)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative flex items-center justify-center px-6 py-3 rounded-full
               font-semibold bg-[hsl(var(--foreground))]
               text-[hsl(var(--background))]
               shadow-sm"
              aria-expanded={showBio}
            >
              <AnimatePresence mode="wait" initial={false}>
                {showBio ? (
                  <motion.span
                    key="arrow"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <ArrowUp size={18} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    BIO
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <AnimatePresence initial={false}>
            {showBio && (
              <motion.div
                key="bio"
                initial={{
                  opacity: 0,
                  y: -12,
                  clipPath: "inset(0 0 100% 0 round 16px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  clipPath: "inset(0 0 0% 0 round 16px)",
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  clipPath: "inset(0 0 100% 0 round 16px)",
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="mt-3 rounded-xl p-4 max-h-80 overflow-y-auto bg-[hsl(var(--surface-foreground)/0.06)]
                     backdrop-blur-sm text-sm sm:text-base text-[hsl(var(--surface-foreground)/0.85)]
                     shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              >
                {movie.biography}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* CAST */}
      {!isPerson && cast.length > 0 && (
        <div className="pt-3 text-sm text-[hsl(var(--surface-foreground)/0.75)]">
          <span className="font-semibold text-[hsl(var(--surface-foreground))]">
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
                className="underline underline-offset-2 hover:text-[hsl(var(--surface-foreground))]
                           transition focus-visible:outline-none focus-visible:ring-1
                           focus-visible:ring-[hsl(var(--surface-foreground))]"
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
