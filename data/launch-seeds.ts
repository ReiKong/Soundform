export type LaunchSeed = { track: string; artist: string };

export const launchSeeds: LaunchSeed[] = [
  { track: "Trap Door", artist: "Stars" },
  { track: "Forgetter - Sofi Tukker Remix", artist: "Mr Little Jeans SOFI TUKKER" },
  { track: "Allez bisous", artist: "Fred Nevché" },
  { track: "On Division St", artist: "Nation of Language" },
  { track: "Grad Walk", artist: "Nathan Micay" },
  { track: "bunnybunnybunny", artist: "Mietze Conte" },
  { track: "Fur", artist: "Blue Lake" },
  { track: "Des Goblin", artist: "Gurriers" },
  { track: "Real Thing", artist: "Stars" },
  { track: "All We Ever Do Is Talk", artist: "Del Water Gap" },
  { track: "The Bells", artist: "Jeff Mills" },
  { track: "bad decision!", artist: "Esha Tewari" },
  { track: "I Can't Stop (Holding On)", artist: "The Cleaners From Venus" },
  { track: "NEVER ENOUGH", artist: "Turnstile" },
  { track: "Butterfly", artist: "Léonie Pernet" },
  { track: "Revisit", artist: "Tofu Kingdom" },
  { track: "Жду любви", artist: "Несогласие" },
  { track: "A Estos Hombres Tristes", artist: "Almendra" },
  { track: "So Easy", artist: "Clear Coast" },
  { track: "Sunkissed", artist: "The Vaccines" },
  { track: "Love Test", artist: "The Growlers" },
  { track: "Beyond Love", artist: "Beach House" },
  { track: "Glide", artist: "Møme" },
  { track: "Fool", artist: "Bay Ledges" },
  { track: "Come Find Me", artist: "Caribou" },
  { track: "It's Only Music, Baby", artist: "Kid Francescoli Julia Minkin" },
  { track: "Souvenir", artist: "León Larregui" },
];

export function randomLaunchQuery() {
  const seed = launchSeeds[Math.floor(Math.random() * launchSeeds.length)];
  return `track:${seed.track} artist:${seed.artist}`;
}
