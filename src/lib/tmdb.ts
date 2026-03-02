import axios from "axios";
import type { Movie, Genre } from "@/types/movie";
import { DEVS_PICK_LIST } from "./constants/devsPick";

export const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

/* =========================================================
   CONFIG
========================================================= */

const MIN_RATING = 6.5;
const MAX_PAGES = 3;

/* =========================================================
   PERSON ROLE PRIORITY
========================================================= */

const ROLE_PRIORITY = {
  Director: 4,
  Writer: 3,
  Actor: 2,
  Actress: 2,
  Producer: 1,
} as const;

const ROLE_THRESHOLDS: Record<string, number> = {
  Actor: 5,
  Actress: 5,
  Director: 2,
  Writer: 2,
  Producer: 3,
};

const JOB_GROUPS: Record<string, string[]> = {
  Director: ["Director"],
  Writer: ["Writer", "Screenplay", "Story", "Creator", "Teleplay"],
  Producer: [
    "Producer",
    "Executive Producer",
    "Co-Executive Producer",
    "Consulting Producer",
  ],
};

const getActingLabel = (gender?: number) =>
  gender === 1 ? "Actress" : "Actor";

const countCrewJobs = (crew: any[], jobs: string[]) =>
  crew.reduce((n, c) => (jobs.includes(c?.job) ? n + 1 : n), 0);

function buildPersonRoles(detail: any): string[] {
  const dept = detail?.known_for_department;
  const cast = detail?.combined_credits?.cast ?? [];
  const crew = detail?.combined_credits?.crew ?? [];

  const actingLabel = getActingLabel(detail?.gender);

  const counts: Record<string, number> = {
    [actingLabel]: cast.length,
    Director: countCrewJobs(crew, JOB_GROUPS.Director),
    Writer: countCrewJobs(crew, JOB_GROUPS.Writer),
    Producer: countCrewJobs(crew, JOB_GROUPS.Producer),
  };

  const roles: string[] = [];

  if (dept === "Acting") roles.push(actingLabel);
  else if (dept === "Directing") roles.push("Director");
  else if (dept === "Writing") roles.push("Writer");
  else if (dept === "Production") roles.push("Producer");

  Object.entries(counts)
    .filter(([role, count]) => count >= ROLE_THRESHOLDS[role])
    .sort(
      (a, b) =>
        ROLE_PRIORITY[b[0] as keyof typeof ROLE_PRIORITY] -
        ROLE_PRIORITY[a[0] as keyof typeof ROLE_PRIORITY],
    )
    .forEach(([role]) => {
      if (!roles.includes(role)) roles.push(role);
    });

  return roles.slice(0, 5);
}

/* =========================================================
   TIME HELPERS
========================================================= */

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

const isWithinMonths = (date?: string | null, n = 1) =>
  Boolean(date && new Date(date) >= monthsAgo(n));

const sortByRating = (a: Movie, b: Movie) =>
  (b.vote_average ?? 0) - (a.vote_average ?? 0);

/* =========================================================
   TV STATUS (Single Authority)
========================================================= */

const getTvStatus = (
  show: Movie,
): { status: "new" | "renewed" | undefined; visible: boolean } => {
  const first = show.first_air_date;
  const last = show.last_air_date;

  const first1m = isWithinMonths(first, 1);
  const last1m = isWithinMonths(last, 1);

  const first3m = isWithinMonths(first, 3);
  const last3m = isWithinMonths(last, 3);

  let status: "new" | "renewed" | undefined;

  if (first1m) status = "new";
  else if (last1m) status = "renewed";
  else status = undefined;

  return {
    status,
    visible: first3m || last3m,
  };
};

/* =========================================================
   CONTENT FILTERS
========================================================= */

