export type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
};

export type KnownForItem = {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
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
  recommendations?: Movie[];

  // Movie/show only
  credits?: {
    cast?: CastMember[];
  };

  // Person only
  biography?: string;
  known_for_department?: string;
  birthday?: string;
  gender?: number;
  place_of_birth?: string;
  popularity?: number;
  known_for?: KnownForItem[];
  deathday?: string;
};
