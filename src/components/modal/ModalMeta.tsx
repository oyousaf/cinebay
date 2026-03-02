"use client";

import { useMemo } from "react";
import type { Movie } from "@/types/movie";
import CertBadge from "./CertBadge";

import {
  Star,
  Calendar,
  Clock,
  Clapperboard,
  PenLine,
  Tv,
  Radio,
  Factory,
  Cake,
  MapPin,
  Feather,
  Hourglass,
} from "lucide-react";

/* =========================================================
   UI
========================================================= */

const Pill = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <span
    onClick={onClick}
    className={`inline-flex items-center gap-1 px-3 py-0.5 text-sm rounded-full bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground)/0.9)] max-w-full min-w-0 ${
      onClick ? "cursor-pointer hover:ring-[hsl(var(--foreground)/0.5)]" : ""
    }`}
  >
    {children}
  </span>
);

type PersonRef = { id: number; name: string };

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date?: string | null) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const calculateAge = (birth?: string, death?: string) => {
  if (!birth) return null;
  const b = new Date(birth);
  const end = death ? new Date(death) : new Date();

  let years = end.getFullYear() - b.getFullYear();
  const m = end.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < b.getDate())) years--;

  return years;
};

const uniqueCountById = (items: any[]) => {
  const set = new Set<number>();
  items.forEach((i) => {
    if (Number.isFinite(i?.id)) set.add(i.id);
  });
  return set.size;
};

