import type { Movie } from "@/types/movie";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const API_KEY = import.meta.env.VITE_TMDB_KEY;

export { TMDB_IMAGE };

// 🎯 Genre name to ID map (shared across movie & TV)
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

// 🛑 Genre names to exclude for both movies & TV
const EXCLUDED_GENRE_NAMES = [
  "Animation",
  "Family",
  "Kids",
  "Music",
  "Romance",
  "News",
  "Reality",
  "Soap",
  "Talk",
  "Western",
];

const EXCLUDED_GENRES = EXCLUDED_GENRE_NAMES.map((name) => GENRE_MAP[name]);

function genreToId(name: string): number {
  return GENRE_MAP[name] ?? -1;
}

function extractGenres(detail: any): string[] {
  return Array.isArray(detail.genres)
    ? detail.genres.map((g: any) => g.name)
    : [];
}

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

async function fetchDetails(
  id: number,
  media_type: "movie" | "tv"
): Promise<Movie | null> {
  try {
    const res = await fetch(
      `${TMDB_API}/${media_type}/${id}?api_key=${API_KEY}&language=en-GB`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return toMovie(data, media_type);
  } catch (err) {
    console.error("Failed to fetch details:", err);
    return null;
  }
}

function isAllowedContent(genres: string[]): boolean {
  return genres.every((g) => !EXCLUDED_GENRES.includes(genreToId(g)));
}

// 🎬 Fetch popular, non-excluded movies
export async function fetchMovies(): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_API}/discover/movie?api_key=${API_KEY}&language=en&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false`
  );
  const data = await res.json();
  const items = data.results || [];

  const detailed = await Promise.all(
    items.map((item: any) => fetchDetails(item.id, "movie"))
  );

  return (detailed.filter(Boolean) as Movie[])
    .filter((movie) => isAllowedContent(movie.genres))
    .sort((a, b) => b.vote_average - a.vote_average);
}

// 📺 Fetch popular, non-excluded TV shows
export async function fetchShows(): Promise<Movie[]> {
  const recentDate = new Date();
  recentDate.setFullYear(recentDate.getFullYear() - 3);
  const fromDate = recentDate.toISOString().split("T")[0];

  const res = await fetch(
    `${TMDB_API}/discover/tv?api_key=${API_KEY}&language=en&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false&first_air_date.gte=${fromDate}`
  );
  const data = await res.json();
  const items = data.results || [];

  const detailed = await Promise.all(
    items.map((item: any) => fetchDetails(item.id, "tv"))
  );

  return (detailed.filter(Boolean) as Movie[])
    .filter((show) => isAllowedContent(show.genres))
    .sort((a, b) => b.vote_average - a.vote_average);
}

// 🏆 Fetch enriched metadata for curated title list
export async function fetchDevsPick(titles: string[]): Promise<Movie[]> {
  const enriched = await Promise.all(
    titles.map(async (title) => {
      const searchUrl = `${TMDB_API}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
        title
      )}&language=en-GB`;

      try {
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
      } catch (err) {
        console.error(`Error fetching "${title}"`, err);
        return null;
      }
    })
  );

  return (enriched.filter(Boolean) as Movie[]).sort(
    (a, b) => b.vote_average - a.vote_average
  );
}
