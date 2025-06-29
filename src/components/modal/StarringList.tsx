import { fetchDetails } from "@/lib/tmdb";
import type { CastMember, Movie } from "@/types/movie";

export default function StarringList({
  cast,
  onSelect,
}: {
  cast: CastMember[];
  onSelect?: (item: Movie) => void;
}) {
  if (!cast || cast.length === 0) return null;

  return (
    <div className="pt-2 text-sm text-zinc-400">
      <span className="font-semibold text-zinc-300">Starring:</span>{" "}
      {cast.map((actor, i) => (
        <span
          key={actor.id}
          className="underline cursor-pointer"
          onClick={() =>
            fetchDetails(actor.id, "person").then((res) => {
              if (res) onSelect?.(res);
            })
          }
        >
          {actor.name}
          {i < cast.length - 1 ? ", " : ""}
        </span>
      ))}
    </div>
  );
}
