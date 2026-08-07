type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { name: string; release_date: string; images: { url: string; width: number }[] };
  external_urls: { spotify: string };
};

type SpotifyArtist = { id: string; genres: string[] };

type Features = {
  id: string; href: string; energy: number; valence: number; acousticness: number;
  danceability: number; instrumentalness: number; speechiness: number;
  liveness: number; tempo: number; loudness: number;
};

let cachedToken = "";
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to connect your Spotify developer app.");
  const auth = btoa(`${id}:${secret}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error("Spotify rejected the app credentials.");
  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

function vector(f: Features) {
  return [f.energy, f.valence, f.acousticness, f.danceability, f.instrumentalness, f.speechiness, f.liveness, f.tempo / 220, (f.loudness + 60) / 60];
}

function audioSimilarity(a: Features, b: Features) {
  const av = vector(a), bv = vector(b);
  const weights = [1.4, 1.2, 1.1, 1, .8, .45, .35, .65, .7];
  const distance = Math.sqrt(av.reduce((sum, value, i) => sum + weights[i] * (value - bv[i]) ** 2, 0) / weights.reduce((a, b) => a + b, 0));
  return Math.max(0, 1 - distance);
}

const genreFamilies: Record<string, string[]> = {
  rock: ["rock", "indie", "punk", "post-punk", "new wave", "shoegaze", "psychedelic", "garage"],
  electronic: ["electronic", "electronica", "techno", "house", "ambient", "idm", "trance", "dance"],
  pop: ["pop", "synthpop", "dream pop", "art pop", "indie pop"],
  hiphop: ["hip hop", "hip-hop", "rap", "trap"],
  jazz: ["jazz", "bebop", "fusion"],
  folk: ["folk", "singer-songwriter", "americana", "country"],
  soul: ["soul", "r&b", "funk", "motown"],
  classical: ["classical", "orchestral", "chamber", "minimalism"],
  metal: ["metal", "doom", "black metal", "death metal", "hardcore"],
};

function genreTerms(genres: string[]) {
  const terms = new Set(genres.map((genre) => genre.toLowerCase()));
  for (const genre of genres) {
    const normalized = genre.toLowerCase();
    for (const [family, aliases] of Object.entries(genreFamilies)) {
      if (aliases.some((alias) => normalized.includes(alias))) terms.add(`family:${family}`);
    }
  }
  return terms;
}

function genreSimilarity(a: string[], b: string[]) {
  if (!a.length || !b.length) return null;
  const av = genreTerms(a), bv = genreTerms(b);
  let intersection = 0;
  for (const term of av) if (bv.has(term)) intersection++;
  return intersection / new Set([...av, ...bv]).size;
}

function combinedSimilarity(seed: Features, candidate: Features, seedGenres: string[], candidateGenres: string[]) {
  const audio = audioSimilarity(seed, candidate);
  const genre = genreSimilarity(seedGenres, candidateGenres);
  return { audio, genre, total: genre === null ? audio : audio * .7 + genre * .3 };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  const seedId = params.get("seedId")?.trim();
  if (!q && !seedId) return Response.json({ error: "Enter a track or artist." }, { status: 400 });
  try {
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}` };
    let searchItems: SpotifyTrack[];
    if (seedId) {
      const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${seedId}?market=CA`, { headers });
      if (!trackResponse.ok) throw new Error(`Spotify track lookup returned ${trackResponse.status}.`);
      searchItems = [await trackResponse.json() as SpotifyTrack];
    } else {
      const search = await fetch(`https://api.spotify.com/v1/search?type=track&limit=10&market=CA&q=${encodeURIComponent(q!)}`, { headers });
      if (!search.ok) throw new Error(`Spotify search returned ${search.status}.`);
      const searchData = await search.json() as { tracks: { items: SpotifyTrack[] } };
      searchItems = searchData.tracks.items;
    }
    const seedTrack = searchItems[0];
    if (!seedTrack) return Response.json({ error: "No tracks found." }, { status: 404 });

    const recommendationResponse = await fetch(`https://api.reccobeats.com/v1/track/recommendation?seeds=${seedTrack.id}&size=11`);
    let usedRecommendationFallback = false;
    let tracks: SpotifyTrack[];
    if (recommendationResponse.ok) {
      const recommendationData = await recommendationResponse.json() as { content: { href: string }[] };
      const neighbourIds = recommendationData.content.map((track) => track.href.split("/").pop()).filter((id): id is string => Boolean(id));
      const spotifyNeighbours = await Promise.all(neighbourIds.map(async (id) => {
        const response = await fetch(`https://api.spotify.com/v1/tracks/${id}?market=CA`, { headers });
        return response.ok ? await response.json() as SpotifyTrack : null;
      }));
      tracks = [seedTrack, ...spotifyNeighbours.filter((track): track is SpotifyTrack => Boolean(track))];
    } else {
      usedRecommendationFallback = true;
      tracks = searchItems;
    }

    const artistIds = [...new Set(tracks.flatMap((track) => track.artists.map((artist) => artist.id)))];
    const artistGenres = new Map<string, string[]>();
    if (artistIds.length) {
      const artistResponse = await fetch(`https://api.spotify.com/v1/artists?ids=${artistIds.slice(0, 50).join(",")}`, { headers });
      if (artistResponse.ok) {
        const artistData = await artistResponse.json() as { artists: SpotifyArtist[] };
        for (const artist of artistData.artists) artistGenres.set(artist.id, artist.genres ?? []);
      }
    }
    const genresFor = (track: SpotifyTrack) => [...new Set(track.artists.flatMap((artist) => artistGenres.get(artist.id) ?? []))];

    const featureResponse = await fetch(`https://api.reccobeats.com/v1/audio-features?ids=${tracks.map((track) => track.id).join(",")}`);
    if (!featureResponse.ok) throw new Error(`ReccoBeats audio features returned ${featureResponse.status}.`);
    const featureData = await featureResponse.json() as { content: Features[] };
    const byId = new Map(featureData.content.map((feature) => [feature.href.split("/").pop()!, feature]));
    const seed = byId.get(seedTrack.id) ?? featureData.content[0];
    if (!seed) {
      const fallback = tracks.map((track, index) => ({
        id: track.id, title: track.album.name, artist: track.artists.map((a) => a.name).join(", "),
        year: track.album.release_date.slice(0, 4), tags: ["Spotify metadata"],
        x: 12 + ((index * 31) % 78), y: 15 + ((index * 47) % 70), size: index === 0 ? 154 : 104,
        art: "#222", text: track.album.name, track: track.name,
        image: track.album.images.sort((a,b) => b.width - a.width)[0]?.url,
        spotifyUrl: track.external_urls.spotify,
      }));
      return Response.json({ tracks: fallback, warning: "ReccoBeats has not analyzed this track yet, so these results use Spotify metadata only." });
    }

    const seedGenres = genresFor(seedTrack);
    const results = tracks.flatMap((track, index) => {
      const f = byId.get(track.id); if (!f) return [];
      const genres = genresFor(track);
      const match = combinedSimilarity(seed, f, seedGenres, genres);
      return [{
        id: track.id, title: track.album.name, artist: track.artists.map((a) => a.name).join(", "),
        year: track.album.release_date.slice(0, 4), tags: genres.length ? genres.slice(0, 3) : [`energy ${Math.round(f.energy * 100)}`, `valence ${Math.round(f.valence * 100)}`],
        x: 8 + f.energy * 84, y: 8 + (1 - f.valence) * 52 + f.acousticness * 25,
        size: index === 0 ? 154 : 88 + Math.round(match.total * 34), art: "#222", text: track.album.name,
        track: track.name, image: track.album.images.sort((a,b) => b.width - a.width)[0]?.url,
        spotifyUrl: track.external_urls.spotify, similarity: match.total,
        audioSimilarity: match.audio, genreSimilarity: match.genre, genres,
        features: { energy:f.energy, valence:f.valence, acousticness:f.acousticness, danceability:f.danceability, instrumentalness:f.instrumentalness, tempo:f.tempo },
      }];
    }).sort((a, b) => b.similarity - a.similarity);
    return Response.json({
      seed: results[0], tracks: results, source: "ReccoBeats audio analysis",
      warning: usedRecommendationFallback ? "This seed is not in ReccoBeats’ recommendation index yet. The map compares its available audio features with related Spotify search results instead." : undefined,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Spotify request failed." }, { status: 500 });
  }
}
