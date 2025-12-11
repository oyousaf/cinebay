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
ONE_MONTH_AGO.setDate(ONE_MONTH_AGO.getDate() - 30);

// Exclusions
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

const genreToId = (name: string): number => GENRE_MAP[name] ?? -1;

// ================================
// HELPERS
// ================================

function extractGenres(detail: any): string[] {
  return Array.isArray(detail.genres)
    ? detail.genres.map((g: any) => g.name)
    : [];
}

function extractYear(dateStr: string): number | null {
  const match = dateStr?.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function isAllowedContent(genres: string[]): boolean {
  return !genres.some((g) => EXCLUDED_GENRE_IDS.has(genreToId(g)));
}

function isNewRelease(dateStr: string): boolean {
  return new Date(dateStr) > ONE_MONTH_AGO;
}

// New TV series = FIRST AIR DATE within last 3 months
function isNewSeries(detail: any): boolean {
  const d = detail.first_air_date;
  if (!d) return false;
  return new Date(d) >= THREE_MONTHS_AGO;
}

// ================================
// TRANSFORMER
// ================================

function toMovie(detail: any, media_type: "movie" | "tv" | "person"): Movie {
  const releaseDateStr = detail.release_date || detail.first_air_date || "";

  const recommendationsRaw = detail.recommendations?.results || [];
  const recommendations: Movie[] = recommendationsRaw
    .filter((r: any) => {
      const yr = extractYear(r.release_date || r.first_air_date || "");
      return (
        r.original_language === "en" &&
        (yr ?? 0) >= 1950 &&
        r.poster_path &&
        r.vote_average >= MIN_RATING
      );
    })
    .slice(0, 10)
    .map((r: any) => ({
      id: r.id,
      title: r.title || r.name || "Untitled",
      overview: r.overview || "",
      poster_path: r.poster_path || "",
      backdrop_path: r.backdrop_path || "",
      profile_path: "",
      release_date: r.release_date || r.first_air_date || "",
      vote_average: r.vote_average ?? 0,
      media_type: r.media_type ?? media_type,
      genres: [],
      runtime: null,
      original_language: r.original_language ?? "",
      isNew:
        media_type === "tv"
          ? isNewSeries(detail)
          : isNewRelease(r.release_date || r.first_air_date || ""),
      recommendations: [],
    }));

  return {
    id: detail.id,
    title: detail.title || detail.name || "Untitled",
    overview: detail.overview || "",
    poster_path: detail.poster_path || "",
    backdrop_path: detail.backdrop_path || "",
    profile_path: detail.profile_path || "",
    release_date: releaseDateStr,
    vote_average: detail.vote_average ?? 0,
    media_type,
    genres: extractGenres(detail),
    runtime: detail.runtime ?? null,
    original_language: detail.original_language ?? "",
    credits: detail.credits ?? undefined,
    biography: detail.biography ?? undefined,
    place_of_birth: detail.place_of_birth ?? undefined,
    known_for_department: detail.known_for_department ?? undefined,
    known_for: detail.known_for ?? undefined,
    isNew:
      media_type === "tv" ? isNewSeries(detail) : isNewRelease(releaseDateStr),
    deathday: detail.deathday ?? undefined,
    seasons: detail.seasons ?? [],
    recommendations,
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
// MULTI-PAGE FETCH
// ================================

async function fetchAllPages(endpoint: string, maxPages = 5) {
  const results: any[] = [];
  for (let p = 1; p <= maxPages; p++) {
    const res = await fetchFromProxy(`${endpoint}&page=${p}`);
    if (!res?.results?.length) break;
    results.push(...res.results);
  }
  return results;
}

// ================================
// DETAILS FETCHER
// ================================

export async function fetchDetails(
  id: number,
  media_type: "movie" | "tv" | "person"
): Promise<Movie | null> {
  const base = await fetchFromProxy(
    `/${media_type}/${id}?language=en-GB&append_to_response=credits,recommendations,similar`
  );
  if (!base) return null;

  const mv = toMovie(base, media_type);

  if (media_type === "person") {
    const credits = await fetchFromProxy(`/person/${id}/combined_credits`);
    return {
      ...mv,
      known_for: credits?.cast?.slice(0, 12) ?? [],
      birthday: base.birthday ?? "",
      gender: base.gender ?? 0,
    };
  }

  const similar =
    base.similar?.results
      ?.filter((item: any) => {
        const year = extractYear(
          item.release_date || item.first_first_air_date || ""
        );
        return (
          item.vote_average >= MIN_RATING &&
          item.poster_path &&
          item.original_language === "en" &&
          (year ?? 0) >= 1950
        );
      })
      ?.slice(0, 10) ?? [];

  return { ...mv, similar };
}

// ================================
// PLACEHOLDER
// ================================

function emptyPlaceholder(type: "movie" | "tv"): Movie {
  return {
    id: -1,
    title: type === "movie" ? "No movies found" : "No shows found",
    overview: "",
    poster_path: "",
    backdrop_path: "",
    profile_path: "",
    release_date: "",
    vote_average: 0,
    media_type: type,
    genres: [],
    runtime: null,
    original_language: "",
    known_for: [],
    isNew: false,
  };
}

// ================================
// SORT
// ================================

function sortByRatingThenPopularity(a: Movie, b: Movie) {
  const diff = (b.vote_average ?? 0) - (a.vote_average ?? 0);
  if (diff !== 0) return diff;
  return (b.popularity ?? 0) - (a.popularity ?? 0);
}

// -------------------------------
// MOVIES
// -------------------------------

export async function fetchMovies(): Promise<Movie[]> {
  const data = await fetchFromProxy(
    `/discover/movie?language=en&sort_by=popularity.desc&vote_average.gte=${MIN_RATING}&include_adult=false&release_date.gte=${
      THREE_MONTHS_AGO.toISOString().split("T")[0]
    }`
  );

  if (!data?.results) return [emptyPlaceholder("movie")];

  const detailed = await Promise.all(
    data.results.map((i: any) => fetchDetails(i.id, "movie"))
  );

  const filtered = (detailed.filter(Boolean) as Movie[]).filter(
    (m) => m.original_language === "en" && isAllowedContent(m.genres)
  );

  filtered.sort(sortByRatingThenPopularity);

  return filtered.length ? filtered : [emptyPlaceholder("movie")];
}

// -------------------------------
// TV SHOWS — NEW + RECENT RETURNING ONLY
// -------------------------------

export async function fetchShows(): Promise<Movie[]> {
  const baseResults = await fetchAllPages(
    `/discover/tv?language=en&sort_by=popularity.desc&vote_average.gte=${MIN_RATING}&include_adult=false`,
    5
  );

  if (!baseResults.length) return [emptyPlaceholder("tv")];

  const detailed = await Promise.all(
    baseResults.map((i: any) => fetchDetails(i.id, "tv"))
  );

  // filter by allowed genres + valid seasons
  const prelim = (detailed.filter(Boolean) as Movie[]).filter((s) => {
    const isEnglish = s.original_language === "en";
    const genresOk = isAllowedContent(s.genres);
    const lastSeasonAir = new Date(
      s.seasons?.[s.seasons.length - 1]?.air_date || "1900-01-01"
    );
    const hasSeason = lastSeasonAir.getFullYear() > 1900;
    return isEnglish && genresOk && hasSeason;
  });

  // classify
  const newSeries: Movie[] = [];
  const recentReturning: Movie[] = [];

  prelim.forEach((s) => {
    const lastAir = new Date(
      s.seasons?.[s.seasons.length - 1]?.air_date || "1900-01-01"
    );
    const isRecentReturning = lastAir >= THREE_MONTHS_AGO;

    if (s.isNew) {
      newSeries.push(s);
    } else if (isRecentReturning) {
      recentReturning.push(s);
    }
  });

  newSeries.sort(sortByRatingThenPopularity);
  recentReturning.sort(sortByRatingThenPopularity);

  const finalList = [...newSeries, ...recentReturning];

  return finalList.length ? finalList : [emptyPlaceholder("tv")];
}

// -------------------------------
// DEVS PICK
// -------------------------------

export async function fetchDevsPick(): Promise<Movie[]> {
  const enriched = await Promise.all(
    DEVS_PICK_LIST.map(async (id) => {
      try {
        const full = await fetchDetails(id, "movie");
        return full?.original_language === "en" ? full : null;
      } catch {
        return null;
      }
    })
  );

  return (enriched.filter(Boolean) as Movie[]).sort(sortByRatingThenPopularity);
}
