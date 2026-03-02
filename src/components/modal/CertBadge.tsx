/* =========================================================
   TYPES
========================================================= */

type Region = "UK" | "US" | "AUTO";

interface CertBadgeProps {
  rating?: string | null;
  region?: Region;
  size?: number;
  className?: string;
  fallbackText?: boolean;
}

/* =========================================================
   NORMALISATION
========================================================= */

const normalizeRating = (rating?: string | null): string | null => {
  if (!rating) return null;

  let r = String(rating).toUpperCase().trim();

  // Remove extra whitespace
  r = r.replace(/\s+/g, " ");

  // Common variants / punctuation
  r = r.replace(/^PG13$/, "PG-13");
  r = r.replace(/^NC17$/, "NC-17");
  r = r.replace(/^TV14$/, "TV-14");
  r = r.replace(/^TVMA$/, "TV-MA");
  r = r.replace(/^TVPG$/, "TV-PG");
  r = r.replace(/^TVG$/, "TV-G");
  r = r.replace(/^TVY7$/, "TV-Y7");
  r = r.replace(/^TVY$/, "TV-Y");

  // Legacy
  if (r === "X") r = "NC-17";

  // UK quirks
  if (r === "R 18") r = "R18";
  if (r === "12A") r = "12A";
  if (r === "12 A") r = "12A";
  if (r === "15") r = "15";
  if (r === "18") r = "18";

  // Strip obviously useless placeholders
  if (["NR", "N/A", "NA", "UNRATED", "NOT RATED", "NONE", "TBA"].includes(r))
    return null;

  return r || null;
};

/* =========================================================
   REGION DETECTION
========================================================= */

const UK_KEYS = new Set(["U", "PG", "12", "12A", "15", "18", "R18"]);

/** If it looks like a US TV parental guideline or MPAA rating, it's US. */
const isUsLike = (r: string) =>
  r.startsWith("TV-") || ["G", "PG", "PG-13", "R", "NC-17"].includes(r);

const detectRegion = (rating: string): "UK" | "US" => {
  if (UK_KEYS.has(rating)) return "UK";
  if (isUsLike(rating)) return "US";
  // Default to US 
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
  // MPAA / MPA Movies
  G: "/certifications/mpa-g.svg",
  PG: "/certifications/mpa-pg.svg",
  "PG-13": "/certifications/mpa-pg13.svg",
  R: "/certifications/mpa-r.svg",
  "NC-17": "/certifications/mpa-nc17.svg",

  // US TV Certs
  "TV-Y": "/certifications/tv-y.svg",
  "TV-Y7": "/certifications/tv-y7.svg",
  "TV-G": "/certifications/tv-g.svg",
  "TV-PG": "/certifications/tv-pg.svg",
  "TV-14": "/certifications/tv-14.svg",
  "TV-MA": "/certifications/tv-ma.svg",
};

/* =========================================================
   COMPONENT
========================================================= */

export default function CertBadge({
  rating,
  region = "AUTO",
  size = 32,
  className = "",
  fallbackText = true,
}: CertBadgeProps) {
  const normalized = normalizeRating(rating);
  if (!normalized) return null;

  const resolvedRegion = region === "AUTO" ? detectRegion(normalized) : region;

  const src = resolvedRegion === "UK" ? UK_MAP[normalized] : US_MAP[normalized];

  // If no SVG found, optionally fall back to a text badge
  if (!src) {
    if (!fallbackText) return null;

    // Compact chip that aligns with your pill aesthetics
    const h = Math.max(18, Math.round(size * 0.75));

    return (
      <span
        title={`${normalized} rating`}
        aria-label={`${normalized} rating`}
        className={[
          "inline-flex items-center justify-center",
          "rounded-full px-2.5",
          "text-xs font-semibold tracking-tight tabular-nums",
          "bg-[hsl(var(--background)/0.6)] backdrop-blur",
          "ring-1 ring-[hsl(var(--foreground)/0.25)]",
          "text-[hsl(var(--foreground)/0.9)]",
          className,
        ].join(" ")}
        style={{ height: h }}
      >
        {normalized}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`${normalized} rating`}
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        // If the file path is wrong/missing, degrade gracefully.
        if (!fallbackText) return;
        const img = e.currentTarget;
        // Replace the broken image with a text chip.
        const span = document.createElement("span");
        span.textContent = normalized;
        span.className = [
          "inline-flex items-center justify-center",
          "rounded-full px-2.5",
          "text-xs font-semibold tracking-tight tabular-nums",
          "bg-[hsl(var(--background)/0.6)] backdrop-blur",
          "ring-1 ring-[hsl(var(--foreground)/0.25)]",
          "text-[hsl(var(--foreground)/0.9)]",
          className,
        ].join(" ");
        span.style.height = `${Math.max(18, Math.round(size * 0.75))}px`;
        img.replaceWith(span);
      }}
    />
  );
}
