// Combat for Solmar City: pistol fire with tracers and muzzle flash, bullets
// that hit pedestrians, police officers and cars, and return fire from police
// at high wanted levels. Events are reported back as flags for sound/wanted.
export const EV_SHOT = 1;
export const EV_HIT_PED = 2;
export const EV_HIT_POLICE = 4;
export const EV_HIT_CAR = 8;
export const EV_PLAYER_HIT = 16;
export const EV_PED_DOWN = 32;

export function createCombat() {
  const bullets = []; // {x,y,vx,vy,life,from}
  const flashes = []; // {x,y,angle,t}
  let playerCd = 0;

  function fire(x, y, angle, from) {
    bullets.push({ x, y, vx: Math.cos(angle) * 880, vy: Math.sin(angle) * 880, life: 0.55, from });
    flashes.push({ x: x + Math.cos(angle) * 20, y: y + Math.sin(angle) * 20, angle, t: 0.06 });
  }

  function step(dt, game, aim) {
    let events = 0;
    playerCd -= dt;
    const p = game.player;
    // Player shooting (on foot only).
    if (aim && aim.shooting && !p.car && playerCd <= 0 && !p.dead) {
      playerCd = 0.19;
      const angle = Math.atan2(aim.y - p.y, aim.x - p.x) + (Math.random() - 0.5) * 0.03;
      fire(p.x, p.y, angle, 'player');
      events |= EV_SHOT;
      game.onShot(p.x, p.y);
    }
    // Police return fire at wanted >= 3.
    if (game.wanted >= 3) {
      for (const car of game.police) {
        car.shootCd -= dt;
        const dx = p.x - car.x, dy = p.y - car.y, d = Math.hypot(dx, dy);
        if (car.shootCd <= 0 && d < 300 && d > 40) {
          car.shootCd = 0.9 + Math.random() * 0.9;
          fire(car.x, car.y, Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.14, 'police');
          events |= EV_SHOT;
        }
      }
    }
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t -= dt; if (flashes[i].t <= 0) flashes.splice(i, 1); }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let kill = b.life <= 0 || game.city.collides(b.x, b.y, 2);
      if (!kill && b.from === 'player') {
        for (const ped of game.peds) {
          if (ped.dead) continue;
          const dx = ped.x - b.x, dy = ped.y - b.y;
          if (dx * dx + dy * dy < 13 * 13) {
            ped.health -= 45; ped.hitT = 0.3; kill = true; events |= EV_HIT_PED;
            if (ped.health <= 0) { ped.dead = true; events |= EV_PED_DOWN; }
            game.onPedHurt(ped, true);
            break;
          }
        }
        if (!kill) for (const car of [...game.cars, ...game.police]) {
          const dx = car.x - b.x, dy = car.y - b.y;
          if (dx * dx + dy * dy < 26 * 26) {
            car.health -= 9; kill = true; events |= EV_HIT_CAR;
            if (game.police.includes(car)) { events |= EV_HIT_POLICE; game.onPoliceHurt(car); }
            break;
          }
        }
      }
      if (!kill && b.from === 'police' && !p.car) {
        const dx = p.x - b.x, dy = p.y - b.y;
        if (dx * dx + dy * dy < 13 * 13) { p.health -= 7; kill = true; events |= EV_PLAYER_HIT; game.onPlayerHurt(); }
      }
      if (kill) bullets.splice(i, 1);
    }
    return events;
  }
  return { bullets, flashes, step };
}
