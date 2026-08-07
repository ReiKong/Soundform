import type { Album } from "@/types/music";
import { calculateSimilarity } from "./similarity";
import type { AudioFeatures, SpotifyTrack } from "./types";

function artistNames(track: SpotifyTrack) {
  return track.artists.map((artist) => artist.name).join(", ");
}

function coverImage(track: SpotifyTrack) {
  return track.album.images.reduce<{ url: string; width: number } | undefined>(
    (largest, image) => !largest || image.width > largest.width ? image : largest,
    undefined,
  )?.url;
}

function baseAlbum(track: SpotifyTrack) {
  return {
    id: track.id,
    title: track.album.name,
    artist: artistNames(track),
    year: track.album.release_date.slice(0, 4),
    art: "#222",
    text: track.album.name,
    track: track.name,
    image: coverImage(track),
    spotifyUrl: track.external_urls.spotify,
  };
}

export function genresForTrack(track: SpotifyTrack, genresByArtist: Map<string, string[]>) {
  return [...new Set(track.artists.flatMap((artist) => genresByArtist.get(artist.id) ?? []))];
}

export function mapMetadataOnly(tracks: SpotifyTrack[]): Album[] {
  return tracks.map((track, index) => ({
    ...baseAlbum(track),
    tags: ["Spotify metadata"],
    x: 12 + ((index * 31) % 78),
    y: 15 + ((index * 47) % 70),
    size: index === 0 ? 154 : 104,
  }));
}

export function mapAnalyzedTracks(
  tracks: SpotifyTrack[],
  featuresById: Map<string, AudioFeatures>,
  seedFeatures: AudioFeatures,
  genresByArtist: Map<string, string[]>,
) {
  const seedGenres = genresForTrack(tracks[0], genresByArtist);

  return tracks.flatMap((track, index) => {
    const features = featuresById.get(track.id);
    if (!features) return [];

    const genres = genresForTrack(track, genresByArtist);
    const match = calculateSimilarity(seedFeatures, features, seedGenres, genres);
    return [{
      ...baseAlbum(track),
      tags: genres.length
        ? genres.slice(0, 3)
        : [`energy ${Math.round(features.energy * 100)}`, `valence ${Math.round(features.valence * 100)}`],
      x: 8 + features.energy * 84,
      y: 8 + (1 - features.valence) * 52 + features.acousticness * 25,
      size: index === 0 ? 154 : 88 + Math.round(match.total * 34),
      similarity: match.total,
      audioSimilarity: match.audio,
      genreSimilarity: match.genre,
      genres,
      features: {
        energy: features.energy,
        valence: features.valence,
        acousticness: features.acousticness,
        danceability: features.danceability,
        instrumentalness: features.instrumentalness,
        tempo: features.tempo,
      },
    } satisfies Album];
  }).sort((left, right) => (right.similarity ?? 0) - (left.similarity ?? 0));
}
