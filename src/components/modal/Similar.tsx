import { memo } from "react";
import { TMDB_IMAGE } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

type Props = {
  items: Movie[];
  onSelect?: (item: Movie) => void;
};

const Similar: React.FC<Props> = ({ items, onSelect }) => {
  if (!items?.length) return null;

  return (
    <div className="pt-4">
      <h3 className="text-md font-semibold text-zinc-300 mb-2">Similar</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item) => {
          const title = item.title || item.name || "Untitled";
          const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "/fallback.jpg";

          return (
            <div
              key={item.id}
              className="w-28 flex-shrink-0 text-center space-y-1 cursor-pointer"
              onClick={() => onSelect?.(item)}
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

export default memo(Similar);
