export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    release_date: string;
    images: { url: string; width: number }[];
  };
  external_urls: { spotify: string };
};

export type SpotifyArtist = { id: string; genres: string[] };

export type ReccoTrack = {
  id: string;
  trackTitle: string;
  artists: { id: string; name: string; href: string }[];
  isrc: string | null;
  href: string;
};

export type AudioFeatures = {
  id: string;
  href: string;
  energy: number;
  valence: number;
  acousticness: number;
  danceability: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  tempo: number;
  loudness: number;
};
