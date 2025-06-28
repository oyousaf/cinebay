import type { Movie } from "@/types/movie";
import axios from "axios";

export const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

// 🎯 Genres to exclude
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

const MIN_DATE = new Date();
MIN_DATE.setMonth(MIN_DATE.getMonth() - 3);
const MIN_DATE_STR = MIN_DATE.toISOString().split("T")[0];

const genreToId = (name: string): number => GENRE_MAP[name] ?? -1;

function extractGenres(detail: any): string[] {
  return Array.isArray(detail.genres)
    ? detail.genres.map((g: any) => g.name)
    : [];
}

function extractYear(dateStr: string): number | null {
  const match = dateStr?.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function isAllowedContent(genres: string[], releaseDateStr: string): boolean {
  const year = extractYear(releaseDateStr);
  const releaseDate = new Date(releaseDateStr);
  return (
    year !== null &&
    releaseDate >= MIN_DATE &&
    !genres.some((g) => EXCLUDED_GENRE_IDS.has(genreToId(g)))
  );
}

function isNewRelease(dateStr: string): boolean {
  const releaseDate = new Date(dateStr);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return releaseDate > oneMonthAgo;
}

function toMovie(detail: any, media_type: "movie" | "tv" | "person"): Movie {
  const releaseDateStr = detail.release_date || detail.first_air_date || "";
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
    known_for: undefined,
    isNew: isNewRelease(releaseDateStr),
  };
}

const baseURL = `${import.meta.env.VITE_API_URL}/api/tmdb`;

export async function fetchFromProxy(endpoint: string) {
  try {
    const { data } = await axios.get(`${baseURL}${endpoint}`);
    return data;
  } catch (err) {
    console.error("❌ Proxy fetch failed:", endpoint, err);
    return null;
  }
}

export async function fetchDetails(
  id: number,
  media_type: "movie" | "tv" | "person"
): Promise<Movie | null> {
  const data = await fetchFromProxy(
    `/${media_type}/${id}?language=en-GB&append_to_response=credits`
  );
  return data ? toMovie(data, media_type) : null;
}

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
    credits: undefined,
    known_for: undefined,
    isNew: false,
  };
}

export async function fetchMovies(): Promise<Movie[]> {
  const data = await fetchFromProxy(
    `/discover/movie?language=en&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false&release_date.gte=${MIN_DATE_STR}`
  );
  if (!data?.results) return [emptyPlaceholder("movie")];

  const detailed = await Promise.all(
    data.results.map((item: any) => fetchDetails(item.id, "movie"))
  );

  const filtered = (detailed.filter(Boolean) as Movie[]).filter((m) =>
    isAllowedContent(m.genres, m.release_date)
  );

  return filtered.length ? filtered : [emptyPlaceholder("movie")];
}

export async function fetchShows(): Promise<Movie[]> {
  const data = await fetchFromProxy(
    `/discover/tv?language=en&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false&first_air_date.gte=${MIN_DATE_STR}`
  );
  if (!data?.results) return [emptyPlaceholder("tv")];

  const detailed = await Promise.all(
    data.results.map((item: any) => fetchDetails(item.id, "tv"))
  );

  const filtered = (detailed.filter(Boolean) as Movie[]).filter((s) =>
    isAllowedContent(s.genres, s.release_date)
  );

  return filtered.length ? filtered : [emptyPlaceholder("tv")];
}

export async function fetchDevsPick(titles: string[]): Promise<Movie[]> {
  const enriched = await Promise.all(
    titles.map(async (title) => {
      const data = await fetchFromProxy(
        `/search/movie?query=${encodeURIComponent(title)}&language=en-GB`
      );

      const bestMatch = (data?.results || []).sort(
        (a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0)
      )[0];

      if (!bestMatch) {
        console.warn(`⚠️ Not found on TMDB: ${title}`);
        return null;
      }

      return await fetchDetails(bestMatch.id, "movie");
    })
  );

  return (enriched.filter(Boolean) as Movie[]).sort(
    (a, b) => b.vote_average - a.vote_average
  );
}