const formatRuntime = (minutes?: number | null) => {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/* =========================================================
   COMPONENT
========================================================= */

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

  /* =========================================================
     PERSON VIEW
  ========================================================= */

  if (isPerson) {
    const birthDate = formatDate(movie.birthday);
    const deathDate = formatDate(movie.deathday);
    const age = calculateAge(movie.birthday, movie.deathday);

    const primaryRole = movie.roles?.length ? movie.roles.join(" • ") : null;

    const creditTotal = useMemo(() => {
      if (movie.credit_count) return movie.credit_count;

      const cc = movie.combined_credits;
      if (!cc) return 0;

      const cast: any[] = Array.isArray(cc.cast) ? cc.cast : [];
      const crew: any[] = Array.isArray(cc.crew) ? cc.crew : [];
      const dept = movie.known_for_department;

      if (dept === "Acting") return uniqueCountById(cast);

      if (dept === "Directing")
        return uniqueCountById(crew.filter((c) => c?.job === "Director"));

      if (dept === "Writing")
        return uniqueCountById(
          crew.filter((c) =>
            ["Writer", "Screenplay", "Story", "Creator", "Teleplay"].includes(
              c?.job,
            ),
          ),
        );

      if (dept === "Production")
        return uniqueCountById(
          crew.filter((c) =>
            [
              "Producer",
              "Executive Producer",
              "Co-Executive Producer",
              "Consulting Producer",
            ].includes(c?.job),
          ),
        );

      return uniqueCountById([...cast, ...crew]);
    }, [movie]);

    return (
      <div className="space-y-3 min-w-0 text-center sm:text-left">
        <h2 className="text-3xl font-semibold tracking-tight wrap-break-word">
          {movie.name}
        </h2>

        {(primaryRole || creditTotal > 0) && (
          <div className="text-sm opacity-70">
            {primaryRole}
            {creditTotal > 0 &&
              ` • ${creditTotal} credit${creditTotal === 1 ? "" : "s"}`}
          </div>
        )}

        <div className="h-px w-20 bg-[hsl(var(--foreground)/0.25)] mx-auto sm:mx-0" />

        <div className="text-sm sm:text-base space-y-2 opacity-90">
          {birthDate && (
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Cake size={16} />
              Born: {birthDate}
            </div>
          )}

          {deathDate ? (
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Feather size={16} />
              Passed: {deathDate}
              {age !== null && ` (aged ${age})`}
            </div>
          ) : (
            age !== null && (
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Hourglass size={16} />
                Age: {age} years
              </div>
            )
          )}

          {movie.place_of_birth && (
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <MapPin size={16} />
              {movie.place_of_birth}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* =========================================================
     MOVIE / TV VIEW
  ========================================================= */

  const releaseYear = movie.release_date?.slice(0, 4);

  const rating =
    typeof movie.vote_average === "number" && movie.vote_average > 0
      ? movie.vote_average.toFixed(1)
      : null;

  const runtimeLabel = useMemo(() => {
    if (movie.runtime) return formatRuntime(movie.runtime);

    if (isTV && Array.isArray((movie as any).episode_run_time)) {
      const ep = (movie as any).episode_run_time[0];
      return formatRuntime(ep);
    }

    return null;
  }, [movie.runtime, movie, isTV]);

  const producedBy = useMemo(() => {
    const companies = movie.production_companies ?? [];
    if (!companies.length) return null;

    const names = companies.slice(0, 2).map((c: any) => c.name);
    return companies.length > 2
      ? `${names.join(", ")} +${companies.length - 2}`
      : names.join(", ");
  }, [movie]);

  const airedOn = useMemo(() => {
    if (!isTV) return null;

    const nets = movie.networks ?? [];
    if (!nets.length) return null;

    const names = nets.slice(0, 2).map((n: any) => n.name);
    return nets.length > 2
      ? `${names.join(", ")} +${nets.length - 2}`
      : names.join(", ");
  }, [isTV, movie]);

  const writers = useMemo(() => {
    const crew = movie.credits?.crew ?? [];
    const seen = new Set<number>();

    const writerJobs = ["Writer", "Screenplay", "Story", "Teleplay", "Creator"];

    return crew
      .filter((c: any) => writerJobs.includes(c?.job))
      .filter((c: any) => {
        if (!c?.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .slice(0, 2)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
      }));
  }, [movie]);

  const genres = movie.genres?.length ? movie.genres.join(" • ") : null;
  const certification = movie.certification;

  return (
    <div className="space-y-3">
      {rating && (
        <div className="text-2xl px-3.5 py-1.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold w-fit mx-auto sm:mx-0 flex items-center gap-2 leading-none shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          <Star
            size={22}
            strokeWidth={2}
            className="text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]"
            fill="currentColor"
          />
          <span className="text-lg font-semibold tracking-tight tabular-nums">
            {rating}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {creators?.map((c) => (
          <Pill key={c.id} onClick={() => onPersonClick?.(c.id)}>
            <Tv size={14} />
            {c.name}
          </Pill>
        ))}

        {director && (
          <Pill onClick={() => onPersonClick?.(director.id)}>
            <Clapperboard size={14} />
            {director.name}
          </Pill>
        )}

        {writers.map((w) => (
          <Pill key={w.id} onClick={() => onPersonClick?.(w.id)}>
            <PenLine size={14} />
            {w.name}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
        {runtimeLabel && (
          <Pill>
            <Clock size={14} />
            {runtimeLabel}
          </Pill>
        )}

        {releaseYear && (
          <Pill>
            <Calendar size={14} />
            {releaseYear}
          </Pill>
        )}

        {certification && <CertBadge rating={certification} size={32} />}

        {!rating && (
          <div
            className="
      inline-flex items-center gap-2 px-3 py-1.5
      rounded-full
      bg-[hsl(var(--background)/0.6)] backdrop-blur
      ring-1 ring-[hsl(var(--foreground)/0.18)]
      text-sm font-medium opacity-80
      mx-auto sm:mx-0
    "
          >
            <Star size={14} className="opacity-70" />
            Not rated yet
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {airedOn && (
          <Pill>
            <Radio size={14} />
            {airedOn}
          </Pill>
        )}

        {producedBy && (
          <Pill>
            <Factory size={14} />
            {producedBy}
          </Pill>
        )}
      </div>

      {genres && (
        <div className="text-sm opacity-70 text-center sm:text-left">
          {genres}
        </div>
      )}
    </div>
  );
}
