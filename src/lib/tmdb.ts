import type { Movie } from "@/types/movie";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const API_KEY = import.meta.env.VITE_TMDB_KEY;

export { TMDB_IMAGE };

// Utility: convert TMDB genres to string array
function extractGenres(detail: any): string[] {
  return Array.isArray(detail.genres)
    ? detail.genres.map((g: any) => g.name)
    : [];
}

// Utility: convert TMDB raw data to `Movie` format
function toMovie(detail: any, media_type: "movie" | "tv"): Movie {
  return {
    id: detail.id,
    title: detail.title || detail.name || "",
    overview: detail.overview,
    poster_path: detail.poster_path,
    release_date: detail.release_date || detail.first_air_date || "",
    vote_average: detail.vote_average,
    media_type,
    genres: extractGenres(detail),
    runtime: detail.runtime ?? null,
  };
}

// Generic fetch for full TMDB details (movie or tv)
async function fetchDetails(
  id: number,
  media_type: "movie" | "tv"
): Promise<Movie | null> {
  const res = await fetch(
    `${TMDB_API}/${media_type}/${id}?api_key=${API_KEY}&language=en-GB`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return toMovie(data, media_type);
}

// 🎬 Fetch latest popular movies (rating >= 6.5)
export async function fetchMovies(): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_API}/discover/movie?api_key=${API_KEY}&language=en-GB&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false`
  );
  const data = await res.json();
  const items = data.results || [];

  return (
    await Promise.all(items.map((item: any) => fetchDetails(item.id, "movie")))
  ).filter(Boolean) as Movie[];
}

// 📺 Fetch latest popular TV shows (rating >= 6.5)
export async function fetchShows(): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_API}/discover/tv?api_key=${API_KEY}&language=en-GB&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false`
  );
  const data = await res.json();
  const items = data.results || [];

  return (
    await Promise.all(items.map((item: any) => fetchDetails(item.id, "tv")))
  ).filter(Boolean) as Movie[];
}

// 🎯 Fetch enriched TMDB data for curated movie titles
export async function fetchDevsPick(titles: string[]): Promise<Movie[]> {
  return (
    await Promise.all(
      titles.map(async (title) => {
        const searchUrl = `${TMDB_API}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
          title
        )}&language=en-GB`;

        const res = await fetch(searchUrl);
        const data = await res.json();

        const bestMatch = (data.results || []).sort(
          (a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0)
        )[0];

        if (!bestMatch) {
          console.warn(`❌ Not found on TMDB: ${title}`);
          return null;
        }

        return await fetchDetails(bestMatch.id, "movie");
      })
    )
  ).filter(Boolean) as Movie[];
}
