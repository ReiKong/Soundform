"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";

type Album = {
  id?: string;
  title: string;
  artist: string;
  year: string;
  tags: string[];
  x: number;
  y: number;
  size: number;
  art: string;
  text: string;
  track: string;
  image?: string;
  spotifyUrl?: string;
  similarity?: number;
  features?: { energy: number; valence: number; acousticness: number; danceability: number; instrumentalness: number; tempo: number };
};

const albums: Album[] = [];

const launchSeeds = [
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
] as const;

function resolveCoverCollisions(source: Album[], selectedIndex: number) {
  const canvas = { width: 1200, height: 900 };
  const nodes = source.map((album, index) => ({
    x: album.x / 100 * canvas.width,
    y: album.y / 100 * canvas.height,
    size: album.size * (index === selectedIndex ? 1.33 : 1),
  }));

  for (let pass = 0; pass < 48; pass++) {
    let moved = false;
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      const left = nodes[a], right = nodes[b];
      const dx = right.x - left.x || .01;
      const dy = right.y - left.y || .01;
      const overlapX = Math.max(0, (left.size + right.size) / 2 - Math.abs(dx));
      const overlapY = Math.max(0, (left.size + right.size) / 2 - Math.abs(dy));
      const maxArea = .15 * Math.min(left.size ** 2, right.size ** 2);
      if (overlapX * overlapY <= maxArea) continue;

      const pushX = overlapX - maxArea / overlapY;
      const pushY = overlapY - maxArea / overlapX;
      if (pushX < pushY) {
        const push = pushX / 2 + .5, direction = Math.sign(dx);
        left.x -= push * direction; right.x += push * direction;
      } else {
        const push = pushY / 2 + .5, direction = Math.sign(dy);
        left.y -= push * direction; right.y += push * direction;
      }
      moved = true;
    }
    for (const node of nodes) {
      const edge = node.size / 2 + 8;
      node.x = Math.min(canvas.width - edge, Math.max(edge, node.x));
      node.y = Math.min(canvas.height - edge, Math.max(edge, node.y));
    }
    if (!moved) break;
  }
  return nodes.map((node) => ({ x: node.x / canvas.width * 100, y: node.y / canvas.height * 100 }));
}

export default function Home() {
  const [dark, setDark] = useState(false);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Album[]>(albums);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const launched = useRef(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || items !== albums) return items;
    return items.filter((a) => `${a.title} ${a.artist} ${a.tags.join(" ")}`.toLowerCase().includes(q));
  }, [query, items]);
  const positions = useMemo(() => resolveCoverCollisions(items, selected), [items, selected]);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    const seed = launchSeeds[Math.floor(Math.random() * launchSeeds.length)];
    const spotifyQuery = `track:${seed.track} artist:${seed.artist}`;
    (async () => {
      setLoading(true); setError(""); setWarning("");
      try {
        const response = await fetch(`/api/spotify?q=${encodeURIComponent(spotifyQuery)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load the launch track.");
        setItems(data.tracks); setSelected(0); setPlaying(false); setWarning(data.warning || "");
      } catch (e) { setError(e instanceof Error ? e.message : "Could not load the launch track."); }
      finally { setLoading(false); }
    })();
  }, []);

  async function discover() {
    if (!query.trim()) return;
    setLoading(true); setError(""); setWarning("");
    try {
      const response = await fetch(`/api/spotify?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Spotify search failed");
      setItems(data.tracks); setSelected(0); setPlaying(false); setQuery(""); setWarning(data.warning || "");
    } catch (e) { setError(e instanceof Error ? e.message : "Spotify search failed"); }
    finally { setLoading(false); }
  }

  function focusAlbum(index: number) {
    setSelected(index);
    setPlaying(true);
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <header>
        <button className="wordmark" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} aria-label="Reset view">Soundform</button>
        <div className="header-actions">
          <button className="theme" onClick={() => setDark(!dark)} aria-label="Toggle theme"><span>☼</span><span>☾</span></button>
        </div>
      </header>

      <section
        className="map"
        onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(2.2, Math.max(.48, z - e.deltaY * .00135))); }}
        onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button")) return; drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (drag.current) setOffset({ x: drag.current.ox + (e.clientX - drag.current.x) * 1.35, y: drag.current.oy + (e.clientY - drag.current.y) * 1.35 }); }}
        onPointerUp={() => { drag.current = null; }}
        aria-label="Interactive map of music"
      >
        <div className="world" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
          {items.map((album, index) => {
            const visible = matches.includes(album);
            return (
              <button
                key={album.title}
                className={`album ${selected === index ? "selected" : ""} ${visible ? "" : "muted"}`}
                style={{ left: `${positions[index].x}%`, top: `${positions[index].y}%`, width: album.size, "--label-scale": 1 / zoom } as CSSProperties}
                onClick={() => focusAlbum(index)}
                aria-label={`${album.title} by ${album.artist}`}
              >
                <span className="cover" style={{ background: album.art }}>
                  {album.image ? <Image src={album.image} alt={`${album.title} cover`} fill sizes={`${album.size}px`} unoptimized /> : <b>{album.text.split("\n").map((line) => <i key={line}>{line}</i>)}</b>}
                  {/* {album.similarity !== undefined && <em>{Math.round(album.similarity * 100)}% match</em>} */}
                </span>
                <span className="album-meta"><strong>{album.track}</strong><small>{album.artist}</small></span>
              </button>
            );
          })}
        </div>
      </section>

      {/* <aside className="now-playing">
        <button className={`play ${playing ? "pause" : ""}`} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? "Ⅱ" : "▶"}</button>
        <div><span>Now drifting</span><strong>{items[selected]?.track}</strong><small>{items[selected]?.artist} · {items[selected]?.year}</small></div>
        <div className="wave" aria-hidden="true">{[3,7,5,10,6,12,8,4,9,6,11,5,8,3].map((h,i) => <i key={i} style={{ height: h }} />)}</div>
      </aside> */}

      <form className="search" onSubmit={(e) => { e.preventDefault(); discover(); }}>
        <label htmlFor="music-search">Find a sound</label>
        <input id="music-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="enter a track to find its sonic neighbours…" />
        <button type="submit" disabled={loading}>{loading ? "mapping…" : "find"}</button>
      </form>
      {error && <div className="api-error"><strong>Couldn’t map this track</strong><span>{error}</span></div>}
      {warning && <div className="api-warning"><strong>Spotify metadata mode</strong><span>{warning}</span></div>}
      <div className="zoom-controls"><button onClick={() => setZoom((z) => Math.max(.48, z - .2))}>−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((z) => Math.min(2.2, z + .2))}>+</button></div>
      <p className="hint">drag to roam · scroll to zoom · click to listen</p>
    </main>
  );
}
