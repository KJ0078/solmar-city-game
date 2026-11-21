// Solmar City generation: a deterministic coastal grid. Avenues run north-south,
// streets east-west; the blocks between them hold named buildings, parks and
// plazas. The sea and beach line the east edge. Same seed, same city.
import { AVENUES, BEACH_X, PALETTE, ROAD_HALF, STREETS, WATER_X, WORLD } from './config.js';

const NAMES = [
  'Seabreeze Diner', 'Solmar Pawn', 'Palms Motel', 'Banco Solmar', 'Marina Chandlery',
  'Café Brisa', 'Solmar Customs', 'Hotel Coral', 'Tidepool Books', 'Fish Market',
  'Casa Verde Flats', 'Sunset Laundromat', 'The Salty Anchor', 'Palm Court Offices',
  'Solmar Pharmacy', 'Dockside Storage', 'Coconut Gym', 'Harbour View Flats',
  'Taco Brisa', 'Solmar Records', 'Bay Breeze Bakery', 'Coral Clinic', 'Pier Gifts',
];
const ROOFS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];

export function nearestRoadAxis(x, y) {
  let best = null;
  for (const ax of AVENUES) { const d = Math.abs(x - ax); if (!best || d < best.d) best = { d, vertical: true, at: ax }; }
  for (const sy of STREETS) { const d = Math.abs(y - sy); if (d < best.d) best = { d, vertical: false, at: sy }; }
  return best;
}
export function isRoad(x, y) {
  if (x >= BEACH_X) return false;
  for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_HALF) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_HALF) return true;
  return false;
}
export function isWater(x, y) { return x >= WATER_X; }

export function createCity(random) {
  const buildings = []; // {x,y,w,h,name,color,special}
  const trees = []; // {x,y,r,palm}
  const lights = []; // streetlights {x,y}
  const places = {}; // special locations by key

  // Block ranges between roads (with a sidewalk margin).
  const xEdges = [16, ...AVENUES.flatMap((a) => [a - ROAD_HALF - 14, a + ROAD_HALF + 14]), BEACH_X - 8];
  const yEdges = [16, ...STREETS.flatMap((s) => [s - ROAD_HALF - 14, s + ROAD_HALF + 14]), WORLD.height - 16];
  const xBlocks = [], yBlocks = [];
  for (let i = 0; i < xEdges.length; i += 2) xBlocks.push([xEdges[i], xEdges[i + 1]]);
  for (let i = 0; i < yEdges.length; i += 2) yBlocks.push([yEdges[i], yEdges[i + 1]]);

  let nameIdx = Math.floor(random() * NAMES.length);
  const specials = [
    { key: 'hospital', name: 'St. Lucia Medical', bx: 0, by: 0, color: '#eceff1' },
    { key: 'police', name: 'Solmar PD', bx: 2, by: 0, color: '#546e7a' },
    { key: 'bank', name: 'Banco Solmar', bx: 1, by: 1, color: '#d9a05b' },
    { key: 'garage', name: 'Solmar Customs Garage', bx: 3, by: 2, color: '#8d6e63' },
  ];
  const specialAt = new Map(specials.map((s) => [`${s.bx},${s.by}`, s]));

  for (let bx = 0; bx < xBlocks.length; bx++) {
    for (let by = 0; by < yBlocks.length; by++) {
      const [x0, x1] = xBlocks[bx], [y0, y1] = yBlocks[by];
      const bw = x1 - x0, bh = y1 - y0;
      if (bw < 60 || bh < 60) continue;
      const sp = specialAt.get(`${bx},${by}`);
      if (sp) {
        const b = { x: x0 + 18, y: y0 + 18, w: bw - 36, h: bh - 36, name: sp.name, color: sp.color, special: sp.key };
        buildings.push(b); places[sp.key] = { x: b.x + b.w / 2, y: b.y + b.h + 26, name: sp.name };
        continue;
      }
      const roll = random();
      if (roll < 0.14) { // park block: trees, no building
        for (let t = 0; t < 7; t++) trees.push({ x: x0 + 20 + random() * (bw - 40), y: y0 + 20 + random() * (bh - 40), r: 10 + random() * 6, palm: false });
        continue;
      }
      const cols = bw > 168 ? 2 : 1, rows = bh > 168 ? 2 : 1;
      for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
        const pad = 14, cw = (bw - pad * (cols + 1)) / cols, ch = (bh - pad * (rows + 1)) / rows;
        buildings.push({
          x: x0 + pad + cx * (cw + pad), y: y0 + pad + cy * (ch + pad), w: cw, h: ch,
          name: NAMES[nameIdx++ % NAMES.length], color: ROOFS[Math.floor(random() * ROOFS.length)], special: null,
        });
      }
    }
  }
  // Marina on the beach: a named dock building plus a jetty point in the shallows.
  const marina = { x: 1760, y: 520, w: 150, h: 90, name: 'Marisol Marina', color: '#a8573c', special: 'marina' };
  buildings.push(marina);
  places.marina = { x: 1985, y: 565, name: 'Marisol Marina' };
  places.docks = { x: 1850, y: 900, name: 'South Docks' };
  places.beach = { x: 1985, y: 1250, name: 'Solmar Beach' };
  places.hotel = { x: 984, y: 470, name: 'Hotel Coral' };
  places.diner = { x: 330, y: 880, name: 'Seabreeze Diner' };
  // Palms along the beach and avenues; streetlights at intersections.
  for (let y = 60; y < WORLD.height - 40; y += 92) trees.push({ x: BEACH_X + 34 + random() * 30, y, r: 9 + random() * 4, palm: true });
  for (const ax of AVENUES) for (let y = 90; y < WORLD.height - 60; y += 210) if (random() < 0.6) trees.push({ x: ax - ROAD_HALF - 22, y, r: 8 + random() * 4, palm: true });
  for (const ax of AVENUES) for (const sy of STREETS) {
    lights.push({ x: ax - ROAD_HALF - 6, y: sy - ROAD_HALF - 6 }, { x: ax + ROAD_HALF + 6, y: sy + ROAD_HALF + 6 });
  }
  const solids = buildings.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
  function collides(x, y, r) {
    if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
    if (x + r >= WATER_X) return true;
    for (const s of solids) if (x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h) return true;
    return false;
  }
  function rectCollides(x, y, w, h) {
    if (x < 0 || y < 0 || x + w > WORLD.width || y + h > WORLD.height) return true;
    if (x + w >= WATER_X) return true;
    for (const s of solids) if (x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y) return true;
    return false;
  }
  return { buildings, trees, lights, places, collides, rectCollides, solids };
}
