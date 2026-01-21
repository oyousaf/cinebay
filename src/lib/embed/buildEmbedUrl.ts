/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
export type MediaType = "movie" | "tv";

export interface PlaybackIntent {
  mediaType: MediaType;
  tmdbId: number;

  // TV-only
  season?: number;
  episode?: number;
}

/* -------------------------------------------------
   THEME (LOCKED)
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
  { name: "vidlink", domain: "vidlink.pro" },
  { name: "vidsrc", domain: "vidsrc.to" },
  { name: "vidsrc", domain: "vidsrc.me" },
  { name: "vidsrc", domain: "vidsrc.cc" },
  { name: "vidsrc", domain: "vidsrc-embed.ru" },
  { name: "vidsrc", domain: "vidsrc-embed.su" },
  { name: "vidsrc", domain: "vidsrcme.su" },
  { name: "vidsrc", domain: "vsrc.su" },
];

/* -------------------------------------------------
   INTERNAL
-------------------------------------------------- */
function buildQuery(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
}

/* -------------------------------------------------
   PUBLIC API
-------------------------------------------------- */
export function buildEmbedUrl(
  provider: { name: string; domain: string },
  intent: PlaybackIntent
): string {
  const { mediaType, tmdbId } = intent;

  /* ---------- VIDLINK (PRIMARY) ---------- */
  if (provider.name === "vidlink") {
    if (mediaType === "tv") {
      const season = intent.season ?? 1;
      const episode = intent.episode ?? 1;

      return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?${buildQuery(
        EMBED_THEME
      )}`;
    }

    return `https://vidlink.pro/movie/${tmdbId}?${buildQuery(EMBED_THEME)}`;
  }

  /* ---------- VIDSRC FALLBACKS ---------- */
  if (mediaType === "tv") {
    const season = intent.season ?? 1;
    const episode = intent.episode ?? 1;

    return `https://${provider.domain}/embed/tv/${tmdbId}/${season}/${episode}`;
  }

  return `https://${provider.domain}/embed/movie/${tmdbId}`;
}

/* -------------------------------------------------
   CACHE KEY (MEDIA-AGNOSTIC, EPISODE-SENSITIVE)
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
