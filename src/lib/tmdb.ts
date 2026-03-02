import axios from "axios";
import type { Movie, Genre } from "@/types/movie";
import { DEVS_PICK_LIST } from "./constants/devsPick";

export const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

/* =========================================================
   CONFIG
========================================================= */

const MIN_RATING = 6.5;
const MAX_PAGES = 5;

const baseURL = `${import.meta.env.VITE_API_URL}/api/tmdb`;

/* =========================================================
   DATE HELPERS
========================================================= */

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

const isWithinMonths = (date?: string | null, n = 1) =>
  Boolean(date && new Date(date) >= monthsAgo(n));

const getMovieStatus = (release?: string | null) =>
  isWithinMonths(release, 1) ? "new" : undefined;

const getModernMovieStartDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return `${d.getFullYear()}-01-01`;
};

const getModernTvStartDate = () => {
  const year = new Date().getFullYear() - 5;
  return `${year}-01-01`;
};

/* =========================================================
   SORTING / GROUPING
========================================================= */

const sortByRating = (a: Movie, b: Movie) =>
  (b.vote_average ?? 0) - (a.vote_average ?? 0);

const groupByStatus = (list: Movie[]) => [
  ...list.filter((i) => i.status === "new").sort(sortByRating),
  ...list.filter((i) => i.status === "renewed").sort(sortByRating),
  ...list.filter((i) => !i.status).sort(sortByRating),
];

/* =========================================================
   CONTENT QUALITY
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
  item?.poster_path &&
  item?.original_language === "en" &&
  (item?.vote_average ?? 0) >= MIN_RATING;

/* =========================================================
   TV STATUS
========================================================= */

const getTvStatus = (
  show: Movie,
): { status?: "new" | "renewed"; visible: boolean } => {
  const first1 = isWithinMonths(show.first_air_date, 1);
  const last1 = isWithinMonths(show.last_air_date, 1);

  const first3 = isWithinMonths(show.first_air_date, 3);
  const last3 = isWithinMonths(show.last_air_date, 3);

  const seasonCount =
    show.seasons?.filter((s) => s.season_number > 0).length ?? 0;

  let status: "new" | "renewed" | undefined;
  if (first1) status = "new";
  else if (last1 && seasonCount > 1) status = "renewed";

  return { status, visible: first3 || last3 };
};

/* =========================================================
   PERSON ROLES / KNOWN FOR / CREDIT COUNT
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

const EXCLUDED_TV_GENRE_IDS = new Set([10763, 10764, 10767]);

function getCreditCount(detail: any): number {
  const cast = Array.isArray(detail?.combined_credits?.cast)
    ? detail.combined_credits.cast
    : [];
  const crew = Array.isArray(detail?.combined_credits?.crew)
    ? detail.combined_credits.crew
    : [];

  const seen = new Set<number>();
  cast.forEach((c: any) => Number.isFinite(c?.id) && seen.add(c.id));
  crew.forEach((c: any) => Number.isFinite(c?.id) && seen.add(c.id));
  return seen.size;
}

/* =========================================================
   CERTIFICATION (GB → US fallback)
========================================================= */

function extractCertification(
  detail: any,
  type: "movie" | "tv",
): string | null {
  if (type === "movie") {
    const results = detail?.release_dates?.results ?? [];
    const gb = results.find((r: any) => r.iso_3166_1 === "GB");
    const us = results.find((r: any) => r.iso_3166_1 === "US");

    const getCert = (country: any) =>
      country?.release_dates?.find((d: any) => d?.certification)
        ?.certification || null;

    return getCert(gb) || getCert(us) || null;
  }

  if (type === "tv") {
    const results = detail?.content_ratings?.results ?? [];
    const gb = results.find((r: any) => r.iso_3166_1 === "GB")?.rating;
    const us = results.find((r: any) => r.iso_3166_1 === "US")?.rating;

    const any = results.find(
      (r: any) => typeof r?.rating === "string" && r.rating.trim().length > 0,
    )?.rating;

    return (gb || us || any) ?? null;
  }

  return null;
}

/* =========================================================
   TRANSFORMERS
========================================================= */

const extractGenresRaw = (detail: any): Genre[] =>
  Array.isArray(detail?.genres)
    ? detail.genres
        .map((g: any) => ({ id: Number(g?.id), name: String(g?.name ?? "") }))
        .filter((g: Genre) => Number.isFinite(g.id) && g.name)
    : [];

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

const buildKnownForFromCredits = (detail: any): Movie[] => {
  const dept = detail?.known_for_department;

  const cast = Array.isArray(detail?.combined_credits?.cast)
    ? detail.combined_credits.cast
    : [];

  const crew = Array.isArray(detail?.combined_credits?.crew)
    ? detail.combined_credits.crew
    : [];

  // Acting
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
      .map((c: any) => toMovieSummary({ ...c, media_type: c?.media_type }));
  }

  // Crew
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
    .map((c: any) => toMovieSummary({ ...c, media_type: c?.media_type }));
};

