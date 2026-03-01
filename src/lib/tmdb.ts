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
   Director > Writer > Actor > Producer
========================================================= */

const ROLE_PRIORITY = {
  Director: 4,
  Writer: 3,
  Actor: 2,
  Actress: 2,
  Producer: 1,
} as const;

/* =========================================================
   PERSON ROLE HELPERS (Single Authority)
========================================================= */

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

function countCrewJobs(crew: any[], jobs: string[]) {
  return crew.reduce((n, c) => (jobs.includes(c?.job) ? n + 1 : n), 0);
}

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

  // Primary (TMDB authority)
  if (dept === "Acting") roles.push(actingLabel);
  else if (dept === "Directing") roles.push("Director");
  else if (dept === "Writing") roles.push("Writer");
  else if (dept === "Production") roles.push("Producer");

  // Secondary by priority
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
   TIME-RELATED HELPERS
========================================================= */

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

const isWithinMonths = (date?: string, n = 1) =>
  Boolean(date && new Date(date) >= monthsAgo(n));

const sortByRating = (a: Movie, b: Movie) =>
  (b.vote_average ?? 0) - (a.vote_average ?? 0);

/* =========================================================
   GENRE EXCLUSION (LOGIC ONLY)
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
  !genres.some((g) => EXCLUDED_GENRES.has(g.toLowerCase()));

/* =========================================================
   HELPERS (PURE)
========================================================= */

const isHighQuality = (item: any) =>
  Boolean(
    item?.poster_path &&
    item?.original_language === "en" &&
    (item?.vote_average ?? 0) >= MIN_RATING,
  );

/** Raw genres for UI chips. */
const extractGenresRaw = (detail: any): Genre[] =>
  Array.isArray(detail?.genres)
    ? detail.genres
        .map((g: any) => ({ id: Number(g?.id), name: String(g?.name ?? "") }))
        .filter((g: Genre) => Number.isFinite(g.id) && g.name.length > 0)
    : [];

/* =========================================================
   SUMMARY TRANSFORMER (TMDB list item -> Movie)
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
    vote_average:
      typeof item?.vote_average === "number" ? item.vote_average : 0,
    vote_count: typeof item?.vote_count === "number" ? item.vote_count : 0,

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
   PERSON: KNOWN FOR
========================================================= */

const EXCLUDED_TV_GENRE_IDS = new Set([10763, 10764, 10767]);

