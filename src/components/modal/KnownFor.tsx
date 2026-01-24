"use client";

import { memo, useMemo } from "react";
import { TMDB_IMAGE } from "@/lib/tmdb";
import type { KnownForItem, Movie } from "@/types/movie";

type Props = {
  items: KnownForItem[];
  onSelect?: (item: Movie) => void;
};

function normaliseTitle(item: KnownForItem) {
  return item.title || item.name || "Untitled";
}

const KnownFor = ({ items, onSelect }: Props) => {
  const filtered = useMemo(() => {
    const seen = new Set<string>();

    return items
      .filter((item) => {
        if (!item.id || !item.media_type) return false;

        const key = `${item.media_type}:${item.id}`;
        if (seen.has(key)) return false;

        seen.add(key);
        return (item.vote_average ?? 0) >= 6.5;
      })
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 10);
  }, [items]);

  if (!filtered.length) return null;

  return (
    <section className="pt-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-2">Known For</h3>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {filtered.map((item) => {
          const title = normaliseTitle(item);
          const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "/fallback.jpg";

          const year = item.release_date
            ? new Date(item.release_date).getFullYear()
            : item.first_air_date
            ? new Date(item.first_air_date).getFullYear()
            : null;

          return (
            <button
              key={`${item.media_type}:${item.id}`}
              type="button"
              onClick={() =>
                onSelect?.({
                  id: item.id,
                  media_type: item.media_type,
                  title: item.title,
                  name: item.name,
                  poster_path: item.poster_path,
                  backdrop_path: item.backdrop_path,
                  overview: "",
                  release_date: item.release_date,
                  first_air_date: item.first_air_date,
                  vote_average: item.vote_average,
                })
              }
              className="w-28 shrink-0 text-center space-y-1 focus:outline-none"
            >
              <img
                src={poster}
                alt={title}
                loading="lazy"
                className="w-28 h-40 rounded-lg object-cover shadow"
              />

              <div className="text-xs text-zinc-300 font-medium truncate">
                {title}
              </div>

              {year && <div className="text-[11px] text-zinc-500">{year}</div>}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default memo(KnownFor);
