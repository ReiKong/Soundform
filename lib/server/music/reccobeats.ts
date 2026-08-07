import type { AudioFeatures } from "./types";

const API_BASE = "https://api.reccobeats.com/v1";

export async function getRecommendationIds(seedId: string) {
  const response = await fetch(`${API_BASE}/track/recommendation?seeds=${seedId}&size=11`);
  if (!response.ok) return null;

  const data = (await response.json()) as { content: { href: string }[] };
  return data.content
    .map((track) => track.href.split("/").pop())
    .filter((id): id is string => Boolean(id));
}

export async function getAudioFeatures(trackIds: string[]) {
  const response = await fetch(`${API_BASE}/audio-features?ids=${trackIds.join(",")}`);
  if (!response.ok) throw new Error(`ReccoBeats audio features returned ${response.status}.`);

  const data = (await response.json()) as { content: AudioFeatures[] };
  return data.content;
}
