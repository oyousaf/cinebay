const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const API_KEY = import.meta.env.VITE_TMDB_KEY;

export { TMDB_IMAGE };

export async function fetchNowPlaying() {
  const res = await fetch(`${TMDB_API}/movie/now_playing?api_key=${API_KEY}&language=en-GB&page=1`);
  const data = await res.json();
  return data.results || [];
}

export async function fetchDevPicksByTitles(titles: string[]) {
  const results = await Promise.all(
    titles.map(async (title) => {
      const res = await fetch(`${TMDB_API}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`);
      const data = await res.json();
      return data.results?.[0] || null;
    })
  );
  return results.filter(Boolean);
}

export async function fetchRecommended() {
  const res = await fetch(
    `${TMDB_API}/discover/movie?api_key=${API_KEY}&language=en-GB&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false`
  );
  const movies = await res.json();

  const tv = await fetch(
    `${TMDB_API}/discover/tv?api_key=${API_KEY}&language=en-GB&sort_by=popularity.desc&vote_average.gte=6.5&include_adult=false`
  );
  const tvShows = await tv.json();

  return [...(movies.results || []), ...(tvShows.results || [])].slice(0, 20);
}
