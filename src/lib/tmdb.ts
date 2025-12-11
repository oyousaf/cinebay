import axios from "axios";
import type { Movie } from "@/types/movie";
import { DEVS_PICK_LIST } from "./constants/devsPick";

export const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

// ================================
// CONFIG
// ================================
const MIN_RATING = 6.5;

const THREE_MONTHS_AGO = new Date();
THREE_MONTHS_AGO.setMonth(THREE_MONTHS_AGO.getMonth() - 3);

const ONE_MONTH_AGO = new Date();
ONE_MONTH_AGO.setMonth(ONE_MONTH_AGO.getMonth() - 1);

// Excluded genres
const EXCLUDED_GENRE_IDS = new Set([
  16, 10751, 10762, 10402, 10749, 10763, 10764, 10766, 10767, 37,
]);

const GENRE_MAP: Record<string, number> = {
  Animation: 16,
  Family: 10751,
  Kids: 10762,
  Music: 10402,
  Romance: 10749,
  News: 10763,
  Reality: 10764,
  Soap: 10766,
  Talk: 10767,
  Western: 37,
};

const genreToId = (name: string) => GENRE_MAP[name] ?? -1;

// ================================
// HELPERS
// ================================
const extractGenres = (d: any) =>
  Array.isArray(d.genres) ? d.genres.map((g: any) => g.name) : [];

const isAllowedContent = (genres: string[]) =>
  !genres.some((g) => EXCLUDED_GENRE_IDS.has(genreToId(g)));

const isNewMovie = (date: string) => date && new Date(date) >= ONE_MONTH_AGO;
const isWithin3Months = (date: string) =>
  date && new Date(date) >= THREE_MONTHS_AGO;

const isNewSeriesByDetail = (detail: any) =>
  detail.first_air_date && new Date(detail.first_air_date) >= ONE_MONTH_AGO;

// ================================
// TRANSFORMER
// ================================
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
    media_type: type,
    genres: extractGenres(detail),
    runtime: detail.runtime ?? null,
    original_language: detail.original_language ?? "",
    credits: detail.credits,
    biography: detail.biography,
    place_of_birth: detail.place_of_birth,
    known_for_department: detail.known_for_department,
    known_for: detail.known_for,
    deathday: detail.deathday,
    seasons: detail.seasons ?? [],

    status: undefined,

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

// ================================
// BASE FETCHER
// ================================
const baseURL = `${import.meta.env.VITE_API_URL}/api/tmdb`;

export async function fetchFromProxy(endpoint: string) {
  try {
    const { data } = await axios.get(`${baseURL}${endpoint}`);
    return data;
  } catch {
    return null;
  }
}

// ================================
// MULTI-PAGE WRAPPER
// ================================
async function fetchAllPages(endpoint: string, max = 3) {
  const out: any[] = [];
  for (let p = 1; p <= max; p++) {
    const d = await fetchFromProxy(`${endpoint}&page=${p}`);
    if (!d?.results?.length) break;
    out.push(...d.results);
  }
  return out;
}

// ================================
// DETAILS
// ================================
export async function fetchDetails(
  id: number,
  type: "movie" | "tv" | "person"
) {
  const d = await fetchFromProxy(
    `/${type}/${id}?language=en-GB&append_to_response=credits,recommendations,similar`
  );
  return d ? toMovie(d, type) : null;
}

// ================================
// PLACEHOLDER
// ================================
const empty = (t: "movie" | "tv"): Movie => ({
  id: -1,
  title: t === "movie" ? "No movies found" : "No shows found",
  overview: "",
  poster_path: "",
  backdrop_path: "",
  profile_path: "",
  release_date: "",
  vote_average: 0,
  media_type: t,
  genres: [],
  runtime: null,
  original_language: "",
  known_for: [],
  status: undefined,
});

// ================================
// SORT
// ================================
const sortByRating = (a: Movie, b: Movie) =>
  (b.vote_average ?? 0) - (a.vote_average ?? 0);

// ================================
// MOVIES — NEW THEN RECENT
// ================================
export async function fetchMovies(): Promise<Movie[]> {
  const base = await fetchAllPages(
    `/discover/movie?language=en&include_adult=false&vote_average.gte=${MIN_RATING}`,
    3
  );

  if (!base.length) return [empty("movie")];

  // Filter English + min rating + released within 3 months
  const filtered = base.filter(
    (m: any) =>
      m.original_language === "en" &&
      m.vote_average >= MIN_RATING &&
      isWithin3Months(m.release_date)
  );

  // Load details
  const detailed = await Promise.all(
    filtered.map((m: any) => fetchDetails(m.id, "movie"))
  );

  const final = (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres)
  );

  // Assign NEW only
  final.forEach((m) => {
    m.status = isNewMovie(m.release_date) ? "new" : undefined;
  });

  const NEW = final.filter((m) => m.status === "new").sort(sortByRating);
  const OTHER = final.filter((m) => !m.status).sort(sortByRating);

  return [...NEW, ...OTHER];
}

// ================================
// TV — NEW → RENEWED → RECENT
// ================================
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

  const final = (detailed.filter(Boolean) as Movie[]).filter((s) =>
    isAllowedContent(s.genres)
  );

  final.forEach((s) => {
    const seasons = s.seasons ?? [];
    const airRaw =
      seasons.length && seasons[seasons.length - 1]?.air_date
        ? seasons[seasons.length - 1].air_date
        : null;

    const lastAir = airRaw ? new Date(airRaw) : new Date("1900-01-01");

    if (isNewSeriesByDetail(s)) {
      s.status = "new";
    } else if (lastAir >= ONE_MONTH_AGO) {
      s.status = "renewed";
    } else if (lastAir < THREE_MONTHS_AGO) {
      s.status = undefined;
    } else {
      s.status = undefined;
    }
  });

  // Only keep shows within 3 months (new OR renewed OR recent-season)
  const within3 = final.filter((s) => {
    const seasons = s.seasons ?? [];
    const airRaw =
      seasons.length && seasons[seasons.length - 1]?.air_date
        ? seasons[seasons.length - 1].air_date
        : null;

    const lastAir = airRaw ? new Date(airRaw) : null;
    return lastAir && lastAir >= THREE_MONTHS_AGO;
  });

  const NEW = within3.filter((m) => m.status === "new").sort(sortByRating);
  const RENEWED = within3
    .filter((m) => m.status === "renewed")
    .sort(sortByRating);
  const OTHER = within3.filter((m) => !m.status).sort(sortByRating);

  return [...NEW, ...RENEWED, ...OTHER];
}

// ================================
// DEV'S PICK
// ================================
export async function fetchDevsPick(): Promise<Movie[]> {
  const out = await Promise.all(
    DEVS_PICK_LIST.map((id) => fetchDetails(id, "movie"))
  );
  return (out.filter(Boolean) as Movie[]).sort(sortByRating);
}
