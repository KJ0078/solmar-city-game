// Vehicles for Solmar City: parked cars to steal, traffic AI that follows the
// road grid in right-hand lanes, and arcade driving physics shared by the
// player, traffic and police (police steering lives in police.js).
import { AVENUES, CAR_TYPES, ROAD_HALF, STREETS, WORLD } from './config.js';
import { isRoad } from './city.js';

let nextId = 1;
export function makeCar(type, x, y, angle) {
  return {
    id: nextId++, type, x, y, angle, speed: 0, health: 100,
    w: type.w, h: type.h, parked: false, driver: null, marked: false,
    skid: 0, honk: 0,
  };
}
export function carRadius(car) { return car.w * 0.52; }

export function spawnTraffic(random, city, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = random() < 0.55;
    const type = CAR_TYPES[Math.floor(random() * CAR_TYPES.length)];
    let x, y, angle;
    if (vertical) {
      const ax = AVENUES[Math.floor(random() * AVENUES.length)];
      const dir = random() < 0.5 ? 1 : -1;
      x = ax + (dir > 0 ? -24 : 24); y = 80 + random() * (WORLD.height - 160);
      angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const sy = STREETS[Math.floor(random() * STREETS.length)];
      const dir = random() < 0.5 ? 1 : -1;
      y = sy + (dir > 0 ? 24 : -24); x = 80 + random() * (WORLD.width - 400);
      angle = dir > 0 ? 0 : Math.PI;
    }
    const car = makeCar(type, x, y, angle);
    car.driver = 'traffic';
    car.cruise = 130 + random() * 110;
    cars.push(car);
  }
  // Parked cars along avenue kerbs, ready to steal.
  for (let i = 0; i < 16; i++) {
    const ax = AVENUES[Math.floor(random() * AVENUES.length)];
    const type = CAR_TYPES[Math.floor(random() * CAR_TYPES.length)];
    const side = random() < 0.5 ? -1 : 1;
    const car = makeCar(type, ax + side * (ROAD_HALF - 16), 90 + random() * (WORLD.height - 180), side < 0 ? -Math.PI / 2 : Math.PI / 2);
    if (!city.rectCollides(car.x - 14, car.y - 26, 28, 52)) { car.parked = true; cars.push(car); }
  }
  return cars;
}

function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

// Traffic: follow the current road; near an intersection, sometimes turn.
// Slow down when a car or the player is just ahead.
export function stepTraffic(car, dt, city, allCars, playerPos) {
  const aheadX = car.x + Math.cos(car.angle) * 54, aheadY = car.y + Math.sin(car.angle) * 54;
  let blocked = city.rectCollides(aheadX - 12, aheadY - 12, 24, 24) && !isRoad(aheadX, aheadY);
  for (const other of allCars) {
    if (other === car) continue;
    const dx = other.x - aheadX, dy = other.y - aheadY;
    if (dx * dx + dy * dy < 34 * 34) { blocked = true; break; }
  }
  if (playerPos) { const dx = playerPos.x - aheadX, dy = playerPos.y - aheadY; if (dx * dx + dy * dy < 30 * 30) blocked = true; }
  const target = blocked ? 0 : car.cruise;
  car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), (blocked ? 420 : 160) * dt);
  // Intersection turn check: if the road ahead ends (beach/water edge), turn.
  // (Play-testing pass: an earlier random mid-block turn let traffic nose
  // into block interiors and stick; cars now only turn when the road ends
  // or at a real intersection when their lane continues no further.)
  const probeX = car.x + Math.cos(car.angle) * 90, probeY = car.y + Math.sin(car.angle) * 90;
  if (!isRoad(probeX, probeY) || probeX > WORLD.width - 120) {
    const turn = Math.PI / 2;
    car.angle = angleLerp(car.angle, Math.round((car.angle + turn) / (Math.PI / 2)) * (Math.PI / 2), 2.2 * dt);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!city.rectCollides(nx - car.h / 2, ny - car.h / 2, car.h, car.h)) { car.x = nx; car.y = ny; }
  else car.speed = 0;
}

// Arcade driving for a steered car (player or police). Returns impact speed if
// it hit a building this step, else 0.
export function driveCar(car, dt, input, city) {
  const t = car.type;
  if (input.up) car.speed += t.accel * dt;
  else if (input.down) car.speed -= (car.speed > 4 ? 460 : t.accel * 0.55) * dt;
  else car.speed -= car.speed * 0.7 * dt;
  if (input.brake) car.speed -= car.speed * 3.2 * dt;
  const maxRev = -t.max * 0.35;
  car.speed = Math.max(maxRev, Math.min(t.max, car.speed));
  if (Math.abs(car.speed) > 2) {
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    car.angle += steer * t.grip * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
    car.skid = input.brake && Math.abs(car.speed) > 140 ? 1 : Math.max(0, car.skid - dt * 3);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const r = car.h * 0.55;
  if (!city.rectCollides(nx - r, ny - r, r * 2, r * 2)) { car.x = nx; car.y = ny; return 0; }
  const impact = Math.abs(car.speed);
  car.speed = -car.speed * 0.25;
  return impact;
}

// Circle collision between two cars; pushes them apart and trades speed.
export function collideCars(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy), min = carRadius(a) * 0.8 + carRadius(b) * 0.8;
  if (dist === 0 || dist >= min) return 0;
  const push = (min - dist) / 2, ux = dx / dist, uy = dy / dist;
  a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
  const rel = Math.abs(a.speed - b.speed);
  const avg = (a.speed + b.speed) / 2;
  a.speed = avg * 0.7; b.speed = avg * 0.7;
  a.health -= rel * 0.04; b.health -= rel * 0.04;
  return rel;
}
