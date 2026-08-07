export type AudioFeatureSummary = {
  energy: number;
  valence: number;
  acousticness: number;
  danceability: number;
  instrumentalness: number;
  tempo: number;
};

export type Album = {
  id?: string;
  title: string;
  artist: string;
  year: string;
  tags: string[];
  x: number;
  y: number;
  size: number;
  art: string;
  text: string;
  track: string;
  image?: string;
  spotifyUrl?: string;
  similarity?: number;
  audioSimilarity?: number;
  genreSimilarity?: number | null;
  genres?: string[];
  features?: AudioFeatureSummary;
};

export type DiscoveryResponse = {
  seedId?: string;
  tracks?: Album[];
  warning?: string;
  error?: string;
};
