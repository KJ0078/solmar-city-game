// Police for Solmar City: interceptors spawn in proportion to the wanted
// level, chase and ram the player, and back off when the heat dies down.
// At high wanted levels officers on the scene also shoot (see combat step).
import { POLICE_TYPE, WORLD } from './config.js';
import { makeCar } from './vehicles.js';

export function wantedCount(wanted) { return [0, 1, 2, 3, 4, 6][Math.max(0, Math.min(5, wanted))]; }

export function spawnPolice(police, wanted, player, city, random) {
  const want = wantedCount(wanted);
  while (police.length < want) {
    // Spawn on a road a few hundred pixels away, out of immediate view.
    const side = Math.floor(random() * 4);
    let x = player.x, y = player.y;
    if (side === 0) { x = player.x - 520; y = player.y + (random() - 0.5) * 300; }
    if (side === 1) { x = player.x + 520; y = player.y + (random() - 0.5) * 300; }
    if (side === 2) { y = player.y - 520; x = player.x + (random() - 0.5) * 300; }
    if (side === 3) { y = player.y + 520; x = player.x + (random() - 0.5) * 300; }
    x = Math.max(60, Math.min(WORLD.width - 300, x)); y = Math.max(60, Math.min(WORLD.height - 60, y));
    if (city.collides(x, y, 26)) { x = 264; y = 264; }
    const car = makeCar(POLICE_TYPE, x, y, Math.atan2(player.y - y, player.x - x));
    car.driver = 'police'; car.shootCd = 1 + random() * 2; car.officer = { health: 100, dead: false };
    police.push(car);
  }
  while (police.length > want) police.pop();
}

// Steer one police car toward the player. Returns a drive input for driveCar.
export function policeInput(car, playerPos, dt) {
  const dx = playerPos.x - car.x, dy = playerPos.y - car.y;
  const dist = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dy, dx);
  let d = (targetAngle - car.angle) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  const input = { up: false, down: false, left: false, right: false, brake: false };
  if (d > 0.18) input.right = true; else if (d < -0.18) input.left = true;
  // If facing away and slow, reverse toward the player instead of a wide turn.
  if (Math.abs(d) > 2.2 && Math.abs(car.speed) < 60) { input.down = true; input.left = d > 0; input.right = d < 0; }
  else if (dist > 46) input.up = true;
  else input.brake = true; // nose-to-nose: hold position, busted meter does the work
  car.aimAngle = targetAngle;
  return input;
}

// Does any police unit currently see the player (close and roughly facing)?
export function policeSees(police, playerPos) {
  for (const car of police) {
    const dx = playerPos.x - car.x, dy = playerPos.y - car.y;
    if (dx * dx + dy * dy < 430 * 430) return true;
  }
  return false;
}
