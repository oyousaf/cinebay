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
   PROVIDERS
-------------------------------------------------- */
export const EMBED_PROVIDERS = [
  { name: "vidlink", domain: "vidlink.pro", supportsEpisodes: true },
  { name: "vidsrc", domain: "vsembed.ru", supportsEpisodes: true },
  { name: "vidsrc", domain: "vsembed.su", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrcme.ru", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrcme.su", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.to", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.cc", supportsEpisodes: true },
] as const;

type Provider = (typeof EMBED_PROVIDERS)[number];

/* -------------------------------------------------
   THEME
-------------------------------------------------- */
const VIDLINK_THEME = {
  primaryColor: "2dd4bf",
  secondaryColor: "f59e0b",
  iconColor: "ffffff",
  title: true,
  poster: true,
  autoplay: true,
  nextbutton: true,
} as const;

/* -------------------------------------------------
   INTERNAL
-------------------------------------------------- */
type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>) {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, typeof v === "boolean" ? String(v) : String(v)]);

  return new URLSearchParams(entries).toString();
}

function tvDefaults(intent: PlaybackIntent) {
  // Keep your existing defaulting behaviour, but centralised.
  const season = intent.season ?? 1;
  const episode = intent.episode ?? 1;
  return { season, episode };
}

/** Choose a stable fallback VidSrc provider. Prefer vidsrc.to, else first vidsrc. */
function pickFallbackVidSrcProvider(): Provider | null {
  const preferred = EMBED_PROVIDERS.find(
    (p) => p.name === "vidsrc" && p.domain === "vidsrc.to",
  );
  if (preferred) return preferred;

  return EMBED_PROVIDERS.find((p) => p.name === "vidsrc") ?? null;
}

function buildVidSrcUrl(provider: Provider, intent: PlaybackIntent): string {
  const { mediaType, tmdbId } = intent;

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://${provider.domain}/embed/tv/${tmdbId}/${season}/${episode}`;
  }

  return `https://${provider.domain}/embed/movie/${tmdbId}`;
}

/* Deterministic theme key (exclude fallback_url because it varies per title) */
const THEME_KEY = Object.entries(VIDLINK_THEME)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}:${String(v)}`)
  .join("|");

/* -------------------------------------------------
   PUBLIC API
-------------------------------------------------- */
export function buildEmbedUrl(provider: Provider, intent: PlaybackIntent): string {
  const { mediaType, tmdbId } = intent;

  /* ---------- VIDLINK ---------- */
  if (provider.name === "vidlink") {
    const fallbackProvider = pickFallbackVidSrcProvider();
    const fallbackUrl = fallbackProvider ? buildVidSrcUrl(fallbackProvider, intent) : undefined;

    const query = buildQuery({
      ...VIDLINK_THEME,
      fallback_url: fallbackUrl,
    });

    if (mediaType === "tv") {
      const { season, episode } = tvDefaults(intent);
      return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?${query}`;
    }

    return `https://vidlink.pro/movie/${tmdbId}?${query}`;
  }

  /* ---------- VIDSRC ---------- */
  return buildVidSrcUrl(provider, intent);
}

/* -------------------------------------------------
   CACHE KEY
-------------------------------------------------- */
export function buildEmbedCacheKey(intent: PlaybackIntent) {
  const epKey =
    intent.mediaType === "tv"
      ? `s${intent.season ?? 1}e${intent.episode ?? 1}`
      : "movie";

  const fallbackProvider = pickFallbackVidSrcProvider();
  const fallbackKey = fallbackProvider ? `fallback:${fallbackProvider.domain}` : "fallback:none";

  return ["embed", intent.tmdbId, intent.mediaType, epKey, `theme:${THEME_KEY}`, fallbackKey].join(
    ":",
  );
}