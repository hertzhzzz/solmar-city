// SOLMAR CITY — world.js
// The city itself: a road grid, blocks of buildings, a park, a beach and a bay.
// Everything is generated from one seed, so the map is identical every run.

import { CFG, COLORS } from './config.js';
import { makeRandom, clamp } from './random.js';

export const ROAD_LINES = [];
for (let i = 0; i < 8; i++) ROAD_LINES.push(200 + i * CFG.roadGap);

export function isRoadAt(x, y) {
  const half = CFG.roadWidth / 2;
  for (const line of ROAD_LINES) {
    if (Math.abs(x - line) <= half) return true;
    if (Math.abs(y - line) <= half) return true;
  }
  return false;
}

export function isOnRoadAxis(x, y, axis) {
  const half = CFG.roadWidth / 2;
  for (const line of ROAD_LINES) {
    if (axis === 'x' && Math.abs(x - line) <= half) return line;
    if (axis === 'y' && Math.abs(y - line) <= half) return line;
  }
  return null;
}

export function buildCity() {
  const rng = makeRandom(20261121);
  const buildings = [];
  const trees = [];
  const lamps = [];
  const landmarks = [];

  const blockSize = CFG.roadGap - CFG.roadWidth; // 324
  const halfRoad = CFG.roadWidth / 2;

  // Blocks sit between road lines. Block (col,row) spans from one road to the next.
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 7; row++) {
      const bx = ROAD_LINES[col] + halfRoad;
      const by = ROAD_LINES[row] + halfRoad;
      const bw = blockSize;
      const bh = blockSize;

      // Central park.
      if (col === 3 && row === 3) {
        for (let i = 0; i < 14; i++) {
          trees.push({
            x: bx + rng.range(30, bw - 30),
            y: by + rng.range(30, bh - 30),
            r: rng.range(10, 18),
          });
        }
        landmarks.push({ kind: 'park', name: 'Palma Park', x: bx + bw / 2, y: by + bh / 2 });
        continue;
      }
      // The bay: south-east corner blocks are water and sand.
      if (col >= 6 && row >= 6) continue;
      if (col === 6 && row === 5) continue;

      // Stadium block.
      if (col === 1 && row === 5) {
        buildings.push({
          x: bx + 30, y: by + 30, w: bw - 60, h: bh - 60,
          color: '#7d8aa0', height: 26, name: 'Solmar Stadium',
        });
        landmarks.push({ kind: 'stadium', name: 'Solmar Stadium', x: bx + bw / 2, y: by + bh / 2 });
        continue;
      }
      // University block.
      if (col === 5 && row === 1) {
        buildings.push({
          x: bx + 40, y: by + 40, w: bw - 80, h: bh - 80,
          color: '#b8a06a', height: 30, name: 'Solmar University',
        });
        landmarks.push({ kind: 'university', name: 'Solmar University', x: bx + bw / 2, y: by + bh / 2 });
        continue;
      }

      // Ordinary block: 2 to 4 buildings with alleys between them.
      const count = rng.int(2, 4);
      for (let i = 0; i < count; i++) {
        const w = rng.range(70, 130);
        const h = rng.range(70, 130);
        const x = bx + CFG.blockMargin + rng.range(0, Math.max(1, bw - 2 * CFG.blockMargin - w));
        const y = by + CFG.blockMargin + rng.range(0, Math.max(1, bh - 2 * CFG.blockMargin - h));
        const b = {
          x, y, w, h,
          color: rng.pick(COLORS.buildingRoof),
          height: rng.int(14, 60),
          name: null,
        };
        // Reject overlaps with buildings already placed in this block.
        let hit = false;
        for (const other of buildings) {
          if (other.x < b.x + b.w + 14 && b.x < other.x + other.w + 14 &&
              other.y < b.y + b.h + 14 && b.y < other.y + other.h + 14) { hit = true; break; }
        }
        if (!hit) buildings.push(b);
      }
      // A few street trees on the block corners.
      if (rng.chance(0.6)) {
        trees.push({ x: bx + 18, y: by + 18, r: 12 });
        trees.push({ x: bx + bw - 18, y: by + bh - 18, r: 12 });
      }
    }
  }

  // Solmar Tower: the tall landmark at the city centre, north of the park.
  buildings.push({
    x: ROAD_LINES[3] + halfRoad + 60, y: ROAD_LINES[2] + halfRoad + 40,
    w: 120, h: 120, color: '#3d5a80', height: 110, name: 'Solmar Tower',
  });
  landmarks.push({ kind: 'tower', name: 'Solmar Tower', x: ROAD_LINES[3] + halfRoad + 120, y: ROAD_LINES[2] + halfRoad + 100 });

  // Marina on the south shore.
  landmarks.push({ kind: 'marina', name: 'Marina Bay', x: 1600, y: 3060 });
  // Hideout garage for the escape mission, west side.
  landmarks.push({ kind: 'hideout', name: 'Hideout Garage', x: 420, y: 2200 });

  // Street lamps along every road, every 200 px.
  for (const line of ROAD_LINES) {
    for (let t = 100; t < CFG.worldSize; t += 200) {
      lamps.push({ x: line + halfRoad + 8, y: t });
      lamps.push({ x: t, y: line - halfRoad - 8 });
    }
  }

  return { buildings, trees, lamps, landmarks };
}

export function collidesBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function resolveBuildingCollision(city, x, y, r) {
  // Push a circle out of any building it overlaps. Returns corrected [x, y].
  for (let pass = 0; pass < 2; pass++) {
    const b = collidesBuilding(city, x, y, r);
    if (!b) break;
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) { x = b.x - r - 1; continue; }
    const d = Math.hypot(dx, dy);
    x = cx + (dx / d) * (r + 1);
    y = cy + (dy / d) * (r + 1);
  }
  return [x, y];
}

export function randomRoadPoint(rng) {
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(120, CFG.worldSize - 120);
  // axis 'x': travel along x on a horizontal road (y = line).
  // axis 'y': travel along y on a vertical road (x = line).
  if (rng.chance(0.5)) return { x: along, y: line, axis: 'x' };
  return { x: line, y: along, axis: 'y' };
}

export function randomSidewalkPoint(rng) {
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(150, CFG.worldSize - 150);
  const off = CFG.roadWidth / 2 + 16;
  if (rng.chance(0.5)) return { x: line + (rng.chance(0.5) ? off : -off), y: along };
  return { x: along, y: line + (rng.chance(0.5) ? off : -off) };
}

export function isWaterAt(x, y) {
  // The bay occupies the south-east corner.
  return x > 2500 && y > 2500;
}

export function clampToWorld(x, y, margin) {
  return [
    clamp(x, margin, CFG.worldSize - margin),
    clamp(y, margin, CFG.worldSize - margin),
  ];
}
