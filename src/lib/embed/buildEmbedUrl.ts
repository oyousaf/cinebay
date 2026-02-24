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
export const VIDLINK_PROVIDER = {
  name: "vidlink",
  domain: "vidlink.pro",
  supportsEpisodes: true,
} as const;

/* Priority order = fallback order */
export const VIDSRC_PROVIDERS = [
  { name: "vidsrc", domain: "vsembed.ru", supportsEpisodes: true },
  { name: "vidsrc", domain: "vsembed.su", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrcme.ru", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrcme.su", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.to", supportsEpisodes: true },
  { name: "vidsrc", domain: "vidsrc.cc", supportsEpisodes: true },
] as const;

type VidSrcProvider = (typeof VIDSRC_PROVIDERS)[number];

/* First provider = priority fallback */
const PRIMARY_VIDSRC = VIDSRC_PROVIDERS[0];

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
  return {
    season: intent.season ?? 1,
    episode: intent.episode ?? 1,
  };
}

function buildVidSrcUrl(provider: VidSrcProvider, intent: PlaybackIntent) {
  const { mediaType, tmdbId } = intent;

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://${provider.domain}/embed/tv/${tmdbId}/${season}/${episode}`;
  }

  return `https://${provider.domain}/embed/movie/${tmdbId}`;
}

/* Deterministic theme key */
const THEME_KEY = Object.entries(VIDLINK_THEME)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}:${String(v)}`)
  .join("|");

/* -------------------------------------------------
   PUBLIC API
-------------------------------------------------- */
export function buildEmbedUrl(intent: PlaybackIntent): string {
  const { mediaType, tmdbId } = intent;

  /* ---------- Build fallback first ---------- */
  const fallbackUrl = buildVidSrcUrl(PRIMARY_VIDSRC, intent);

  const query = buildQuery({
    ...VIDLINK_THEME,
    fallback_url: fallbackUrl,
  });

  /* ---------- VIDLINK ---------- */
  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://${VIDLINK_PROVIDER.domain}/tv/${tmdbId}/${season}/${episode}?${query}`;
  }

  return `https://${VIDLINK_PROVIDER.domain}/movie/${tmdbId}?${query}`;
}

/* -------------------------------------------------
   CACHE KEY
-------------------------------------------------- */
export function buildEmbedCacheKey(intent: PlaybackIntent) {
  const epKey =
    intent.mediaType === "tv"
      ? `s${intent.season ?? 1}e${intent.episode ?? 1}`
      : "movie";

  return [
    "embed",
    intent.tmdbId,
    intent.mediaType,
    epKey,
    `theme:${THEME_KEY}`,
    `fallback:${PRIMARY_VIDSRC.domain}`,
  ].join(":");
}
