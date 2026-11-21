// Pedestrians for Solmar City: they stroll along block edges and sidewalks,
// wander between waypoints, and flee from gunfire, speeding cars and crashes.
import { WORLD } from './config.js';

const SHIRTS = ['#ef9a9a', '#90caf9', '#a5d6a7', '#ffe082', '#ce93d8', '#ffccbc', '#b2dfdb', '#f48fb1'];

export function spawnPeds(random, city, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, tries = 0;
    do { x = 60 + random() * (WORLD.width - 300); y = 60 + random() * (WORLD.height - 120); tries++; }
    while (city.collides(x, y, 12) && tries < 20);
    peds.push({
      x, y, angle: random() * Math.PI * 2, speed: 42 + random() * 30,
      health: 100, state: 'walk', fleeX: 0, fleeY: 0, fleeT: 0, waitT: 0,
      tx: x, ty: y, shirt: SHIRTS[Math.floor(random() * SHIRTS.length)], dead: false, hitT: 0,
    });
  }
  return peds;
}

export function scarePeds(peds, x, y, radius) {
  for (const p of peds) {
    if (p.dead) continue;
    const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
    if (d < radius) { p.state = 'flee'; p.fleeX = x; p.fleeY = y; p.fleeT = 1.6 + Math.random() * 0.8; }
  }
}

export function stepPeds(peds, dt, city, random) {
  for (const p of peds) {
    if (p.dead) continue;
    if (p.hitT > 0) p.hitT -= dt;
    let want = 0, moving = true;
    if (p.state === 'flee') {
      p.fleeT -= dt;
      want = Math.atan2(p.y - p.fleeY, p.x - p.fleeX);
      p.speed = 175;
      if (p.fleeT <= 0) { p.state = 'walk'; p.speed = 42 + random() * 30; }
    } else {
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      if (d < 14 || p.waitT > 0) {
        p.waitT -= dt; moving = p.waitT > 0 ? false : true;
        if (d < 14 && p.waitT <= 0) {
          p.waitT = random() * 2;
          p.tx = Math.max(40, Math.min(WORLD.width - 260, p.x + (random() - 0.5) * 520));
          p.ty = Math.max(40, Math.min(WORLD.height - 40, p.y + (random() - 0.5) * 520));
        }
      }
      want = Math.atan2(dy, dx);
    }
    if (!moving) continue;
    let d = (want - p.angle) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    p.angle += d * Math.min(1, 8 * dt);
    const nx = p.x + Math.cos(p.angle) * p.speed * dt;
    const ny = p.y + Math.sin(p.angle) * p.speed * dt;
    if (!city.collides(nx, ny, 10)) { p.x = nx; p.y = ny; }
    else { p.angle += 1.8 * dt; p.tx = p.x + (random() - 0.5) * 300; p.ty = p.y + (random() - 0.5) * 300; }
  }
}
