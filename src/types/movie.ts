// ========================
// Core Shared Types
// ========================
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

// ========================
// TV Specific
// ========================
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
// Main Movie/TV/Person Type
// ========================
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

  // Relational content
  recommendations?: Movie[];
  similar?: Movie[];

  // Credits (movies & tv)
  credits?: {
    cast?: CastMember[];
  };

  // TV Specific
  seasons?: Season[];

  // Person Specific
} & Partial<PersonDetails>;