const buildKnownForFromCredits = (detail: any): Movie[] => {
  const dept = detail?.known_for_department;

  const cast = Array.isArray(detail?.combined_credits?.cast)
    ? detail.combined_credits.cast
    : [];

  const crew = Array.isArray(detail?.combined_credits?.crew)
    ? detail.combined_credits.crew
    : [];

  // -----------------------------
  // ACTORS
  // -----------------------------
  if (dept === "Acting") {
    const seen = new Set<number>();

    return cast
      .filter(isHighQuality)
      .filter((c: any) => {
        if (
          c?.media_type === "tv" &&
          Array.isArray(c?.genre_ids) &&
          c.genre_ids.some((id: number) => EXCLUDED_TV_GENRE_IDS.has(id))
        ) {
          return false;
        }
        return true;
      })
      .filter((c: any) => {
        if (!Number.isFinite(c?.id) || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 10)
      .map((c: any) =>
        toMovieSummary({ ...c, media_type: c?.media_type }, undefined),
      );
  }

  // -----------------------------
  // CREW
  // -----------------------------
  const JOB_FOCUS: Record<string, string[]> = {
    Directing: ["Director"],
    Writing: ["Writer", "Screenplay", "Story", "Creator"],
    Production: [
      "Producer",
      "Executive Producer",
      "Co-Executive Producer",
      "Creator",
    ],
  };

  const allowedJobs = JOB_FOCUS[dept] ?? [];
  const seen = new Set<number>();

  return crew
    .filter((c: any) =>
      allowedJobs.length ? allowedJobs.includes(c?.job) : true,
    )
    .filter(isHighQuality)
    .filter((c: any) => {
      if (
        c?.media_type === "tv" &&
        Array.isArray(c?.genre_ids) &&
        c.genre_ids.some((id: number) => EXCLUDED_TV_GENRE_IDS.has(id))
      ) {
        return false;
      }
      return true;
    })
    .filter((c: any) => {
      if (!Number.isFinite(c?.id) || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .sort((a: any, b: any) => {
      const jobScore = (job?: string) => {
        if (!job) return 0;
        if (job === "Director") return ROLE_PRIORITY.Director;
        if (["Writer", "Screenplay", "Story", "Creator"].includes(job))
          return ROLE_PRIORITY.Writer;
        if (
          ["Producer", "Executive Producer", "Co-Executive Producer"].includes(
            job,
          )
        )
          return ROLE_PRIORITY.Producer;
        return 0;
      };

      const scoreDiff = jobScore(b.job) - jobScore(a.job);
      if (scoreDiff !== 0) return scoreDiff;

      const ya = Number(
        (a?.release_date || a?.first_air_date || "").slice(0, 4),
      );
      const yb = Number(
        (b?.release_date || b?.first_air_date || "").slice(0, 4),
      );

      return yb - ya || (b?.popularity ?? 0) - (a?.popularity ?? 0);
    })
    .slice(0, 10)
    .map((c: any) =>
      toMovieSummary({ ...c, media_type: c?.media_type }, undefined),
    );
};

/* =========================================================
   PERSON: CREDIT COUNT
========================================================= */

function getCreditCount(detail: any): number {
  const cast = Array.isArray(detail?.combined_credits?.cast)
    ? detail.combined_credits.cast
    : [];

  const crew = Array.isArray(detail?.combined_credits?.crew)
    ? detail.combined_credits.crew
    : [];

  const seen = new Set<number>();

  cast.forEach((c: any) => {
    if (Number.isFinite(c?.id)) seen.add(c.id);
  });

  crew.forEach((c: any) => {
    if (Number.isFinite(c?.id)) seen.add(c.id);
  });

  return seen.size;
}

/* =========================================================
   TRANSFORMER (DETAILS -> Movie)  SINGLE AUTHORITY
========================================================= */

function toMovie(detail: any, type: "movie" | "tv" | "person"): Movie {
  const release = detail?.release_date || detail?.first_air_date || "";

  const genres_raw = extractGenresRaw(detail);
  const genres = genres_raw.map((g) => g.name);

  const forcedType = type === "tv" ? "tv" : "movie";

  const similar = mapSummaries(detail?.similar?.results ?? [], forcedType);
  const recommendations = mapSummaries(
    detail?.recommendations?.results ?? [],
    forcedType,
  );

  return {
    id: Number(detail?.id ?? -1),
    media_type: type,

    /* ---------- Naming ---------- */
    title: detail?.title || detail?.name || "Untitled",
    name: detail?.name,

    /* ---------- Core ---------- */
    overview: detail?.overview ?? "",
    poster_path: detail?.poster_path ?? "",
    backdrop_path: detail?.backdrop_path ?? "",
    profile_path: detail?.profile_path ?? "",

    /* ---------- Dates / Ratings ---------- */
    release_date: release,
    vote_average:
      typeof detail?.vote_average === "number" ? detail.vote_average : 0,
    vote_count: typeof detail?.vote_count === "number" ? detail.vote_count : 0,

    /* ---------- Genres ---------- */
    genres,
    genres_raw,

    /* ---------- Technical ---------- */
    runtime: typeof detail?.runtime === "number" ? detail.runtime : null,
    original_language: detail?.original_language ?? "",

    /* ---------- TV ---------- */
    created_by: Array.isArray(detail?.created_by) ? detail.created_by : [],
    seasons: Array.isArray(detail?.seasons) ? detail.seasons : [],

    /* ---------- Production / Distribution ---------- */
    production_companies: Array.isArray(detail?.production_companies)
      ? detail.production_companies
      : [],

    networks:
      type === "tv" && Array.isArray(detail?.networks) ? detail.networks : [],

    /* ---------- Credits ---------- */
    credits: {
      cast: detail?.credits?.cast ?? [],
      crew: detail?.credits?.crew ?? [],
    },

    /* ---------- Person fields ---------- */
    biography: detail?.biography,
    birthday: detail?.birthday,
    deathday: detail?.deathday,
    place_of_birth: detail?.place_of_birth,
    known_for_department: detail?.known_for_department,
    gender: detail?.gender,
    combined_credits: detail?.combined_credits,

    roles:
      type === "person" && detail?.combined_credits
        ? buildPersonRoles(detail)
        : [],

    credit_count:
      type === "person" && detail?.combined_credits
        ? getCreditCount(detail)
        : undefined,

    known_for:
      type === "person"
        ? buildKnownForFromCredits(detail)
        : Array.isArray(detail?.known_for)
          ? detail.known_for.map((x: any) => toMovieSummary(x))
          : [],

    /* ---------- Related ---------- */
    similar,
    recommendations,

    status: undefined,
  };
}

/* =========================================================
   BASE FETCHER
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

/* =========================================================
   MULTI-PAGE FETCH
========================================================= */

async function fetchAllPages(endpoint: string, max = MAX_PAGES) {
  const out: any[] = [];

  for (let p = 1; p <= max; p++) {
    const d = await fetchFromProxy(`${endpoint}&page=${p}`);
    if (!d?.results?.length) break;
    out.push(...d.results);
  }

  return out;
}

/* =========================================================
   DETAILS (AUTHORITATIVE)
========================================================= */

export async function fetchDetails(
  id: number,
  type: "movie" | "tv" | "person",
) {
  const append =
    type === "person" ? "combined_credits" : "credits,similar,recommendations";

  const d = await fetchFromProxy(
    `/${type}/${id}?language=en-GB&append_to_response=${append}`,
  );

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
   GENERIC: DISCOVER -> DETAILS -> FILTER
========================================================= */

async function loadDetailedList(
  endpoint: string,
  type: "movie" | "tv",
  baseFilter: (item: any) => boolean,
): Promise<Movie[]> {
  const base = await fetchAllPages(endpoint, MAX_PAGES);
  if (!base.length) return [empty(type)];

  const detailed = await Promise.all(
    base.filter(baseFilter).map((i) => fetchDetails(i.id, type)),
  );

  return (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres ?? []),
  );
}

/* =========================================================
   MOVIES — NEW → RECENT
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
   TV — NEW → RENEWED → RECENT
========================================================= */

const isNewSeriesByDetail = (detail: any) => {
  const seasons = detail?.seasons ?? [];
  return (
    seasons.length === 1 &&
    seasons[0]?.air_date &&
    isWithinMonths(seasons[0].air_date, 1)
  );
};

export async function fetchShows(): Promise<Movie[]> {
  const list = await loadDetailedList(
    `/discover/tv?language=en&include_adult=false&vote_average.gte=${MIN_RATING}`,
    "tv",
    (s) => s?.original_language === "en",
  );

  if (list[0]?.id === -1) return list;

  list.forEach((s) => {
    const lastAirRaw = s.seasons?.at(-1)?.air_date;
    const lastAirOk = Boolean(lastAirRaw && isWithinMonths(lastAirRaw, 1));

    if (isNewSeriesByDetail(s)) s.status = "new";
    else if (lastAirOk) s.status = "renewed";
    else s.status = undefined;
  });

  const within3 = list.filter((s) => {
    const lastAirRaw = s.seasons?.at(-1)?.air_date;
    return Boolean(lastAirRaw && isWithinMonths(lastAirRaw, 3));
  });

  return [
    ...within3.filter((s) => s.status === "new").sort(sortByRating),
    ...within3.filter((s) => s.status === "renewed").sort(sortByRating),
    ...within3.filter((s) => !s.status).sort(sortByRating),
  ];
}

/* =========================================================
   TV SEASON EPISODES
========================================================= */

export async function fetchSeasonEpisodes(
  tvId: number,
  season: number,
): Promise<any[] | null> {
  const d = await fetchFromProxy(`/tv/${tvId}/season/${season}?language=en-GB`);

  if (!d || !Array.isArray(d.episodes)) return null;
  return d.episodes;
}

/* =========================================================
   DEV'S PICK
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

const isTrendingValid = (item: any) =>
  Boolean(
    item?.id &&
    (item.media_type === "movie" || item.media_type === "tv") &&
    (item.vote_average ?? 0) >= MIN_RATING &&
    (item.vote_count ?? 0) >= 150 &&
    item.original_language !== "ja",
  );

export async function fetchTrendingClean(): Promise<Movie[]> {
  const data = await fetchFromProxy("/trending/all/day");
  if (!data?.results?.length) return [];

  return (data.results as any[])
    .filter(isTrendingValid)
    .sort(
      (a, b) =>
        (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
        (b.vote_count ?? 0) - (a.vote_count ?? 0),
    )
    .slice(0, 10)
    .map((item) => toMovieSummary(item));
}
