import { memo } from "react";
import { TMDB_IMAGE } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

type Props = {
  items: Movie[];
  onSelect?: (item: Movie) => void;
  className?: string;
};

const RecommendationList: React.FC<Props & { label: string }> = ({
  items,
  onSelect,
  label,
}) => {
  const filtered = [...items]
    .filter((item) => (item.vote_average ?? 0) >= 6.5)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 10);

  if (!filtered.length) return null;

  return (
    <div className="pt-4">
      <h3 className="text-md font-semibold text-zinc-300 mb-2">{label}</h3>
      <div
        className="carousel flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        role="list"
        aria-label={label}
      >
        {filtered.map((item) => {
          const title = item.title || item.name || "Untitled";
          const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "/fallback.jpg";

          return (
            <div
              key={item.id}
              role="listitem"
              onClick={() => onSelect?.(item)}
              tabIndex={0}
              className="relative w-28 flex-shrink-0 text-center space-y-1 cursor-pointer outline-none"
            >
              <img
                src={poster}
                alt={title}
                className="w-28 h-40 object-cover rounded-lg shadow-md hover:shadow-[0_0_12px_hsla(var(--foreground)/0.4)] transition duration-300"
                loading="lazy"
                draggable={false}
              />

              {/* NEW Badge */}
              {item.isNew && (
                <span className="absolute top-2 left-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[10px] font-bold px-2 py-[1px] rounded-full uppercase shadow-pulse">
                  NEW
                </span>
              )}

              {/* Vote Badge */}
              {typeof item.vote_average === "number" &&
                item.vote_average > 0 && (
                  <span className="absolute bottom-2 right-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[10px] font-semibold px-2 py-[1px] rounded-full shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]">
                    {item.vote_average.toFixed(1)}
                  </span>
                )}

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

// Export with different labels
export const Recommendations = memo((props: Props) => (
  <RecommendationList {...props} label="Recommendations" />
));

export const Similar = memo((props: Props) => (
  <RecommendationList {...props} label="Similar" />
));
