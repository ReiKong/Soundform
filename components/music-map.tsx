"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { FaAngleDoubleRight } from "react-icons/fa";
import { resolveCoverCollisions } from "@/lib/cover-layout";
import type { Album } from "@/types/music";

type Point = { x: number; y: number };

type MusicMapProps = {
  albums: Album[];
  selectedIndex: number;
  reseeding: boolean;
  zoom: number;
  offset: Point;
  onOffsetChange: (offset: Point) => void;
  onSelect: (index: number) => void;
  onExplore: (trackId: string, index: number) => void;
  onZoomChange: (zoom: number) => void;
};

const MIN_ZOOM = 0.48;
const MAX_ZOOM = 2.2;
const PARALLAX_STRENGTH = 0.12;

function parallaxPosition(position: Point, index: number, zoom: number) {
  // A stable depth keeps each cover on the same visual layer between renders.
  const depth = 0.7 + ((index * 37) % 7) / 10;
  const zoomDelta = zoom - 1;
  const depthOffset = (depth - 1) * zoomDelta * PARALLAX_STRENGTH;

  return {
    x: 50 + (position.x - 50) * (1 + depthOffset),
    y: 50 + (position.y - 50) * (1 + depthOffset),
  };
}

export function MusicMap({
  albums,
  selectedIndex,
  reseeding,
  zoom,
  offset,
  onOffsetChange,
  onSelect,
  onExplore,
  onZoomChange,
}: MusicMapProps) {
  const [coverOffsets, setCoverOffsets] = useState<Record<number, Point>>({});
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const mapDrag = useRef<{ x: number; y: number; origin: Point } | null>(null);
  const coverDrag = useRef<{ index: number; x: number; y: number; moved: boolean } | null>(null);
  const positions = useMemo(
    () => resolveCoverCollisions(albums, selectedIndex),
    [albums, selectedIndex],
  );

  function releaseCover(index: number, event: ReactPointerEvent<HTMLDivElement>) {
    if (coverDrag.current?.index !== index) return false;
    const shouldSelect = !coverDrag.current.moved;
    coverDrag.current = null;
    setDraggingIndex(null);
    setCoverOffsets((current) => ({ ...current, [index]: { x: 0, y: 0 } }));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    return shouldSelect;
  }

  return (
    <section
      className={`map ${reseeding ? "reseeding" : ""}`}
      onWheel={(event) => {
        event.preventDefault();
        onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom - event.deltaY * 0.00135)));
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        mapDrag.current = { x: event.clientX, y: event.clientY, origin: offset };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!mapDrag.current) return;
        onOffsetChange({
          x: mapDrag.current.origin.x + (event.clientX - mapDrag.current.x) * 1.35,
          y: mapDrag.current.origin.y + (event.clientY - mapDrag.current.y) * 1.35,
        });
      }}
      onPointerUp={() => { mapDrag.current = null; }}
      onPointerCancel={() => { mapDrag.current = null; }}
      aria-label="Interactive map of music"
    >
      <div className="world" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
        {albums.map((album, index) => {
          const dragOffset = coverOffsets[index] ?? { x: 0, y: 0 };
          const isDragging = draggingIndex === index;
          const position = parallaxPosition(positions[index], index, zoom);

          return (
            <div
              key={album.id ?? `${album.track}-${album.artist}`}
              className={`album ${selectedIndex === index ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                width: album.size,
                "--label-scale": 1 / zoom,
                "--meta-width": `${album.size * zoom * (selectedIndex === index ? 1.33 : 1)}px`,
                "--drag-x": `${dragOffset.x}px`,
                "--drag-y": `${dragOffset.y}px`,
              } as CSSProperties}
              onPointerDown={(event) => {
                event.stopPropagation();
                coverDrag.current = { index, x: event.clientX, y: event.clientY, moved: false };
                setDraggingIndex(index);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const activeDrag = coverDrag.current;
                if (!activeDrag || activeDrag.index !== index) return;
                const x = (event.clientX - activeDrag.x) / zoom;
                const y = (event.clientY - activeDrag.y) / zoom;
                if (Math.hypot(x, y) > 3) activeDrag.moved = true;
                setCoverOffsets((current) => ({ ...current, [index]: { x, y } }));
              }}
              onPointerUp={(event) => {
                if (releaseCover(index, event)) onSelect(index);
              }}
              onPointerCancel={(event) => releaseCover(index, event)}
              onDragStart={(event) => event.preventDefault()}
            >
              {album.id && (
                <button
                  className="explore-track"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onExplore(album.id!, index);
                  }}
                  aria-label={`Find neighbors for ${album.track}`}
                >
                  <FaAngleDoubleRight aria-hidden="true" />
                </button>
              )}
              <button
                className="album-cover-button"
                onClick={(event) => {
                  // Pointer selection happens on release above; detail 0 is keyboard activation.
                  if (event.detail === 0) onSelect(index);
                }}
                aria-label={`Select ${album.track} by ${album.artist}`}
              >
                <span className="cover" style={{ background: album.art }}>
                  {album.image ? (
                    <Image
                      src={album.image}
                      alt={`${album.title} cover`}
                      fill
                      sizes={`${album.size}px`}
                      draggable={false}
                      unoptimized
                    />
                  ) : (
                    <b>{album.text.split("\n").map((line) => <i key={line}>{line}</i>)}</b>
                  )}
                </span>
              </button>
              <span className="album-meta">
                <span className="album-copy">
                  <strong>{album.track}</strong>
                  <small>{album.artist}</small>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
