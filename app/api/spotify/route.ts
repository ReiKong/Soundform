import { getAudioFeatures, getRecommendationIds } from "@/lib/server/music/reccobeats";
import { findSeedTracks, getArtistGenres, getTracks } from "@/lib/server/music/spotify";
import { mapAnalyzedTracks, mapMetadataOnly } from "@/lib/server/music/track-mapper";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  const seedId = params.get("seedId")?.trim();

  if (!query && !seedId) {
    return Response.json({ error: "Enter a track or artist." }, { status: 400 });
  }

  try {
    const searchResults = await findSeedTracks(query, seedId);
    const seedTrack = searchResults[0];
    if (!seedTrack) return Response.json({ error: "No tracks found." }, { status: 404 });

    const recommendationIds = await getRecommendationIds(seedTrack.id);
    const usedRecommendationFallback = recommendationIds === null;
    const tracks = recommendationIds
      ? [seedTrack, ...await getTracks(recommendationIds)]
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
