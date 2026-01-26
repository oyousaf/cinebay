"use client";

import ContentRail from "@/components/ContentRail";
import Skeleton from "@/components/Skeleton";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { useRailData } from "@/hooks/useRailData";

interface DevsPickProps {
  onSelect: (movie: Movie) => void;
}

export default function DevsPick({ onSelect }: DevsPickProps) {
  const items = useRailData<Movie>(
    fetchDevsPick,
    (m) =>
      Boolean(m?.id) && Boolean(m.title || m.name) && m.media_type !== "person",
  );

  /* ---------- Loading ---------- */
  if (items === null) {
    return <Skeleton />;
  }

  /* ---------- Empty ---------- */
  if (items.length === 0) {
    return null;
  }

  /* ---------- Ready ---------- */
  return <ContentRail items={items} onSelect={onSelect} />;
}
