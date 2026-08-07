import type { ReccoTrack, SpotifyTrack } from "./types";

type SpotifyOEmbed = {
  thumbnail_url?: string;
};

function spotifyId(url: string) {
  return url.split("/").pop()?.split("?")[0] ?? "";
}

async function artworkFor(trackUrl: string) {
  const endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`;
  const response = await fetch(endpoint);
  if (!response.ok) return undefined;
  return ((await response.json()) as SpotifyOEmbed).thumbnail_url;
}

export async function enrichRecommendations(tracks: ReccoTrack[]): Promise<SpotifyTrack[]> {
  return Promise.all(tracks.map(async (track) => {
    const image = await artworkFor(track.href);
    return {
      id: spotifyId(track.href),
      name: track.trackTitle,
      artists: track.artists.map((artist) => ({
        id: spotifyId(artist.href),
        name: artist.name,
      })),
      album: {
        name: track.trackTitle,
        release_date: "",
        images: image ? [{ url: image, width: 300 }] : [],
      },
      external_urls: { spotify: track.href },
    };
  }));
}