const EXCLUDED_GENRES = new Set([
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
  !genres.some((g) => EXCLUDED_GENRES.has(g.toLowerCase()));

const isHighQuality = (item: any) =>
  Boolean(
    item?.poster_path &&
    item?.original_language === "en" &&
    (item?.vote_average ?? 0) >= MIN_RATING,
  );

/* =========================================================
   GENRES
========================================================= */

const extractGenresRaw = (detail: any): Genre[] =>
  Array.isArray(detail?.genres)
    ? detail.genres
        .map((g: any) => ({ id: Number(g?.id), name: String(g?.name ?? "") }))
        .filter((g: Genre) => Number.isFinite(g.id) && g.name)
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

const mapSummaries = (arr: any[], forcedType?: "movie" | "tv"): Movie[] =>
  Array.isArray(arr)
    ? arr
        .filter(isHighQuality)
        .slice(0, 10)
        .map((x) => toMovieSummary(x, forcedType))
    : [];

/* =========================================================
   DETAILS TRANSFORMER
========================================================= */

function toMovie(detail: any, type: "movie" | "tv" | "person"): Movie {
  const release = detail?.release_date || detail?.first_air_date || "";

  const genres_raw = extractGenresRaw(detail);
  const genres = genres_raw.map((g) => g.name);

  const forcedType = type === "tv" ? "tv" : "movie";

  const runtime =
    typeof detail?.runtime === "number"
      ? detail.runtime
      : (detail?.episode_run_time?.[0] ?? null);

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
    first_air_date: detail?.first_air_date,
    last_air_date: detail?.last_air_date ?? null,
    vote_average: detail?.vote_average ?? 0,
    vote_count: detail?.vote_count ?? 0,
    genres,
    genres_raw,
    runtime,
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
    roles:
      type === "person" && detail?.combined_credits
        ? buildPersonRoles(detail)
        : [],
    known_for: [],
    similar: mapSummaries(detail?.similar?.results, forcedType),
    recommendations: mapSummaries(detail?.recommendations?.results, forcedType),
    status: undefined,
  };
}

/* =========================================================
   API
========================================================= */

const baseURL = `${import.meta.env.VITE_API_URL}/api/tmdb`;

export async function fetchFromProxy(endpoint: string) {
  try {
    const { data } = await axios.get(`${baseURL}${endpoint}`);
    return data;
  } catch {
    return null;
  }
}

async function fetchAllPages(endpoint: string, max = MAX_PAGES) {
  const out: any[] = [];
  for (let p = 1; p <= max; p++) {
    const d = await fetchFromProxy(`${endpoint}&page=${p}`);
    if (!d?.results?.length) break;
    out.push(...d.results);
  }
  return out;
}

export async function fetchDetails(
  id: number,
  type: "movie" | "tv" | "person",
) {
  const append =
    type === "person"
      ? "combined_credits"
      : type === "movie"
        ? "credits,similar,recommendations,release_dates"
        : "credits,similar,recommendations,content_ratings";

  const d = await fetchFromProxy(
    `/${type}/${id}?language=en-GB&append_to_response=${append}`,
  );

  return d ? toMovie(d, type) : null;
}

/* =========================================================
   LIST LOADER
========================================================= */

async function loadDetailedList(
  endpoint: string,
  type: "movie" | "tv",
  baseFilter: (item: any) => boolean,
): Promise<Movie[]> {
  const base = await fetchAllPages(endpoint);
  if (!base.length)
    return [
      {
        id: -1,
        media_type: type,
        title: type === "movie" ? "No movies found" : "No shows found",
      } as Movie,
    ];

  const detailed = await Promise.all(
    base.filter(baseFilter).map((i) => fetchDetails(i.id, type)),
  );

  return (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres ?? []),
  );
}

/* =========================================================
   MOVIES
========================================================= */

export async function fetchMovies(): Promise<Movie[]> {
  const list = await loadDetailedList(
    `/discover/movie?language=en&include_adult=false&vote_average.gte=${MIN_RATING}`,
    "movie",
    (m) =>
      m?.original_language === "en" &&
      (m?.vote_average ?? 0) >= MIN_RATING &&
      isWithinMonths(m?.release_date, 3),
  );

  if (list[0]?.id === -1) return list;

  list.forEach((m) => {
    m.status = isWithinMonths(m.release_date, 1) ? "new" : undefined;
  });

  return [
    ...list.filter((m) => m.status === "new").sort(sortByRating),
    ...list.filter((m) => !m.status).sort(sortByRating),
  ];
}

/* =========================================================
   TV
========================================================= */

export async function fetchShows(): Promise<Movie[]> {
  const list = await loadDetailedList(
    `/discover/tv?language=en&include_adult=false&vote_average.gte=${MIN_RATING}`,
    "tv",
    (s) => s?.original_language === "en",
  );

  if (list[0]?.id === -1) return list;

  const visible: Movie[] = [];

  for (const show of list) {
    const { status, visible: isVisible } = getTvStatus(show);
    show.status = status;
    if (isVisible) visible.push(show);
  }

  return [
    ...visible.filter((s) => s.status === "new").sort(sortByRating),
    ...visible.filter((s) => s.status === "renewed").sort(sortByRating),
    ...visible.filter((s) => !s.status).sort(sortByRating),
  ];
}

/* =========================================================
   TRENDING
========================================================= */

const isTrendingValid = (item: any) =>
  item?.id &&
  (item.media_type === "movie" || item.media_type === "tv") &&
  (item.vote_average ?? 0) >= MIN_RATING &&
  (item.vote_count ?? 0) >= 150 &&
  item.original_language !== "ja";

export async function fetchTrendingClean(): Promise<Movie[]> {
  const data = await fetchFromProxy("/trending/all/day");
  if (!data?.results?.length) return [];

  return data.results
    .filter(isTrendingValid)
    .sort(
      (a: any, b: any) =>
        (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
        (b.vote_count ?? 0) - (a.vote_count ?? 0),
    )
    .slice(0, 10)
    .map((item: any) => toMovieSummary(item));
}
