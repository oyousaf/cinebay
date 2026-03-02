import React from "react";

/* =========================================================
   TYPES
========================================================= */

type Region = "UK" | "US" | "AUTO";

interface CertBadgeProps {
  rating?: string | null;
  region?: Region;
  size?: number;
  className?: string;
}

/* =========================================================
   NORMALISATION
========================================================= */

const normalizeRating = (rating?: string | null): string | null => {
  if (!rating) return null;

  let r = rating.toUpperCase().trim();

  // Common variants
  if (r === "PG13") r = "PG-13";
  if (r === "NC17") r = "NC-17";

  // Legacy
  if (r === "X") r = "NC-17";

  return r;
};

/* =========================================================
   REGION DETECTION
========================================================= */

const detectRegion = (rating: string): "UK" | "US" => {
  if (["U", "12", "12A", "15", "18", "R18"].includes(rating)) return "UK";
  return "US";
};

/* =========================================================
   ASSET MAPS
========================================================= */

const UK_MAP: Record<string, string> = {
  U: "/certifications/bbfc-u.svg",
  PG: "/certifications/bbfc-pg.svg",
  "12": "/certifications/bbfc-12.svg",
  "12A": "/certifications/bbfc-12a.svg",
  "15": "/certifications/bbfc-15.svg",
  "18": "/certifications/bbfc-18.svg",
  R18: "/certifications/bbfc-r18.svg",
};

const US_MAP: Record<string, string> = {
  G: "/certifications/mpa-g.svg",
  PG: "/certifications/mpa-pg.svg",
  "PG-13": "/certifications/mpa-pg13.svg",
  R: "/certifications/mpa-r.svg",
  "NC-17": "/certifications/mpa-nc17.svg",
};

/* =========================================================
   COMPONENT
========================================================= */

export default function CertBadge({
  rating,
  region = "AUTO",
  size = 32,
  className = "",
}: CertBadgeProps) {
  const normalized = normalizeRating(rating);
  if (!normalized) return null;

  const resolvedRegion = region === "AUTO" ? detectRegion(normalized) : region;

  const src = resolvedRegion === "UK" ? UK_MAP[normalized] : US_MAP[normalized];

  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${normalized} rating`}
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
