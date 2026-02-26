"use client";

import { useMemo } from "react";
import type { Movie } from "@/types/movie";

/* ---------- UI Pill ---------- */

const Pill = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <span
    onClick={onClick}
    className={`px-3 py-0.5 text-sm rounded-full bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground)/0.9)] max-w-full min-w-0 ${
      onClick ? "cursor-pointer hover:ring-[hsl(var(--foreground)/0.5)]" : ""
    }`}
  >
    {children}
  </span>
);

/* ---------- Types ---------- */

type PersonRef = { id: number; name: string };

export default function ModalMeta({
  movie,
  creators,
  director,
  onPersonClick,
}: {
  movie: Movie;
  creators?: PersonRef[] | null;
  director?: PersonRef | null;
  onPersonClick?: (id: number) => void;
}) {
  const isPerson = movie.media_type === "person";
  const isTV = movie.media_type === "tv";

  /* ---------- Basic meta ---------- */

  const releaseYear = movie.release_date?.slice(0, 4);

  const rating =
    typeof movie.vote_average === "number" && movie.vote_average > 0
      ? movie.vote_average.toFixed(1)
      : null;

  const producedBy = useMemo(() => {
    const companies = (movie as any).production_companies ?? [];
    if (!companies.length) return null;
    const names = companies.slice(0, 2).map((c: any) => c.name);
    return companies.length > 2
      ? `${names.join(", ")} +${companies.length - 2}`
      : names.join(", ");
  }, [movie]);

  const airedOn = useMemo(() => {
    if (!isTV) return null;
    const nets = (movie as any).networks ?? [];
    if (!nets.length) return null;
    const names = nets.slice(0, 2).map((n: any) => n.name);
    return nets.length > 2
      ? `${names.join(", ")} +${nets.length - 2}`
      : names.join(", ");
  }, [isTV, movie]);

  /* ---------- PERSON VIEW (unchanged behaviour) ---------- */

  if (isPerson) {
    const formatDate = (date?: string) => {
      if (!date) return null;
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const birthDate = formatDate(movie.birthday);
    const deathDate = formatDate(movie.deathday);

    const age = (() => {
      if (!movie.birthday) return null;
      const birth = new Date(movie.birthday);
      const end = movie.deathday ? new Date(movie.deathday) : new Date();
      let years = end.getFullYear() - birth.getFullYear();
      const m = end.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) years--;
      return years;
    })();

    return (
      <div className="space-y-3 min-w-0">
        <h2 className="text-3xl font-semibold tracking-tight wrap-break-word">
          {movie.name}
        </h2>

        {/* Department */}
        {movie.known_for_department && (
          <div className="text-sm opacity-70">{movie.known_for_department}</div>
        )}

        <div className="h-px w-20 bg-[hsl(var(--foreground)/0.25)]" />

        <div className="text-sm sm:text-base space-y-1 opacity-90">
          {birthDate && <div>🎂 Born: {birthDate}</div>}

          {deathDate ? (
            <div>
              🕊️ Passed: {deathDate}
              {age !== null && ` (aged ${age})`}
            </div>
          ) : (
            age !== null && <div>🎉 Age: {age} years</div>
          )}

          {movie.place_of_birth && <div>📍 {movie.place_of_birth}</div>}
        </div>
      </div>
    );
  }

  /* ---------- MOVIE / TV ---------- */

  return (
    <div className="space-y-3">
      {rating && (
        <div className="text-2xl px-3 py-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold w-fit mx-auto sm:mx-0">
          ⭐ {rating}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {/* Creators */}
        {creators?.map((c) => (
          <Pill key={c.id} onClick={() => onPersonClick?.(c.id)}>
            📺 {c.name}
          </Pill>
        ))}

        {/* Director */}
        {director && (
          <Pill onClick={() => onPersonClick?.(director.id)}>
            🎬 {director.name}
          </Pill>
        )}

        {airedOn && <Pill>📡 Aired on: {airedOn}</Pill>}
        {producedBy && <Pill>🏭 Produced by: {producedBy}</Pill>}
        {releaseYear && <Pill>📅 {releaseYear}</Pill>}
        {!rating && <Pill>⭐ Not rated yet</Pill>}
      </div>
    </div>
  );
}
