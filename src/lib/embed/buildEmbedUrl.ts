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

export type ProviderType = "vidfast" | "vidbinge" | "superembed";

export interface BuildEmbedOptions {
  provider?: ProviderType;

  startAt?: number;
  autoplay?: boolean;

  theme?: string;

  server?: string;

  hideServer?: boolean;
  fullscreenButton?: boolean;
  chromecast?: boolean;
}

/* -------------------------------------------------
   PROVIDER ORDER
-------------------------------------------------- */

export const PROVIDER_ORDER: ProviderType[] = [
  "vidfast",
  "vidbinge",
  "superembed",
];

/* -------------------------------------------------
   THEME
-------------------------------------------------- */

const DEFAULT_THEME = "2dd4bf";
const GOLD_ACCENT = "f59e0b";
const WHITE = "ffffff";

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>) {
  const entries = Object.entries(params)
    .filter(([, value]) => {
      return value !== undefined && value !== null;
    })
    .map(([key, value]) => {
      return [key, String(value)];
    });

  return new URLSearchParams(entries).toString();
}

function bool(value: boolean | undefined, fallback = true) {
  if (value === undefined) {
    return fallback ? 1 : 0;
  }

  return value ? 1 : 0;
}

function sanitizeStartAt(startAt?: number) {
  if (!startAt || startAt <= 5) {
    return undefined;
  }

  return Math.floor(startAt);
}

function tvDefaults(intent: PlaybackIntent) {
  return {
    season: intent.season ?? 1,
    episode: intent.episode ?? 1,
  };
}

/* -------------------------------------------------
   VIDFAST
-------------------------------------------------- */

function buildVidFastUrl(intent: PlaybackIntent, options: BuildEmbedOptions) {
  const { mediaType, tmdbId } = intent;

  const query = buildQuery({
    autoplay: options.autoplay === false ? "false" : "true",

    startAt: sanitizeStartAt(options.startAt),

    theme: options.theme ?? DEFAULT_THEME,

    server: options.server ?? "auto",

    hideServer: bool(options.hideServer, true),

    fullscreenButton: bool(options.fullscreenButton, true),

    chromecast: 0,

    nextButton: 0,
    autoNext: 0,
  });

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);

    return `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?${query}`;
  }

  return `https://vidfast.pro/movie/${tmdbId}?${query}`;
}

/* -------------------------------------------------
   VIDBINGE
-------------------------------------------------- */

function buildVidBingeUrl(intent: PlaybackIntent, options: BuildEmbedOptions) {
  const { mediaType, tmdbId } = intent;

  const query = buildQuery({
    autoplay: options.autoplay === false ? "false" : "true",

    startAt: sanitizeStartAt(options.startAt),

    color: options.theme ?? DEFAULT_THEME,

    primaryColor: options.theme ?? DEFAULT_THEME,

    secondaryColor: GOLD_ACCENT,

    iconColor: WHITE,

    nextButton: 0,
    autoNext: 0,
  });

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);

    return `https://www.vidbinge.to/embed/tv/${tmdbId}/${season}/${episode}?${query}`;
  }

  return `https://www.vidbinge.to/embed/movie/${tmdbId}?${query}`;
}

/* -------------------------------------------------
   SUPEREMBED
-------------------------------------------------- */

function buildSuperEmbedUrl(
  intent: PlaybackIntent,
  options: BuildEmbedOptions = {},
) {
  const { mediaType, tmdbId } = intent;

  const query = buildQuery({
    tmdb: 1,

    autoplay: options.autoplay === false ? 0 : 1,

    t: sanitizeStartAt(options.startAt),

    color: options.theme ?? DEFAULT_THEME,

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
  const provider = options.provider ?? "vidfast";

  switch (provider) {
    case "vidfast":
      return buildVidFastUrl(intent, options);

    case "vidbinge":
      return buildVidBingeUrl(intent, options);

    case "superembed":
    default:
      return buildSuperEmbedUrl(intent, options);
  }
}
