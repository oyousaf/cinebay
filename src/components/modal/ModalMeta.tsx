"use client";

import { useMemo } from "react";
import type { Movie } from "@/types/movie";

/* ---------- Date Helpers (UTC safe) ---------- */

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const parseDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const formatDate = (dateStr?: string) => {
  const d = parseDate(dateStr);
  if (!d) return null;

  return `${ordinal(d.getUTCDate())} ${d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })}`;
};

const calculateAge = (birthday?: string, deathday?: string) => {
  const birth = parseDate(birthday);
  if (!birth) return null;

  const end = deathday ? parseDate(deathday)! : new Date();

  let age = end.getUTCFullYear() - birth.getUTCFullYear();

  const hasHadBirthday =
    end.getUTCMonth() > birth.getUTCMonth() ||
    (end.getUTCMonth() === birth.getUTCMonth() &&
      end.getUTCDate() >= birth.getUTCDate());

  if (!hasHadBirthday) age--;

  return age;
};

/* ---------- Text Helpers ---------- */

const titleCase = (s: string) =>
  s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/* ---------- UI Helpers ---------- */

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="px-3 py-1 rounded-full bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground)/0.9)]">
    {children}
  </span>
);

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
    const birthDate = useMemo(
      () => formatDate(movie.birthday),
      [movie.birthday],
    );
    const deathDate = useMemo(
      () => formatDate(movie.deathday),
      [movie.deathday],
    );
    const age = useMemo(
      () => calculateAge(movie.birthday, movie.deathday),
      [movie.birthday, movie.deathday],
    );

    return (
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight text-[hsl(var(--surface-foreground))]">
          {movie.name}
        </h2>

        <div className="h-px w-20 bg-[hsl(var(--foreground)/0.25)]" />

        <div className="text-sm sm:text-base text-[hsl(var(--surface-foreground)/0.8)] space-y-1">
          {birthDate && (
            <div aria-label="Birthday">
              <span role="img" aria-hidden>
                🎂
              </span>{" "}
              Born: {birthDate}
            </div>
          )}

          {deathDate ? (
            <div aria-label="Death date">
              <span role="img" aria-hidden>
                🕊️
              </span>{" "}
              Passed: {deathDate}
              {age !== null && ` (aged ${age})`}
            </div>
          ) : (
            age !== null && (
              <div aria-label="Current age">
                <span role="img" aria-hidden>
                  🎉
                </span>{" "}
                Age: {age} years
              </div>
            )
          )}

          {movie.place_of_birth && (
            <div aria-label="Place of birth">
              <span role="img" aria-hidden>
                📍
              </span>{" "}
              {movie.place_of_birth}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- MOVIE / TV META ---------- */

  const genres = useMemo(() => {
    if (!Array.isArray(movie.genres) || !movie.genres.length) return null;
    return movie.genres.map(titleCase).join(" • ");
  }, [movie.genres]);

  const releaseDate = useMemo(
    () => formatDate(movie.release_date),
    [movie.release_date],
  );

  const releaseYear = movie.release_date?.slice(0, 4);

  const rating =
    typeof movie.vote_average === "number" && movie.vote_average > 0
      ? movie.vote_average.toFixed(1)
      : null;

  return (
    <div className="space-y-3">
      {rating && (
        <div
          className="text-2xl px-3 py-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold w-fit mx-auto sm:mx-0"
          aria-label={`Rating ${rating} out of 10`}
        >
          ⭐ {rating}
        </div>
      )}

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2 text-xs justify-center sm:justify-start">
        {creators && <Pill>📺 {creators}</Pill>}

        {director && <Pill>🎬 {director}</Pill>}

        {releaseYear && <Pill>📅 {releaseYear}</Pill>}

        {!rating && <Pill>⭐ Not rated yet</Pill>}
      </div>

      {/* Full date */}
      {releaseDate && (
        <div className="text-xs text-[hsl(var(--surface-foreground)/0.6)] text-center sm:text-left">
          Released: {releaseDate}
        </div>
      )}

      {/* Genres */}
      {genres && (
        <div className="text-xs text-[hsl(var(--surface-foreground)/0.7)] text-center sm:text-left">
          {genres}
        </div>
      )}
    </div>
  );
}
