"use client";

import { useMemo, useRef, useState } from "react";
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

const albums: Album[] = [
  { title: "Silk Static", artist: "Nara Blue", year: "2026", tags: ["ambient pop", "glitch"], x: 42, y: 46, size: 150, art: "linear-gradient(145deg,#5b1a92,#ef88b7 54%,#a5e7e0)", text: "SILK\nSTATIC", track: "Soft Error" },
  { title: "Open Water", artist: "Ami Sato", year: "2024", tags: ["new age", "jazz"], x: 68, y: 29, size: 112, art: "radial-gradient(circle at 72% 25%,#f8efbe 0 13%,transparent 14%),linear-gradient(160deg,#8ed6cf,#397dbd 55%,#132d48)", text: "OPEN\nWATER", track: "Blue Hour" },
  { title: "Nocturne Index", artist: "Celyn", year: "2023", tags: ["minimal", "piano"], x: 25, y: 28, size: 94, art: "linear-gradient(90deg,#e9e6dc 50%,#1a1a1a 50%)", text: "NOCTURNE\nINDEX", track: "Index II" },
  { title: "Sunroom", artist: "Paraíso Club", year: "2025", tags: ["balearic", "downtempo"], x: 59, y: 58, size: 100, art: "linear-gradient(180deg,#ffb645 0 47%,#ff6654 48% 70%,#733f69 71%)", text: "SUN\nROOM", track: "Afternoon Tide" },
  { title: "Tender Machines", artist: "Lemon Logic", year: "2026", tags: ["indietronica", "soft club"], x: 79, y: 50, size: 132, art: "repeating-linear-gradient(45deg,#ecff70 0 14px,#b2ddcd 14px 28px,#fb7288 28px 42px)", text: "TENDER\nMACHINES", track: "Please Hold" },
  { title: "Moss Memory", artist: "Iona Field", year: "2022", tags: ["folktronica", "drone"], x: 17, y: 59, size: 126, art: "radial-gradient(circle at 50% 50%,#d8df8a 0 9%,#5e7a4a 10% 29%,#253d35 30% 48%,#d9caaa 49%)", text: "MOSS\nMEMORY", track: "Lichen" },
  { title: "Heat Map", artist: "Onda", year: "2025", tags: ["leftfield", "house"], x: 88, y: 72, size: 104, art: "radial-gradient(circle at 30% 30%,#fff 0 4%,transparent 5%),conic-gradient(from 90deg,#fb4c23,#ffc928,#ef4576,#65249a,#fb4c23)", text: "HEAT\nMAP", track: "Local Maximum" },
  { title: "Borrowed Light", artist: "Peach Fig Ensemble", year: "2021", tags: ["chamber jazz", "folk"], x: 38, y: 71, size: 116, art: "linear-gradient(135deg,#435436 0 48%,#f6db9c 49% 66%,#f67c6b 67%)", text: "BORROWED\nLIGHT", track: "A Small Weather" },
  { title: "Afterimage", artist: "Petula", year: "2024", tags: ["dream pop", "shoegaze"], x: 72, y: 78, size: 144, art: "radial-gradient(ellipse at 42% 35%,#fff7d5 0 10%,#8fc5da 20%,#545e9d 42%,#171626 75%)", text: "AFTERIMAGE", track: "Still There" },
  { title: "Common Ground", artist: "Soft Assembly", year: "2020", tags: ["neo soul", "jazz-funk"], x: 10, y: 82, size: 96, art: "linear-gradient(25deg,#ec9bbe 0 45%,#008c72 46% 67%,#f5eadb 68%)", text: "COMMON\nGROUND", track: "Same Soil" },
  { title: "Pale Signal", artist: "Chorus Data", year: "2025", tags: ["art pop", "post-rock"], x: 51, y: 16, size: 106, art: "repeating-radial-gradient(circle at 50% 90%,#b9c5e7 0 8px,#e8e1cf 9px 17px,#ea6572 18px 23px)", text: "PALE\nSIGNAL", track: "Receiver" },
  { title: "Night Orchard", artist: "Ume", year: "2023", tags: ["ambient", "field recording"], x: 7, y: 37, size: 112, art: "radial-gradient(circle at 50% 48%,#d5e65b 0 8%,#76488b 9% 24%,#1c2842 45%,#080b12 75%)", text: "NIGHT\nORCHARD", track: "Fruit Bats" },
  { title: "Chrome Bloom", artist: "Unit 7", year: "2026", tags: ["deconstructed club", "IDM"], x: 92, y: 34, size: 120, art: "conic-gradient(from 30deg,#d8e1e8,#5e7397,#f5f8fa,#8ba7af,#212c47,#d8e1e8)", text: "CHROME\nBLOOM", track: "Alloy Petal" },
  { title: "Slow Cinema", artist: "Mira Vale", year: "2022", tags: ["trip hop", "cinematic"], x: 31, y: 91, size: 98, art: "linear-gradient(180deg,#f4cfc1 0 34%,#ab5366 35% 43%,#482b45 44% 72%,#13131c 73%)", text: "SLOW\nCINEMA", track: "End Credits" },
  { title: "Green Language", artist: "Aster House", year: "2024", tags: ["psych folk", "experimental"], x: 55, y: 92, size: 128, art: "repeating-conic-gradient(from 20deg,#dce19b 0 12deg,#75a06b 13deg 25deg,#eedbc4 26deg 38deg)", text: "GREEN\nLANGUAGE", track: "Fern Syntax" },
];

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

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || items !== albums) return items;
    return items.filter((a) => `${a.title} ${a.artist} ${a.tags.join(" ")}`.toLowerCase().includes(q));
  }, [query, items]);
  const positions = useMemo(() => resolveCoverCollisions(items, selected), [items, selected]);

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
                  {album.similarity !== undefined && <em>{Math.round(album.similarity * 100)}% match</em>}
                </span>
                <span className="album-meta"><strong>{album.track}</strong><small>{album.artist}</small></span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="now-playing">
        <button className={`play ${playing ? "pause" : ""}`} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? "Ⅱ" : "▶"}</button>
        <div><span>Now drifting</span><strong>{items[selected]?.track}</strong><small>{items[selected]?.artist} · {items[selected]?.year}</small></div>
        <div className="wave" aria-hidden="true">{[3,7,5,10,6,12,8,4,9,6,11,5,8,3].map((h,i) => <i key={i} style={{ height: h }} />)}</div>
      </aside>

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
