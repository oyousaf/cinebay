import { memo } from "react";
import { TMDB_IMAGE } from "@/lib/tmdb";
import type { KnownForItem, Movie } from "@/types/movie";

type Props = {
  items: KnownForItem[];
  onSelect?: (item: Movie) => void;
};

const KnownForSlider: React.FC<Props> = ({ items, onSelect }) => {
  const filtered = [...items]
    .filter((item) => (item.vote_average ?? 0) >= 6.5)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 10);

  if (!filtered.length) return null;

  return (
    <div className="pt-4">
      <h3 className="text-md font-semibold text-zinc-300 mb-2">Known For</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {filtered.map((item) => {
          const title = item.title || item.name || "Untitled";
          const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "/fallback.jpg";
          const year = item.release_date
            ? new Date(item.release_date).getFullYear()
            : null;

          return (
            <div
              key={item.id}
              onClick={() =>
                onSelect?.({
                  id: item.id,
                  title,
                  media_type: item.media_type,
                  poster_path: item.poster_path || "",
                  backdrop_path: "",
                  profile_path: "",
                  overview: "",
                  release_date: item.release_date || "",
                  vote_average: item.vote_average ?? 0,
                  genres: [],
                  runtime: null,
                  original_language: "",
                  isNew: false,
                  recommendations: [],
                })
              }
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
              {year && (
                <div className="text-xs text-zinc-500 font-normal">{year}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(KnownForSlider);
