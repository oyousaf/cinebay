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
    <div className="space-y-4 2xl:space-y-8">
      {/* OVERVIEW */}
      {!isPerson && movie.overview && (
        <p className="max-w-prose leading-relaxed text-[hsl(var(--surface-foreground)/0.85)] text-base 2xl:text-xl">
          {movie.overview}
        </p>
      )}

      {/* PERSON BIO */}
      {isPerson && movie.biography && (
        <>
          {/* Toggle Button */}
          <div className="w-full flex justify-center">
            <motion.button
              onClick={() => setShowBio((v) => !v)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              aria-expanded={showBio}
              className="relative flex items-center justify-center gap-3 px-6 py-3 text-base 2xl:px-10 2xl:py-5 2xl:text-2xl 
              rounded-full font-semibold bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-sm"
            >
              <AnimatePresence mode="wait" initial={false}>
                {showBio ? (
                  <motion.span
                    key="arrow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <ArrowUp className="w-5 h-5 2xl:w-8 2xl:h-8" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="tracking-wider"
                  >
                    BIO
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Biography Panel */}
          <AnimatePresence initial={false}>
            {showBio && (
              <motion.div
                key="bio"
                initial={{
                  opacity: 0,
                  y: -20,
                  clipPath: "inset(0 0 100% 0 round 24px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  clipPath: "inset(0 0 0% 0 round 24px)",
                }}
                exit={{
                  opacity: 0,
                  y: -16,
                  clipPath: "inset(0 0 100% 0 round 24px)",
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="mt-6 rounded-xl p-4 text-base 2xl:p-10 2xl:text-xl max-h-80 2xl:max-h-144 overflow-y-auto
            bg-[hsl(var(--surface-foreground)/0.06)] backdrop-blur-sm text-[hsl(var(--surface-foreground)/0.85)]
            shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
              >
                <div className="max-w-prose mx-auto leading-relaxed">
                  {movie.biography}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* CAST */}
      {!isPerson && cast.length > 0 && (
        <div className="pt-4 max-w-prose text-[hsl(var(--surface-foreground)/0.75)] text-base 2xl:text-xl">
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
                  transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--surface-foreground))]"
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
