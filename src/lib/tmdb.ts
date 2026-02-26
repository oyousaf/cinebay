import axios from "axios";
import type { Movie, Genre } from "@/types/movie";
import { DEVS_PICK_LIST } from "./constants/devsPick";

export const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

/* =========================================================
   CONFIG
========================================================= */

const MIN_RATING = 6.5;

const oneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
};

const threeMonthsAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d;
};

/* =========================================================
   SAFE REQUEST CACHE
========================================================= */

type CacheEntry = {
  data: any;
  expires: number;
};

const CACHE_TTL = 1000 * 60 * 5;

const dataCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

function getCached(key: string) {
  let entry = dataCache.get(key);

  if (!entry && typeof window !== "undefined") {
    const stored = localStorage.getItem(`tmdb_${key}`);

    if (stored) {
      try {
        const parsed: CacheEntry = JSON.parse(stored);
        entry = parsed;
        dataCache.set(key, parsed);
      } catch {
        localStorage.removeItem(`tmdb_${key}`);
      }
    }
  }

  if (!entry) return null;

  if (Date.now() > entry.expires) {
    dataCache.delete(key);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`tmdb_${key}`);
    }
    return null;
  }

  return entry.data;
}

function setCached(key: string, data: any) {
  const entry = {
    data,
    expires: Date.now() + CACHE_TTL,
  };

  dataCache.set(key, entry);

  localStorage.setItem(`tmdb_${key}`, JSON.stringify(entry));
}

/* =========================================================
   GENRE EXCLUSION
========================================================= */

const EXCLUDED_GENRES = new Set<string>([
  "animation",
  "family",
  "kids",
  "music",
  "romance",
  "news",
  "reality",
  "soap",
  "talk",
  "western",
]);

const isAllowedContent = (genres: string[]) =>
  !genres.some((g) => EXCLUDED_GENRES.has(g));

const isNewMovie = (date?: string) =>
  Boolean(date && new Date(date) >= oneMonthAgo());

const isWithin3Months = (date?: string) =>
  Boolean(date && new Date(date) >= threeMonthsAgo());

const sortByRating = (a: Movie, b: Movie) =>
  (b.vote_average ?? 0) - (a.vote_average ?? 0);

/* =========================================================
   GENRES
========================================================= */

const extractGenresRaw = (detail: any): Genre[] =>
  Array.isArray(detail?.genres)
    ? detail.genres
        .map((g: any) => ({ id: Number(g?.id), name: String(g?.name ?? "") }))
        .filter((g: Genre) => Number.isFinite(g.id) && g.name.length > 0)
    : [];

/* =========================================================
   SUMMARY TRANSFORMER
========================================================= */

function toMovieSummary(item: any, forcedType?: "movie" | "tv"): Movie {
  const type =
    forcedType ??
    (item?.media_type === "tv" || item?.first_air_date ? "tv" : "movie");

  const release = item?.release_date || item?.first_air_date || "";

  return {
    id: Number(item?.id ?? -1),
    media_type: type,
    title: item?.title || item?.name || "Untitled",
    name: item?.name,
    overview: item?.overview ?? "",
    poster_path: item?.poster_path ?? "",
    backdrop_path: item?.backdrop_path ?? "",
    profile_path: "",
    release_date: release,
    vote_average: item?.vote_average ?? 0,
    vote_count: item?.vote_count ?? 0,
    genres: [],
    genres_raw: [],
    runtime: null,
    original_language: item?.original_language ?? "",
    known_for: [],
    status: undefined,
  };
}

/* =========================================================
   BASE FETCH (CACHED)
========================================================= */

const baseURL = `${import.meta.env.VITE_API_URL}/api/tmdb`;

export async function fetchFromProxy(endpoint: string) {
  // Cached data
  const cached = getCached(endpoint);
  if (cached) return cached;

  // In-flight dedup
  if (inflight.has(endpoint)) {
    return inflight.get(endpoint);
  }

  const request = axios
    .get(`${baseURL}${endpoint}`)
    .then((res) => {
      setCached(endpoint, res.data);
      inflight.delete(endpoint);
      return res.data;
    })
    .catch(() => {
      inflight.delete(endpoint);
      return null;
    });

  inflight.set(endpoint, request);

  return request;
}

/* =========================================================
   MULTI-PAGE FETCH
========================================================= */

