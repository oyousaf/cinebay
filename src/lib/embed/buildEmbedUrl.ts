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
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
}

/* -------------------------------------------------
   PUBLIC API
-------------------------------------------------- */
export function buildEmbedUrl(
  provider: { name: string; domain: string },
  intent: PlaybackIntent,
): string {
  const { mediaType, tmdbId } = intent;

  if (provider.name === "vidlink") {
    return `https://vidlink.pro/${mediaType}/${tmdbId}?${buildQuery(
      EMBED_THEME,
    )}`;
  }

  return `https://${provider.domain}/embed/${mediaType}/${tmdbId}`;
}

/* -------------------------------------------------
   CACHE KEY (MEDIA-AGNOSTIC)
-------------------------------------------------- */
export function buildEmbedCacheKey(intent: PlaybackIntent) {
  return `embed:${intent.tmdbId}:theme:${EMBED_THEME.primaryColor}`;
}
