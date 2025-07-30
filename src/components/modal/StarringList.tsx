import { fetchDetails } from "@/lib/tmdb";
import type { CastMember, Movie } from "@/types/movie";

export default function StarringList({
  cast,
  onSelect,
}: {
  cast: CastMember[];
  onSelect?: (item: Movie) => void;
}) {
  if (!cast?.length) return null;

  const mainCast = cast.slice(0, 5);

  return (
    <div className="pt-2 text-sm text-zinc-400">
      <span className="font-semibold text-zinc-300">Starring:</span>{" "}
      {mainCast.map((actor, i) => (
        <span key={actor.id}>
          <span
            className="underline cursor-pointer hover:text-[hsl(var(--foreground))] transition-colors"
            onClick={() =>
              fetchDetails(actor.id, "person").then(
                (res) => res && onSelect?.(res)
              )
            }
          >
            {actor.name}
          </span>
          {i < mainCast.length - 1 && ", "}
        </span>
      ))}
    </div>
  );
}