async function fetchAllPages(endpoint: string, max = 3) {
  const out: any[] = [];

  for (let p = 1; p <= max; p++) {
    const d = await fetchFromProxy(`${endpoint}&page=${p}`);
    if (!d?.results?.length) break;
    out.push(...d.results);
  }

  return out;
}

/* =========================================================
   DETAILS TRANSFORMER
========================================================= */

function toMovie(detail: any, type: "movie" | "tv" | "person"): Movie {
  const release = detail?.release_date || detail?.first_air_date || "";
  const genres_raw = extractGenresRaw(detail);
  const genres = genres_raw.map((g) => g.name.toLowerCase());

  const similar = Array.isArray(detail?.similar?.results)
    ? detail.similar.results
        .filter(
          (r: any) =>
            r?.poster_path &&
            r?.vote_average >= MIN_RATING &&
            r?.original_language === "en",
        )
        .slice(0, 10)
        .map((r: any) => toMovieSummary(r, type === "tv" ? "tv" : "movie"))
    : [];

  const recommendations = Array.isArray(detail?.recommendations?.results)
    ? detail.recommendations.results
        .filter(
          (r: any) =>
            r?.poster_path &&
            r?.vote_average >= MIN_RATING &&
            r?.original_language === "en",
        )
        .slice(0, 10)
        .map((r: any) => toMovieSummary(r, type === "tv" ? "tv" : "movie"))
    : [];

  return {
    id: Number(detail?.id ?? -1),
    media_type: type,
    title: detail?.title || detail?.name || "Untitled",
    name: detail?.name,
    overview: detail?.overview ?? "",
    poster_path: detail?.poster_path ?? "",
    backdrop_path: detail?.backdrop_path ?? "",
    profile_path: detail?.profile_path ?? "",
    release_date: release,
    vote_average: detail?.vote_average ?? 0,
    vote_count: detail?.vote_count ?? 0,
    genres,
    genres_raw,
    runtime: typeof detail?.runtime === "number" ? detail.runtime : null,
    original_language: detail?.original_language ?? "",
    created_by: detail?.created_by ?? [],
    seasons: detail?.seasons ?? [],
    production_companies: detail?.production_companies ?? [],
    networks: type === "tv" ? (detail?.networks ?? []) : [],
    credits: {
      cast: detail?.credits?.cast ?? [],
      crew: detail?.credits?.crew ?? [],
    },
    combined_credits: detail?.combined_credits,
    biography: detail?.biography,
    birthday: detail?.birthday,
    deathday: detail?.deathday,
    place_of_birth: detail?.place_of_birth,
    known_for_department: detail?.known_for_department,
    known_for:
      type === "person" && detail?.combined_credits
        ? [
            ...(detail.combined_credits.cast ?? []),
            ...(detail.combined_credits.crew ?? []),
          ]
            .filter(
              (c: any) =>
                (c.media_type === "movie" || c.media_type === "tv") &&
                c.poster_path &&
                c.vote_average >= MIN_RATING,
            )
            .sort((a: any, b: any) => b.vote_average - a.vote_average)
            .slice(0, 20)
            .map((c: any) => ({
              id: c.id,
              media_type: c.media_type,
              title: c.title,
              name: c.name,
              poster_path: c.poster_path,
              backdrop_path: c.backdrop_path,
              vote_average: c.vote_average,
              release_date: c.release_date,
              first_air_date: c.first_air_date,
            }))
        : [],
    similar,
    recommendations,
    status: undefined,
  };
}

/* =========================================================
   DETAILS
========================================================= */

export async function fetchDetails(
  id: number,
  type: "movie" | "tv" | "person",
) {
  const endpoint =
    type === "person"
      ? `/person/${id}?language=en-GB&append_to_response=combined_credits,images`
      : `/${type}/${id}?language=en-GB&append_to_response=credits,similar,recommendations`;

  const d = await fetchFromProxy(endpoint);
  return d ? toMovie(d, type) : null;
}

/* =========================================================
   PLACEHOLDER
========================================================= */

const empty = (t: "movie" | "tv"): Movie => ({
  id: -1,
  media_type: t,
  title: t === "movie" ? "No movies found" : "No shows found",
  overview: "",
  poster_path: "",
  backdrop_path: "",
  profile_path: "",
  release_date: "",
  vote_average: 0,
  vote_count: 0,
  genres: [],
  genres_raw: [],
  runtime: null,
  original_language: "",
  known_for: [],
  status: undefined,
});

