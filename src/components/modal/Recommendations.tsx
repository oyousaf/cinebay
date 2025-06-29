import { memo } from "react";
import { TMDB_IMAGE } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

type Props = {
  items: Movie[];
  onSelect?: (item: Movie) => void;
};

const Recommendations: React.FC<Props> = ({ items, onSelect }) => {
  const filtered = [...items]
    .filter((item) => (item.vote_average ?? 0) >= 6.5)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 10);

  if (!filtered.length) return null;

  return (
    <div className="pt-4">
      <h3 className="text-md font-semibold text-zinc-300 mb-2">
        Recommendations
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {filtered.map((item) => {
          const title = item.title || item.name || "Untitled";
          const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "/fallback.jpg";

          return (
            <div
              key={item.id}
              onClick={() => onSelect?.(item)}
              className="w-28 flex-shrink-0 text-center space-y-1 cursor-pointer"
            >
              <img
                src={poster}
                alt={title}
                className="w-28 h-40 object-cover rounded-lg shadow"
                loading="lazy"
              />
              <div className="text-xs text-zinc-300 font-medium truncate">
                {title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(Recommendations);
