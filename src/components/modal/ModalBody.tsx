"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import type { Movie } from "@/types/movie";
import StarringList from "./StarringList";

export default function ModalBody({
  movie,
  onSelect,
}: {
  movie: Movie;
  onSelect?: (item: Movie) => void;
}) {
  const [showBio, setShowBio] = useState(false);
  const isPerson = movie.media_type === "person";

  return (
    <div className="space-y-4">
      {!isPerson && movie.overview && (
        <p className="text-zinc-200">{movie.overview}</p>
      )}

      {isPerson && movie.biography && (
        <>
          <div className="flex justify-center">
            <motion.button
              onClick={() => setShowBio((v) => !v)}
              whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-full font-semibold bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
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
                className="rounded-xl bg-zinc-900/60 p-4 border border-zinc-700 text-sm text-zinc-300 max-h-80 overflow-y-auto"
              >
                {movie.biography}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {!isPerson && movie.credits?.cast?.length ? (
        <StarringList cast={movie.credits.cast} onSelect={onSelect} />
      ) : null}
    </div>
  );
}
