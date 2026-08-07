import type { Album } from "@/types/music";

const CANVAS = { width: 1200, height: 900 };
const SELECTED_SCALE = 1.33;
const COVER_GAP_RATIO = 0.08;
const LAYOUT_PASSES = 48;

export type CoverPosition = { x: number; y: number };

export function resolveCoverCollisions(albums: Album[], selectedIndex: number): CoverPosition[] {
  const nodes = albums.map((album, index) => ({
    x: (album.x / 100) * CANVAS.width,
    y: (album.y / 100) * CANVAS.height,
    size: album.size * (index === selectedIndex ? SELECTED_SCALE : 1),
  }));

  for (let pass = 0; pass < LAYOUT_PASSES; pass++) {
    let moved = false;

    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex++) {
        const left = nodes[leftIndex];
        const right = nodes[rightIndex];
        const dx = right.x - left.x || 0.01;
        const dy = right.y - left.y || 0.01;
        const distance = Math.hypot(dx, dy);
        const minimumDistance =
          (left.size + right.size) / 2 + Math.min(left.size, right.size) * COVER_GAP_RATIO;

        if (distance >= minimumDistance) continue;

        const push = (minimumDistance - distance) / 2 + 0.5;
        const directionX = dx / distance;
        const directionY = dy / distance;
        left.x -= push * directionX;
        left.y -= push * directionY;
        right.x += push * directionX;
        right.y += push * directionY;
        moved = true;
      }
    }

    for (const node of nodes) {
      const edge = node.size / 2 + 8;
      node.x = Math.min(CANVAS.width - edge, Math.max(edge, node.x));
      node.y = Math.min(CANVAS.height - edge, Math.max(edge, node.y));
    }

    if (!moved) break;
  }

  return nodes.map((node) => ({
    x: (node.x / CANVAS.width) * 100,
    y: (node.y / CANVAS.height) * 100,
  }));
}
