"use client";

import { memo } from "react";
import { TMDB_IMAGE } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

type Props = {
  items: Movie[];
  onSelect?: (item: Movie) => void;
};

type ListProps = Props & {
  label: string;
};

const RecommendationList = ({ items, onSelect, label }: ListProps) => {
  const filtered = [...items]
    .filter((item) => (item.vote_average ?? 0) >= 6.5)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 10);

  if (!filtered.length) return null;

  return (
    <section className="pt-6 2xl:pt-8 space-y-3 2xl:space-y-4">
      <h3 className="text-base 2xl:text-lg font-semibold tracking-tight text-[hsl(var(--surface-foreground))]">
        {label}
      </h3>

      <div
        className="flex gap-3 2xl:gap-5 overflow-x-auto pb-2 no-scrollbar"
        aria-label={label}
      >
        {filtered.map((item) => {
          const title = item.title || item.name || "Untitled";
          const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "/fallback.jpg";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item)}
              className="w-28 2xl:w-40 shrink-0 text-center space-y-1 rounded-lg focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[hsl(var(--foreground))]"
            >
              <img
                src={poster}
                alt={title}
                loading="lazy"
                draggable={false}
                className="w-28 h-40 2xl:w-40 2xl:h-60 rounded-lg object-cover shadow-md transition-transform duration-200
                  hover:scale-[1.05]"
              />

              <div className="text-xs 2xl:text-sm font-medium truncate text-[hsl(var(--surface-foreground))]">
                {title}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

/* ---------- Exports ---------- */

export const Recommendations = memo((props: Props) => (
  <RecommendationList {...props} label="Recommendations" />
));

export const Similar = memo((props: Props) => (
  <RecommendationList {...props} label="Similar" />
));
