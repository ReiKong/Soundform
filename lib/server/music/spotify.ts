import type { SpotifyArtist, SpotifyTrack } from "./types";

const API_BASE = "https://api.spotify.com/v1";
const MARKET = "CA";
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 8_000;
const TRACK_LOOKUP_CONCURRENCY = 3;

let cachedToken = "";
let tokenExpiresAt = 0;
const artistGenreCache = new Map<string, { genres: string[]; expiresAt: number }>();
const ARTIST_GENRE_TTL = 7 * 24 * 60 * 60 * 1000;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to connect your Spotify developer app.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) throw new Error("Spotify rejected the app credentials.");
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function spotifyFetch(path: string) {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const token = await getAccessToken();
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status !== 429 || attempt === MAX_RATE_LIMIT_RETRIES) return response;

    const retryAfterSeconds = Number(response.headers.get("retry-after") ?? 1);
    const delay = Math.min(MAX_RETRY_DELAY_MS, Math.max(1_000, retryAfterSeconds * 1_000));
    await wait(delay);
  }

  throw new Error("Spotify request failed after retrying.");
}

export async function findSeedTracks(query?: string, seedId?: string) {
  if (seedId) {
    const response = await spotifyFetch(`/tracks/${seedId}?market=${MARKET}`);
    if (!response.ok) throw new Error(`Spotify track lookup returned ${response.status}.`);
    return [(await response.json()) as SpotifyTrack];
  }

  const response = await spotifyFetch(
    `/search?type=track&limit=10&market=${MARKET}&q=${encodeURIComponent(query ?? "")}`,
  );
  if (!response.ok) throw new Error(`Spotify search returned ${response.status}.`);
  const data = (await response.json()) as { tracks: { items: SpotifyTrack[] } };
  return data.tracks.items;
}

export async function getTracks(ids: string[]) {
  if (!ids.length) return [];
  const tracks: SpotifyTrack[] = [];

  for (let index = 0; index < ids.length; index += TRACK_LOOKUP_CONCURRENCY) {
    const batch = ids.slice(index, index + TRACK_LOOKUP_CONCURRENCY);
    const results = await Promise.all(batch.map(async (id) => {
      const response = await spotifyFetch(`/tracks/${id}?market=${MARKET}`);
      return response.ok ? (await response.json()) as SpotifyTrack : null;
    }));
    tracks.push(...results.filter((track): track is SpotifyTrack => Boolean(track)));
  }

  return tracks;
}

export async function getArtistGenres(tracks: SpotifyTrack[]) {
  const artistIds = [...new Set(tracks.flatMap((track) => track.artists.map((artist) => artist.id)))];
  const genres = new Map<string, string[]>();
  if (!artistIds.length) return genres;

  const now = Date.now();
  const missingIds: string[] = [];
  for (const artistId of artistIds) {
    const cached = artistGenreCache.get(artistId);
    if (cached && cached.expiresAt > now) genres.set(artistId, cached.genres);
    else missingIds.push(artistId);
  }
  if (!missingIds.length) return genres;

  const response = await spotifyFetch(`/artists?ids=${missingIds.slice(0, 50).join(",")}`);
  if (!response.ok) return genres;

  const data = (await response.json()) as { artists: SpotifyArtist[] };
  for (const artist of data.artists) {
    const artistGenres = artist.genres ?? [];
    genres.set(artist.id, artistGenres);
    artistGenreCache.set(artist.id, { genres: artistGenres, expiresAt: now + ARTIST_GENRE_TTL });
  }
  return genres;
}
