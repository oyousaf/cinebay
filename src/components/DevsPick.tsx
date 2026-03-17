"use client";

import ContentRail from "@/components/ContentRail";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import { useRailData } from "@/hooks/useRailData";

interface DevsPickProps {
  onSelect: (movie: Movie) => void;
}

export default function DevsPick({ onSelect }: DevsPickProps) {
  const items = useRailData<Movie>(fetchDevsPick);

  /* ---------- Not ready ---------- */
  if (items === null) {
    return null;
  }

  /* ---------- Empty ---------- */
  if (items.length === 0) {
    return null;
  }

  /* ---------- Ready ---------- */
  return <ContentRail items={items} onSelect={onSelect} />;
}
