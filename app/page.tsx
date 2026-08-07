"use client";

import { useState } from "react";
import { MusicMap } from "@/components/music-map";
import { SearchForm } from "@/components/search-form";
import { useMusicDiscovery } from "@/hooks/use-music-discovery";

const MIN_ZOOM = 0.48;
const MAX_ZOOM = 2.2;
const ZOOM_STEP = 0.2;

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [reseeding, setReseeding] = useState(false);
  const { tracks, loading, error, warning, discover, discoverBySeedId } = useMusicDiscovery();

  async function search(query: string) {
    const succeeded = await discover(query);
    if (succeeded) setSelectedIndex(0);
    return succeeded;
  }

  function resetView() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <main className={darkMode ? "app dark" : "app"}>
      <header>
        <button className="wordmark" onClick={resetView} aria-label="Reset view">Soundform</button>
        <div className="header-actions">
          <button className="theme" onClick={() => setDarkMode((current) => !current)} aria-label="Toggle theme">
            <span>☼</span><span>☾</span>
          </button>
        </div>
      </header>

      <MusicMap
        albums={tracks}
        selectedIndex={selectedIndex}
        reseeding={reseeding}
        zoom={zoom}
        offset={offset}
        onOffsetChange={setOffset}
        onSelect={setSelectedIndex}
        onExplore={async (trackId, index) => {
          setSelectedIndex(index);
          setReseeding(true);
          await new Promise((resolve) => window.setTimeout(resolve, 420));
          const succeeded = await discoverBySeedId(trackId);
          if (succeeded) setSelectedIndex(0);
          requestAnimationFrame(() => requestAnimationFrame(() => setReseeding(false)));
        }}
        onZoomChange={setZoom}
      />

      <SearchForm loading={loading} onSearch={search} />

      {error && <div className="api-error"><strong>Couldn’t map this track</strong><span>{error}</span></div>}
      {warning && <div className="api-warning"><strong>Spotify metadata mode</strong><span>{warning}</span></div>}

      <div className="zoom-controls">
        <button onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}>+</button>
      </div>
    </main>
  );
}