/* =========================================================
   MOVIES
========================================================= */

export async function fetchMovies(): Promise<Movie[]> {
  const base = await fetchAllPages(
    `/discover/movie?language=en&include_adult=false&vote_average.gte=${MIN_RATING}`,
    3,
  );

  if (!base.length) return [empty("movie")];

  const detailed = await Promise.all(
    base
      .filter(
        (m: any) =>
          m?.original_language === "en" &&
          m?.vote_average >= MIN_RATING &&
          isWithin3Months(m?.release_date),
      )
      .map((m: any) => fetchDetails(m.id, "movie")),
  );

  const final = (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres ?? []),
  );

  final.forEach((m) => {
    m.status = isNewMovie(m.release_date) ? "new" : undefined;
  });

  return [
    ...final.filter((m) => m.status === "new").sort(sortByRating),
    ...final.filter((m) => !m.status).sort(sortByRating),
  ];
}

/* =========================================================
   TV
========================================================= */

export async function fetchShows(): Promise<Movie[]> {
  const base = await fetchAllPages(
    `/discover/tv?language=en&include_adult=false&vote_average.gte=${MIN_RATING}`,
    3,
  );

  if (!base.length) return [empty("tv")];

  const detailed = await Promise.all(
    base
      .filter((s: any) => s?.original_language === "en")
      .map((s: any) => fetchDetails(s.id, "tv")),
  );

  const filtered = (detailed.filter(Boolean) as Movie[]).filter((s) =>
    isAllowedContent(s.genres ?? []),
  );

  filtered.forEach((s) => {
    const firstAir = s.release_date ? new Date(s.release_date) : null;
    const lastSeasonAir = s.seasons?.at(-1)?.air_date
      ? new Date(s.seasons.at(-1)!.air_date!)
      : null;

    const lastAir =
      lastSeasonAir || (s.last_air_date ? new Date(s.last_air_date) : null);

    if (firstAir && firstAir >= oneMonthAgo()) s.status = "new";
    else if (lastAir && lastAir >= oneMonthAgo()) s.status = "renewed";
  });

  const within3 = filtered.filter((s) => {
    const firstAir = s.release_date ? new Date(s.release_date) : null;
    const lastSeasonAir = s.seasons?.at(-1)?.air_date
      ? new Date(s.seasons.at(-1)!.air_date!)
      : null;

    const lastAir =
      lastSeasonAir || (s.last_air_date ? new Date(s.last_air_date) : null);

    return (
      (lastAir && lastAir >= threeMonthsAgo()) ||
      (firstAir && firstAir >= threeMonthsAgo())
    );
  });

  return [
    ...within3.filter((s) => s.status === "new").sort(sortByRating),
    ...within3.filter((s) => s.status === "renewed").sort(sortByRating),
    ...within3.filter((s) => !s.status).sort(sortByRating),
  ];
}

/* =========================================================
   SEASON EPISODES
========================================================= */

export async function fetchSeasonEpisodes(
  tvId: number,
  season: number,
): Promise<any[] | null> {
  const d = await fetchFromProxy(`/tv/${tvId}/season/${season}?language=en-GB`);
  return d?.episodes ?? null;
}

/* =========================================================
   DEV PICKS
========================================================= */

export async function fetchDevsPick(): Promise<Movie[]> {
  const out = await Promise.all(
    DEVS_PICK_LIST.map((id) => fetchDetails(id, "movie")),
  );
  return (out.filter(Boolean) as Movie[]).sort(sortByRating);
}

/* =========================================================
   TRENDING
========================================================= */

export async function fetchTrendingClean(): Promise<Movie[]> {
  const data = await fetchFromProxy("/trending/all/day");

  if (!data?.results?.length) return [];

  return data.results
    .filter(
      (item: any) =>
        item?.id &&
        (item.media_type === "movie" || item.media_type === "tv") &&
        item.vote_average >= MIN_RATING &&
        item.vote_count >= 150 &&
        item.original_language !== "ja",
    )
    .sort(
      (a: any, b: any) =>
        b.vote_average - a.vote_average || b.vote_count - a.vote_count,
    )
    .slice(0, 10)
    .map((item: any) => toMovieSummary(item));
}
