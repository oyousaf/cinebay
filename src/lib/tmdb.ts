import axios from "axios";
import type { Movie } from "@/types/movie";
import { DEVS_PICK_LIST } from "./constants/devsPick";

export const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

/* =========================================================
   CONFIG
========================================================= */

const MIN_RATING = 6.5;

const THREE_MONTHS_AGO = new Date();
THREE_MONTHS_AGO.setMonth(THREE_MONTHS_AGO.getMonth() - 3);

const ONE_MONTH_AGO = new Date();
ONE_MONTH_AGO.setMonth(ONE_MONTH_AGO.getMonth() - 1);

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

/* =========================================================
   HELPERS
========================================================= */

const extractGenres = (detail: any): string[] =>
  Array.isArray(detail.genres)
    ? detail.genres.map((g: any) => g.name.toLowerCase())
    : [];

const isAllowedContent = (genres: string[]) =>
  !genres.some((g) => EXCLUDED_GENRES.has(g));

const isNewMovie = (date?: string) => !!date && new Date(date) >= ONE_MONTH_AGO;

const isWithin3Months = (date?: string) =>
  !!date && new Date(date) >= THREE_MONTHS_AGO;

const isNewSeriesByDetail = (detail: any) => {
  const seasons = detail.seasons ?? [];
  return (
    seasons.length === 1 &&
    seasons[0]?.air_date &&
    new Date(seasons[0].air_date) >= ONE_MONTH_AGO
  );
};

/* =========================================================
   TRANSFORMER (SINGLE AUTHORITY)
========================================================= */

function toMovie(detail: any, type: "movie" | "tv" | "person"): Movie {
  const release = detail.release_date || detail.first_air_date || "";

  return {
    id: detail.id,
    title: detail.title || detail.name || "Untitled",
    overview: detail.overview || "",
    poster_path: detail.poster_path || "",
    backdrop_path: detail.backdrop_path || "",
    profile_path: detail.profile_path || "",
    release_date: release,

    vote_average: detail.vote_average ?? 0,
    vote_count: detail.vote_count ?? 0,

    media_type: type,
    genres: extractGenres(detail),
    runtime: detail.runtime ?? null,
    original_language: detail.original_language ?? "",

    created_by: detail.created_by ?? [],

    credits: {
      cast: detail.credits?.cast ?? [],
      crew: detail.credits?.crew ?? [],
    },

    biography: detail.biography,
    birthday: detail.birthday,
    deathday: detail.deathday,
    place_of_birth: detail.place_of_birth,
    known_for_department: detail.known_for_department,
    known_for: detail.known_for,

    seasons: detail.seasons ?? [],
    status: undefined,

    similar:
      detail.similar?.results
        ?.filter(
          (r: any) =>
            r.poster_path &&
            r.vote_average >= MIN_RATING &&
            r.original_language === "en"
        )
        ?.slice(0, 10) ?? [],

    recommendations:
      detail.recommendations?.results
        ?.filter(
          (r: any) =>
            r.poster_path &&
            r.vote_average >= MIN_RATING &&
            r.original_language === "en"
        )
        ?.slice(0, 10) ?? [],
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
  type: "movie" | "tv" | "person"
) {
  const d = await fetchFromProxy(
    `/${type}/${id}?language=en-GB&append_to_response=credits,recommendations,similar`
  );
  return d ? toMovie(d, type) : null;
}

/* =========================================================
   PLACEHOLDER
========================================================= */

const empty = (t: "movie" | "tv"): Movie => ({
  id: -1,
  title: t === "movie" ? "No movies found" : "No shows found",
  overview: "",
  poster_path: "",
  backdrop_path: "",
  profile_path: "",
  release_date: "",
  vote_average: 0,
  vote_count: 0,
  media_type: t,
  genres: [],
  runtime: null,
  original_language: "",
  known_for: [],
  status: undefined,
});

/* =========================================================
   SORT
========================================================= */

const sortByRating = (a: Movie, b: Movie) =>
  (b.vote_average ?? 0) - (a.vote_average ?? 0);

/* =========================================================
   MOVIES — NEW → RECENT
========================================================= */

export async function fetchMovies(): Promise<Movie[]> {
  const base = await fetchAllPages(
    `/discover/movie?language=en&include_adult=false&vote_average.gte=${MIN_RATING}`,
    3
  );

  if (!base.length) return [empty("movie")];

  const detailed = await Promise.all(
    base
      .filter(
        (m: any) =>
          m.original_language === "en" &&
          m.vote_average >= MIN_RATING &&
          isWithin3Months(m.release_date)
      )
      .map((m: any) => fetchDetails(m.id, "movie"))
  );

  const final = (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres)
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
    3
  );

  if (!base.length) return [empty("tv")];

  const detailed = await Promise.all(
    base
      .filter((s: any) => s.original_language === "en")
      .map((s) => fetchDetails(s.id, "tv"))
  );

  const filtered = (detailed.filter(Boolean) as Movie[]).filter((s) =>
    isAllowedContent(s.genres)
  );

  filtered.forEach((s) => {
    const lastAirRaw = s.seasons?.at(-1)?.air_date;
    const lastAir = lastAirRaw ? new Date(lastAirRaw) : null;

    if (isNewSeriesByDetail(s)) s.status = "new";
    else if (lastAir && lastAir >= ONE_MONTH_AGO) s.status = "renewed";
  });

  const within3 = filtered.filter((s) => {
    const lastAirRaw = s.seasons?.at(-1)?.air_date;
    return lastAirRaw && new Date(lastAirRaw) >= THREE_MONTHS_AGO;
  });

  return [
    ...within3.filter((s) => s.status === "new").sort(sortByRating),
    ...within3.filter((s) => s.status === "renewed").sort(sortByRating),
    ...within3.filter((s) => !s.status).sort(sortByRating),
  ];
}

/* =========================================================
   DEV'S PICK
========================================================= */

export async function fetchDevsPick(): Promise<Movie[]> {
  const out = await Promise.all(
    DEVS_PICK_LIST.map((id) => fetchDetails(id, "movie"))
  );

  return (out.filter(Boolean) as Movie[]).sort(sortByRating);
}
