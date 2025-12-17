// ========================
// Core Shared Types
// ========================
export type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
};

export type CrewMember = {
  id: number;
  name: string;
  job?: string;
  department?: string;
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

// ========================
// TV Specific
// ========================
export type Creator = {
  id: number;
  name: string;
  profile_path?: string;
};

export interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  air_date?: string;
  overview?: string;
  still_path?: string;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date?: string;
  poster_path?: string;
  episodes?: Episode[];
}

// ========================
// Person Specific
// ========================
export interface PersonDetails {
  biography?: string;
  known_for_department?: string;
  birthday?: string;
  deathday?: string;
  gender?: number;
  place_of_birth?: string;
  popularity?: number;
  known_for?: KnownForItem[];
}

// ========================
// Base Media (internal clarity)
// ========================
type BaseMedia = {
  id: number;
  overview: string;

  poster_path: string;
  backdrop_path: string;
  profile_path: string;

  release_date: string;
  vote_average: number;
  vote_count: number;

  genres: string[];
  runtime: number | null;
  original_language?: string;

  status?: "new" | "renewed" | "recent";

  recommendations?: Movie[];
  similar?: Movie[];

  credits?: {
    cast: CastMember[];
    crew: CrewMember[];
  };
};

// ========================
// Movie / TV / Person Union
// ========================
export type Movie = BaseMedia & {
  media_type: "movie" | "tv" | "person";

  // naming (TMDB inconsistency handled safely)
  title: string;
  name?: string;

  // TV only
  created_by?: Creator[];
  seasons?: Season[];
} & Partial<PersonDetails>;
