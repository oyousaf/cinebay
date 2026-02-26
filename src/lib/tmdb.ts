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

/* =========================================================
   HELPERS (PURE)
========================================================= */

/** Raw genres for UI chips. */
const extractGenresRaw = (detail: any): Genre[] =>
  Array.isArray(detail?.genres)
    ? detail.genres
        .map((g: any) => ({ id: Number(g?.id), name: String(g?.name ?? "") }))
        .filter((g: Genre) => Number.isFinite(g.id) && g.name.length > 0)
    : [];

const isAllowedContent = (genres: string[]) =>
  !genres.some((g) => EXCLUDED_GENRES.has(g));

const isNewMovie = (date?: string) =>
  Boolean(date && new Date(date) >= oneMonthAgo());

const isWithin3Months = (date?: string) =>
  Boolean(date && new Date(date) >= threeMonthsAgo());

const sortByRating = (a: Movie, b: Movie) =>
  (b.vote_average ?? 0) - (a.vote_average ?? 0);

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

/* =========================================================
   PERSON: KNOWN FOR
========================================================= */

const buildKnownForFromCredits = (detail: any): Movie[] => {
  const dept = detail?.known_for_department;

  const cast = detail?.combined_credits?.cast ?? [];
  const crew = detail?.combined_credits?.crew ?? [];

  let relevant: any[] = [];

  switch (dept) {
    case "Acting":
      // Actors: use cast only
      relevant = cast;
      break;

    case "Directing":
      relevant = crew.filter((c: any) => c.job === "Director");
      break;

    case "Writing":
      relevant = crew.filter((c: any) =>
        ["Writer", "Screenplay", "Creator"].includes(c.job),
      );
      break;

    case "Production":
      relevant = crew.filter((c: any) =>
        ["Producer", "Executive Producer"].includes(c.job),
      );
      break;

    default:
      // Fallback: combine but still filter quality
      relevant = [...cast, ...crew];
  }

  return relevant
    .filter(
      (c: any) =>
        c?.poster_path &&
        c?.vote_average >= MIN_RATING &&
        c?.original_language === "en",
    )
    .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 10)
    .map((c: any) =>
      toMovieSummary({ ...c, media_type: c?.media_type }, undefined),
    );
};

/* =========================================================
   TRANSFORMER (DETAILS -> Movie)  SINGLE AUTHORITY
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
   DETAILS (AUTHORITATIVE)
========================================================= */

export async function fetchDetails(
  id: number,
  type: "movie" | "tv" | "person",
) {
  let endpoint = "";

  if (type === "person") {
    // Full person details
    endpoint = `/person/${id}?language=en-GB&append_to_response=combined_credits,images`;
  } else {
    endpoint = `/${type}/${id}?language=en-GB&append_to_response=credits,similar,recommendations`;
  }

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
   MOVIES — NEW → RECENT
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
   TV — NEW → RENEWED → RECENT
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

  /* ---------- STATUS CLASSIFICATION ---------- */
  filtered.forEach((s) => {
    const firstAir = s.release_date ? new Date(s.release_date) : null;

    const lastSeasonAir = s.seasons?.at(-1)?.air_date
      ? new Date(s.seasons.at(-1)!.air_date!)
      : null;

    const lastAir =
      lastSeasonAir || (s.last_air_date ? new Date(s.last_air_date) : null);

    // Priority: NEW > RENEWED
    if (firstAir && firstAir >= oneMonthAgo()) {
      s.status = "new";
    } else if (lastAir && lastAir >= oneMonthAgo()) {
      s.status = "renewed";
    }
  });

  /* ---------- WITHIN 3 MONTHS ---------- */
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

  /* ---------- ORDER ---------- */
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

export async function fetchTrendingClean(): Promise<Movie[]> {
  const data = await fetchFromProxy("/trending/all/day");

  if (!data?.results?.length) return [];

  return (data.results as any[])
    .filter((item) => {
      if (!item?.id) return false;

      if (item.media_type !== "movie" && item.media_type !== "tv") return false;

      if ((item.vote_average ?? 0) < MIN_RATING) return false;
      if ((item.vote_count ?? 0) < 150) return false;
      if (item.original_language === "ja") return false;

      return true;
    })
    .sort(
      (a, b) =>
        (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
        (b.vote_count ?? 0) - (a.vote_count ?? 0),
    )
    .slice(0, 10)
    .map((item) => toMovieSummary(item));
}
