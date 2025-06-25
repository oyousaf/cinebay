export type Movie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
  genres: string[];
  runtime: number | null;
};
