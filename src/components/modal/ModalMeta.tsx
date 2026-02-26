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

type NameLike = string | { name?: string | null } | null | undefined;

const toName = (x: NameLike) => {
  if (typeof x === "string") return x.trim();
  if (x && typeof x === "object" && typeof x.name === "string")
    return x.name.trim();
  return "";
};

const compactNames = (items: NameLike[] | null | undefined, max = 2) => {
  const names = (items ?? []).map(toName).filter(Boolean);
  if (!names.length) return null;
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
};

/* ---------- UI Helpers ---------- */

const Pill = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <span
    onClick={onClick}
    className={`px-3 py-0.5 text-sm rounded-full bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground)/0.9)] wrap-break-word max-w-full min-w-0 ${
      onClick ? "cursor-pointer hover:ring-[hsl(var(--foreground)/0.5)]" : ""
    }`}
  >
    {children}
  </span>
);

/* ---------- Component ---------- */

export default function ModalMeta({
  movie,
  creators,
  director,
  onPersonClick,
}: {
  movie: Movie;
  creators?: string | null;
  director?: string | null;
  onPersonClick?: (name: string) => void;
}) {
  const isPerson = movie.media_type === "person";
  const isTV = movie.media_type === "tv";

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
      <div className="space-y-3 min-w-0">
        <h2 className="text-3xl font-semibold tracking-tight wrap-break-word">
          {movie.name}
        </h2>

        <div className="h-px w-20 bg-[hsl(var(--foreground)/0.25)]" />

        <div className="text-sm sm:text-base text-[hsl(var(--background)/0.8)] dark:text-[hsl(var(--foreground)/0.8)] space-y-1 wrap-break-word">
          {birthDate && (
            <div>
              <span aria-hidden>🎂</span> Born: {birthDate}
            </div>
          )}

          {deathDate ? (
            <div>
              <span aria-hidden>🕊️</span> Passed: {deathDate}
              {age !== null && ` (aged ${age})`}
            </div>
          ) : (
            age !== null && (
              <div>
                <span aria-hidden>🎉</span> Age: {age} years
              </div>
            )
          )}

          {movie.place_of_birth && (
            <div>
              <span aria-hidden>📍</span> {movie.place_of_birth}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- MOVIE / TV META ---------- */

  const genres = useMemo(() => {
    if (!Array.isArray(movie.genres) || !movie.genres.length) return null;
    return movie.genres
      .map((g: any) => titleCase(toName(g)))
      .filter(Boolean)
      .join(" • ");
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

  const producedBy = useMemo(
    () => compactNames((movie as any).production_companies),
    [movie],
  );

  const airedOn = useMemo(
    () => (isTV ? compactNames((movie as any).networks) : null),
    [isTV, movie],
  );

  return (
    <div className="space-y-3 min-w-0">
      {rating && (
        <div className="text-2xl px-3 py-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold w-fit mx-auto sm:mx-0">
          ⭐ {rating}
        </div>
      )}

      {/* Pill container */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start max-w-full min-w-0">
        {creators && (
          <Pill onClick={() => onPersonClick?.(creators)}>
            📺 {creators}
          </Pill>
        )}

        {director && (
          <Pill onClick={() => onPersonClick?.(director)}>
            🎬 {director}
          </Pill>
        )}

        {airedOn && <Pill>📡 Aired on: {airedOn}</Pill>}
        {producedBy && <Pill>🏭 Produced by: {producedBy}</Pill>}
        {releaseYear && <Pill>📅 {releaseYear}</Pill>}
        {!rating && <Pill>⭐ Not rated yet</Pill>}
      </div>

      {releaseDate && (
        <div className="text-sm text-[hsl(var(--background)/0.65)] dark:text-[hsl(var(--foreground)/0.65)] text-center sm:text-left">
          Released: {releaseDate}
        </div>
      )}

      {genres && (
        <div className="text-sm text-[hsl(var(--background)/0.7)] dark:text-[hsl(var(--foreground)/0.7)] text-center sm:text-left">
          {genres}
        </div>
      )}
    </div>
  );
}