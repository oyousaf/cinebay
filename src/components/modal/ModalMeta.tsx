"use client";

import type { Movie } from "@/types/movie";

/* ---------- Helpers ---------- */

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

const calculateAge = (birthday?: string, deathday?: string) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  return Math.floor(
    (end.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
};

const titleCase = (s: string) =>
  s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/* ---------- Component ---------- */

export default function ModalMeta({
  movie,
  creators,
  director,
}: {
  movie: Movie;
  creators?: string | null;
  director?: string | null;
}) {
  const isPerson = movie.media_type === "person";

  /* ---------- PERSON META ---------- */
  if (isPerson) {
    return (
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight">{movie.name}</h2>

        <div className="h-px w-20 bg-[hsl(var(--foreground)/0.25)]" />

        <div className="text-sm sm:text-base text-[hsl(var(--foreground)/0.8)] space-y-1">
          {movie.birthday && <div>🎂 Born: {formatDate(movie.birthday)}</div>}

          {movie.deathday ? (
            <div>
              🕊️ Passed: {formatDate(movie.deathday)}
              {movie.birthday &&
                ` (aged ${calculateAge(movie.birthday, movie.deathday)})`}
            </div>
          ) : (
            movie.birthday && (
              <div>🎉 Age: {calculateAge(movie.birthday)} years</div>
            )
          )}

          {movie.place_of_birth && <div>📍 {movie.place_of_birth}</div>}
        </div>
      </div>
    );
  }

  /* ---------- MOVIE / TV META ---------- */

  const genres =
    Array.isArray(movie.genres) && movie.genres.length
      ? movie.genres.map(titleCase).join(" • ")
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs justify-center sm:justify-start">
        {creators && (
          <span className="px-3 py-1 rounded-full bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground)/0.9)]">
            📺 {creators}
          </span>
        )}

        {director && (
          <span className="px-3 py-1 rounded-full bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground)/0.9)]">
            🎬 {director}
          </span>
        )}

        {movie.release_date && (
          <span className="px-3 py-1 rounded-full bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground)/0.9)]">
            📅 {formatDate(movie.release_date)}
          </span>
        )}

        {typeof movie.vote_average === "number" && (
          <span className="px-3 py-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold">
            ⭐ {movie.vote_average.toFixed(1)}
          </span>
        )}
      </div>

      {genres && (
        <div className="text-xs text-[hsl(var(--foreground)/0.6)] text-center sm:text-left">
          {genres}
        </div>
      )}
    </div>
  );
}
