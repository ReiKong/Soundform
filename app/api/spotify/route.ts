import { enrichRecommendations } from "@/lib/server/music/oembed";
import { getAudioFeatures, getRecommendations, getTracksByIds } from "@/lib/server/music/reccobeats";
import { findSeedTracks, getArtistGenres } from "@/lib/server/music/spotify";
import { mapAnalyzedTracks, mapMetadataOnly } from "@/lib/server/music/track-mapper";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Netlify-CDN-Cache-Control": "public, durable, max-age=3600, stale-while-revalidate=86400",
  "Netlify-Vary": "query=q|seedId|preview",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  const seedId = params.get("seedId")?.trim();
  const previewOnly = params.get("preview") === "1";

  if (!query && !seedId) {
    return Response.json({ error: "Enter a track or artist." }, { status: 400 });
  }

  try {
    const searchResults = seedId
      ? await enrichRecommendations(await getTracksByIds([seedId]))
      : await findSeedTracks(query);
    const seedTrack = searchResults[0];
    if (!seedTrack) return Response.json({ error: "No tracks found." }, { status: 404 });

    if (previewOnly) {
      const preview = mapMetadataOnly([seedTrack])[0];
      return Response.json({
        seedId: seedTrack.id,
        tracks: [{ ...preview, x: 50, y: 50 }],
      }, { headers: RESPONSE_HEADERS });
    }

    const recommendations = await getRecommendations(seedTrack.id);
    const usedRecommendationFallback = recommendations === null;
    const tracks = recommendations
      ? [seedTrack, ...await enrichRecommendations(recommendations)]
      : searchResults;

    const [genresByArtist, features] = await Promise.all([
      getArtistGenres(tracks),
      getAudioFeatures(tracks.map((track) => track.id)),
    ]);
    const featuresById = new Map(
      features.map((feature) => [feature.href.split("/").pop() ?? feature.id, feature]),
    );
    const seedFeatures = featuresById.get(seedTrack.id) ?? features[0];

    if (!seedFeatures) {
      return Response.json({
        tracks: mapMetadataOnly(tracks),
        warning: "ReccoBeats has not analyzed this track yet, so these results use Spotify metadata only.",
      }, { headers: RESPONSE_HEADERS });
    }

    const mappedTracks = mapAnalyzedTracks(tracks, featuresById, seedFeatures, genresByArtist);
    return Response.json({
      seed: mappedTracks[0],
      tracks: mappedTracks,
      source: "ReccoBeats audio analysis",
      warning: usedRecommendationFallback
        ? "This seed is not in ReccoBeats’ recommendation index yet. The map compares its available audio features with related Spotify search results instead."
        : undefined,
    }, { headers: RESPONSE_HEADERS });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Spotify request failed." },
      { status: 500 },
    );
  }
}
