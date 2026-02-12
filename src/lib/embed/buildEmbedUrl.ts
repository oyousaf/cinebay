/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
export type MediaType = "movie" | "tv";

export interface PlaybackIntent {
  mediaType: MediaType;
  tmdbId: number;

  season?: number;
  episode?: number;
}

/* -------------------------------------------------
   THEME 
-------------------------------------------------- */
const EMBED_THEME = {
  autoplay: 1,
  muted: 1,
  cc: 1,
  nextbutton: 1,
  color: "2dd4bf",
} as const;

/* -------------------------------------------------
   PROVIDERS
-------------------------------------------------- */
export const EMBED_PROVIDERS = [
  { name: "vidlink", domain: "vidlink.pro", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.to", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.me", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.cc", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc-embed.ru", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc-embed.su", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrcme.su", supportsEpisodes: true },
  { name: "vidsrc", domain: "vsrc.su", supportsEpisodes: true },
];

/* -------------------------------------------------
   INTERNAL
-------------------------------------------------- */
function buildQuery(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
}

/* Deterministic theme key */
const THEME_KEY = Object.entries(EMBED_THEME)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}:${v}`)
  .join("|");

/* -------------------------------------------------
   PUBLIC API
-------------------------------------------------- */
export function buildEmbedUrl(
  provider: (typeof EMBED_PROVIDERS)[number],
  intent: PlaybackIntent,
): string {
  const { mediaType, tmdbId } = intent;

  /* ---------- VIDLINK ---------- */
  if (provider.name === "vidlink") {
    if (mediaType === "tv") {
      const season = intent.season ?? 1;
      const episode = intent.episode ?? 1;

      return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?${buildQuery(
        EMBED_THEME,
      )}`;
    }

    return `https://vidlink.pro/movie/${tmdbId}?${buildQuery(EMBED_THEME)}`;
  }

  /* ---------- VIDSRC ---------- */
  if (mediaType === "tv") {
    const season = intent.season ?? 1;
    const episode = intent.episode ?? 1;

    return `https://${provider.domain}/embed/tv/${tmdbId}/${season}/${episode}`;
  }

  return `https://${provider.domain}/embed/movie/${tmdbId}`;
}

/* -------------------------------------------------
   CACHE KEY
-------------------------------------------------- */
export function buildEmbedCacheKey(intent: PlaybackIntent) {
  return [
    "embed",
    intent.tmdbId,
    intent.mediaType === "tv"
      ? `s${intent.season ?? 1}e${intent.episode ?? 1}`
      : "movie",
    `theme:${THEME_KEY}`,
  ].join(":");
}
