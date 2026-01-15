"use client";

import type { Movie } from "@/types/movie";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${ordinal(d.getDate())} ${d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })}`;
};

const titleCase = (s: string) =>
  s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export default function ModalMeta({
  movie,
  creators,
  director,
}: {
  movie: Movie;
  creators?: string | null;
  director?: string | null;
}) {
  const genreLabel = Array.isArray(movie.genres)
    ? movie.genres.map(titleCase).join(" • ")
    : "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs text-zinc-200 justify-center sm:justify-start">
        {creators && (
          <span className="px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-700">
            📺 {creators}
          </span>
        )}
        {director && (
          <span className="px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-700">
            🎬 {director}
          </span>
        )}
        {movie.release_date && (
          <span className="px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-700">
            📅 {formatDate(movie.release_date)}
          </span>
        )}
        {movie.vote_average && (
          <span className="px-3 py-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold">
            ⭐ {movie.vote_average.toFixed(1)}
          </span>
        )}
      </div>

      {genreLabel && (
        <div className="text-xs text-zinc-400 px-1 text-center sm:text-left">
          {genreLabel}
        </div>
      )}
    </div>
  );
}
