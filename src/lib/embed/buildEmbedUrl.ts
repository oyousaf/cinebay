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
  title?: boolean;
  poster?: boolean;
  nextButton?: boolean;
  autoNext?: boolean;

  // VidFast optional controls
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

const DEFAULT_THEME = "2dd4bf";

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
   VIDFAST
-------------------------------------------------- */

function buildVidFastUrl(intent: PlaybackIntent, o: BuildEmbedOptions) {
  const { mediaType, tmdbId } = intent;

  const query = buildQuery({
    autoplay: o.autoplay ?? true,
    startAt: o.startAt && o.startAt > 0 ? o.startAt : undefined,
    theme: o.theme ?? DEFAULT_THEME,
    title: o.title,
    poster: o.poster,
    sub: o.subtitles,

    nextButton: o.nextButton ?? mediaType === "tv",
    autoNext: o.autoNext ?? mediaType === "tv",

    server: o.server,
    hideServer: o.hideServer,
    fullscreenButton: o.fullscreenButton,
    chromecast: o.chromecast,
  });

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?${query}`;
  }

  return `https://vidfast.pro/movie/${tmdbId}?${query}`;
}

/* -------------------------------------------------
   VIDLINK
-------------------------------------------------- */

function buildVidLinkUrl(intent: PlaybackIntent, o: BuildEmbedOptions) {
  const { mediaType, tmdbId } = intent;

  const query = buildQuery({
    primaryColor: o.theme ?? DEFAULT_THEME,
    secondaryColor: "f59e0b",
    iconColor: "ffffff",

    title: o.title ?? true,
    poster: o.poster ?? true,
    autoplay: o.autoplay ?? true,

    nextbutton: o.nextButton ?? mediaType === "tv",

    startAt: o.startAt && o.startAt > 0 ? o.startAt : undefined,
  });

  if (mediaType === "tv") {
    const { season, episode } = tvDefaults(intent);
    return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?${query}`;
  }

  return `https://vidlink.pro/movie/${tmdbId}?${query}`;
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
    t: o.startAt && o.startAt > 0 ? o.startAt : undefined,
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

  if (provider === "vidfast") {
    return buildVidFastUrl(intent, options);
  }

  if (provider === "superembed") {
    return buildSuperEmbedUrl(intent, options);
  }

  return buildVidLinkUrl(intent, options);
}
