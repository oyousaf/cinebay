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

export type ProviderType = "vidlink" | "vidfast" | "superembed";

export interface BuildEmbedOptions {
  provider?: ProviderType;
  startAt?: number;
  autoplay?: boolean;
  theme?: string;
  subtitles?: string;

  server?: string;
  hideServer?: boolean;
  fullscreenButton?: boolean;
  chromecast?: boolean;
}

/* -------------------------------------------------
   PROVIDER ORDER
-------------------------------------------------- */

export const PROVIDER_ORDER: ProviderType[] = [
  "vidlink",
  "vidfast",
  "superembed",
];

/* -------------------------------------------------
   THEME
-------------------------------------------------- */

const DEFAULT_THEME = "2dd4bf";
const GOLD_ACCENT = "f59e0b";
const WHITE = "ffffff";

/* -------------------------------------------------
   INTERNAL
-------------------------------------------------- */

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>) {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => [k, String(v)]);

  return new URLSearchParams(entries).toString();
}

function tvDefaults(intent: PlaybackIntent) {
  return {
    season: intent.season ?? 1,
    episode: intent.episode ?? 1,
  };
}

/* -------------------------------------------------
   VIDLINK
-------------------------------------------------- */

function buildVidLinkUrl(intent: PlaybackIntent, o: BuildEmbedOptions) {
  const { mediaType, tmdbId } = intent;

  const query = buildQuery({
    primaryColor: o.theme ?? DEFAULT_THEME,
    secondaryColor: GOLD_ACCENT,
    iconColor: WHITE,
    autoplay: o.autoplay ?? true,
    startAt: o.startAt && o.startAt > 5 ? o.startAt : undefined,
    nextButton: false,
  });

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?${query}`;
  }

  return `https://vidlink.pro/movie/${tmdbId}?${query}`;
}

/* -------------------------------------------------
   VIDFAST
-------------------------------------------------- */

function buildVidFastUrl(intent: PlaybackIntent, o: BuildEmbedOptions) {
  const { mediaType, tmdbId } = intent;

  const query = buildQuery({
    autoplay: o.autoplay ?? true,
    startAt: o.startAt && o.startAt > 5 ? o.startAt : undefined,
    theme: o.theme ?? DEFAULT_THEME,
    sub: o.subtitles ?? "en",
    server: o.server ?? "auto",
    hideServer: o.hideServer ?? true,
    fullscreenButton: o.fullscreenButton ?? true,
    chromecast: false,
  });

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?${query}`;
  }

  return `https://vidfast.pro/movie/${tmdbId}?${query}`;
}

/* -------------------------------------------------
   SUPEREMBED
-------------------------------------------------- */

function buildSuperEmbedUrl(intent: PlaybackIntent, o: BuildEmbedOptions = {}) {
  const { mediaType, tmdbId } = intent;

  const autoplay = o.autoplay === false ? 0 : 1;
  const theme = o.theme ?? DEFAULT_THEME;

  const query = buildQuery({
    tmdb: 1,
    autoplay,
    t: o.startAt && o.startAt > 5 ? o.startAt : undefined,
    color: theme,
    quality: "auto",
  });

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://multiembed.mov/?video_id=${tmdbId}&s=${season}&e=${episode}&${query}`;
  }

  return `https://multiembed.mov/?video_id=${tmdbId}&${query}`;
}

/* -------------------------------------------------
   PUBLIC API
-------------------------------------------------- */

export function buildEmbedUrl(
  intent: PlaybackIntent,
  options: BuildEmbedOptions = {},
): string {
  const provider = options.provider ?? "vidlink";

  if (provider === "vidlink") {
    return buildVidLinkUrl(intent, options);
  }

  if (provider === "vidfast") {
    return buildVidFastUrl(intent, options);
  }

  return buildSuperEmbedUrl(intent, options);
}