function toMovie(detail: any, type: "movie" | "tv" | "person"): Movie {
  const release = detail?.release_date || detail?.first_air_date || "";
  const genres_raw = extractGenresRaw(detail);
  const genres = genres_raw.map((g) => g.name);

  // Runtime: movie.runtime OR TV episode_run_time[0]
  const runtime =
    typeof detail?.runtime === "number"
      ? detail.runtime
      : Array.isArray(detail?.episode_run_time) &&
          typeof detail.episode_run_time[0] === "number"
        ? detail.episode_run_time[0]
        : null;

  // Certification (GB → US) (movies: release_dates, tv: content_ratings)
  const certification =
    type === "person" ? null : extractCertification(detail, type);

  const forcedType = type === "tv" ? "tv" : "movie";

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

    vote_average:
      typeof detail?.vote_average === "number" ? detail.vote_average : 0,
    vote_count: typeof detail?.vote_count === "number" ? detail.vote_count : 0,

    runtime,
    certification,
    genres,
    genres_raw,

    original_language: detail?.original_language ?? "",

    created_by: Array.isArray(detail?.created_by) ? detail.created_by : [],
    seasons: Array.isArray(detail?.seasons) ? detail.seasons : [],
    production_companies: Array.isArray(detail?.production_companies)
      ? detail.production_companies
      : [],
    networks:
      type === "tv" && Array.isArray(detail?.networks) ? detail.networks : [],

    credits: {
      cast: detail?.credits?.cast ?? [],
      crew: detail?.credits?.crew ?? [],
    },

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

    similar: mapSummaries(detail?.similar?.results, forcedType),
    recommendations: mapSummaries(detail?.recommendations?.results, forcedType),

    status: undefined,
  };
}

/* =========================================================
   API CORE
========================================================= */

export async function fetchFromProxy(endpoint: string) {
  try {
    const { data } = await axios.get(`${baseURL}${endpoint}`);
    return data;
  } catch {
    return null;
  }
}

async function fetchDiscoverBase(endpoint: string, max = MAX_PAGES) {
  const out: any[] = [];
  for (let p = 1; p <= max; p++) {
    const d = await fetchFromProxy(`${endpoint}&page=${p}`);
    if (!d?.results?.length) break;
    out.push(...d.results);
  }
  return out;
}

const dedupeById = <T extends { id: number }>(items: T[]) =>
  Array.from(new Map(items.map((x) => [x.id, x])).values());

/* =========================================================
   DETAILS
========================================================= */

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
   MOVIES 
========================================================= */

export async function fetchMovies(): Promise<Movie[]> {
  const from = getModernMovieStartDate();

  const popularBase = await fetchDiscoverBase(
    `/discover/movie?language=en&include_adult=false&sort_by=popularity.desc&vote_average.gte=${MIN_RATING}&primary_release_date.gte=${from}`,
  );

  const newBase = await fetchDiscoverBase(
    `/discover/movie?language=en&include_adult=false&sort_by=primary_release_date.desc&primary_release_date.gte=${from}`,
  );

  const baseUnique = dedupeById([...popularBase, ...newBase].filter(Boolean));

  const baseFiltered = baseUnique.filter(
    (m: any) =>
      m?.original_language === "en" &&
      m?.poster_path &&
      (m?.vote_average ?? 0) >= MIN_RATING - 0.5 &&
      isWithinMonths(m?.release_date, 3),
  );

  const detailed = await Promise.all(
    baseFiltered.map((i: any) => fetchDetails(i.id, "movie")),
  );

  const list = (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres ?? []),
  );

  const final = list
    .filter((m) => (m.vote_average ?? 0) >= MIN_RATING)
    .filter((m) => isWithinMonths(m.release_date, 3));

  for (const m of final) m.status = getMovieStatus(m.release_date);

  return [
    ...final.filter((m) => m.status === "new").sort(sortByRating),
    ...final.filter((m) => !m.status).sort(sortByRating),
  ];
}

/* =========================================================
   TV
========================================================= */

export async function fetchShows(): Promise<Movie[]> {
  const modernFrom = getModernTvStartDate();

  const curatedBase = await fetchDiscoverBase(
    `/discover/tv?language=en&include_adult=false&sort_by=popularity.desc&vote_count.gte=50&vote_average.gte=${MIN_RATING}&first_air_date.gte=${modernFrom}`,
  );

  const newBase = await fetchDiscoverBase(
    `/discover/tv?language=en&include_adult=false&sort_by=first_air_date.desc&first_air_date.gte=${modernFrom}`,
  );

  const baseUnique = dedupeById([...curatedBase, ...newBase].filter(Boolean));

  const baseFiltered = baseUnique.filter(
    (s: any) =>
      s?.original_language === "en" &&
      s?.poster_path &&
      (s?.vote_average ?? 0) >= MIN_RATING - 0.5 &&
      (s?.vote_count ?? 0) >= 5,
  );

  const detailed = await Promise.all(
    baseFiltered.map((i: any) => fetchDetails(i.id, "tv")),
  );

  const list = (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres ?? []),
  );

  const visible: Movie[] = [];
  for (const show of list) {
    if ((show.vote_average ?? 0) < MIN_RATING) continue;
    const { status, visible: isVisible } = getTvStatus(show);
    if (!isVisible) continue;
    show.status = status;
    visible.push(show);
  }

  return groupByStatus(dedupeById(visible));
}

/* =========================================================
   SEASONS
========================================================= */

export async function fetchSeasonEpisodes(tvId: number, season: number) {
  const d = await fetchFromProxy(`/tv/${tvId}/season/${season}?language=en-GB`);
  return d?.episodes ?? null;
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
