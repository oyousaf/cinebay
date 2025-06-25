import type { Movie } from "@/types/movie";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const API_KEY = import.meta.env.VITE_TMDB_KEY;

export { TMDB_IMAGE };

// 🧠 Convert TMDB genres array to string[]
function extractGenres(detail: any): string[] {
  return Array.isArray(detail.genres)
    ? detail.genres.map((g: any) => g.name)
    : [];
}

// 🔄 Map TMDB item to Movie type
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

// 🔍 Fetch full TMDB details for a single movie/show
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

// 🎬 Fetch popular movies, sorted by vote_average
export async function fetchMovies(): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_API}/discover/movie?api_key=${API_KEY}&language=en&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false`
  );
  const data = await res.json();
  const items = data.results || [];

  const detailed = await Promise.all(
    items.map((item: any) => fetchDetails(item.id, "movie"))
  );

  return (detailed.filter(Boolean) as Movie[]).sort(
    (a, b) => b.vote_average - a.vote_average
  );
}

// 📺 Fetch popular recent TV shows, sorted by vote_average
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

  return (detailed.filter(Boolean) as Movie[]).sort(
    (a, b) => b.vote_average - a.vote_average
  );
}

// 🏆 Fetch enriched metadata for curated list, sorted by vote_average
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
