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
  captions: 0,
  primaryColor: "2dd4bf",
  secondaryColor: "0f766e",
};

/* -------------------------------------------------
   PROVIDERS
-------------------------------------------------- */
export const EMBED_PROVIDERS = [
  { name: "vidlink", domain: "vidlink.pro", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.to", supportsEpisodes: false },
  { name: "vidsrc", domain: "vidsrc.me", supportsEpisodes: false },
  { name: "vidsrc", domain: "vidsrc.cc", supportsEpisodes: false },
  { name: "vidsrc", domain: "vidsrc-embed.ru", supportsEpisodes: false },
  { name: "vidsrc", domain: "vidsrc-embed.su", supportsEpisodes: false },
  { name: "vidsrc", domain: "vidsrcme.su", supportsEpisodes: false },
  { name: "vidsrc", domain: "vsrc.su", supportsEpisodes: false },
];

/* -------------------------------------------------
   INTERNAL
-------------------------------------------------- */
function buildQuery(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
}

/* -------------------------------------------------
   PUBLIC API
-------------------------------------------------- */
export function buildEmbedUrl(
  provider: (typeof EMBED_PROVIDERS)[number],
  intent: PlaybackIntent,
): string {
  const { mediaType, tmdbId } = intent;

  /* ---------- VIDLINK (EPISODE SAFE) ---------- */
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

  /* ---------- VIDSRC (SHOW-LEVEL ONLY) ---------- */
  if (mediaType === "tv") {
    return `https://${provider.domain}/embed/tv/${tmdbId}`;
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
    `theme:${EMBED_THEME.primaryColor}`,
  ].join(":");
}
