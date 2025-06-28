export type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
};

export type Movie = {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  profile_path: string;
  release_date: string;
  vote_average: number;
  media_type: "movie" | "tv" | "person";
  genres: string[];
  runtime: number | null;
  original_language?: string;
  isNew?: boolean;

  credits?: {
    cast?: CastMember[];
  };

  // 👤 Only used if media_type === "person"
  known_for?: {
    id: number;
    title?: string;
    name?: string;
    media_type: "movie" | "tv";
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
  }[];
};
