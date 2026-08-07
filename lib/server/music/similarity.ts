import type { AudioFeatures } from "./types";

const AUDIO_WEIGHTS = [1.4, 1.2, 1.1, 1, 0.8, 0.45, 0.35, 0.65, 0.7];
const AUDIO_SCORE_WEIGHT = 0.45;
const GENRE_SCORE_WEIGHT = 0.55;

const GENRE_FAMILIES: Record<string, string[]> = {
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

function audioVector(features: AudioFeatures) {
  return [
    features.energy,
    features.valence,
    features.acousticness,
    features.danceability,
    features.instrumentalness,
    features.speechiness,
    features.liveness,
    features.tempo / 220,
    (features.loudness + 60) / 60,
  ];
}

function audioSimilarity(seed: AudioFeatures, candidate: AudioFeatures) {
  const seedVector = audioVector(seed);
  const candidateVector = audioVector(candidate);
  const weightedDistance = seedVector.reduce(
    (sum, value, index) => sum + AUDIO_WEIGHTS[index] * (value - candidateVector[index]) ** 2,
    0,
  );
  const distance = Math.sqrt(weightedDistance / AUDIO_WEIGHTS.reduce((sum, weight) => sum + weight, 0));
  return Math.max(0, 1 - distance);
}

function genreTerms(genres: string[]) {
  const terms = new Set(genres.map((genre) => genre.toLowerCase()));
  for (const genre of genres) {
    const normalizedGenre = genre.toLowerCase();
    for (const [family, aliases] of Object.entries(GENRE_FAMILIES)) {
      if (aliases.some((alias) => normalizedGenre.includes(alias))) terms.add(`family:${family}`);
    }
  }
  return terms;
}

function genreSimilarity(seedGenres: string[], candidateGenres: string[]) {
  if (!seedGenres.length || !candidateGenres.length) return null;
  const seedTerms = genreTerms(seedGenres);
  const candidateTerms = genreTerms(candidateGenres);
  let sharedTerms = 0;
  for (const term of seedTerms) if (candidateTerms.has(term)) sharedTerms++;
  const overlap = sharedTerms / new Set([...seedTerms, ...candidateTerms]).size;
  const sharesExactGenre = seedGenres.some((genre) =>
    candidateGenres.some((candidate) => candidate.toLowerCase() === genre.toLowerCase()),
  );
  const sharesGenreFamily = [...seedTerms].some((term) =>
    term.startsWith("family:") && candidateTerms.has(term),
  );

  if (sharesExactGenre) return Math.max(overlap, 0.85);
  if (sharesGenreFamily) return Math.max(overlap, 0.65);
  return overlap;
}

export function calculateSimilarity(
  seed: AudioFeatures,
  candidate: AudioFeatures,
  seedGenres: string[],
  candidateGenres: string[],
) {
  const audio = audioSimilarity(seed, candidate);
  const genre = genreSimilarity(seedGenres, candidateGenres);
  const total = genre === null ? audio : audio * AUDIO_SCORE_WEIGHT + genre * GENRE_SCORE_WEIGHT;
  return { audio, genre, total };
}
