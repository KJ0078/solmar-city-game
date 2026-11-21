// World orchestration for Solmar City: owns the city, player, cars, peds,
// police, combat and missions; advances everything in fixed steps; runs the
// wanted/busted/wasted rules and the localStorage save.
import { PLAYER, SAVE_KEY, STEP, WORLD } from './config.js';
import { createCity, isRoad } from './city.js';
import { spawnTraffic, stepTraffic, driveCar, collideCars, makeCar, carRadius } from './vehicles.js';
import { spawnPeds, stepPeds, scarePeds } from './pedestrians.js';
import { spawnPolice, policeInput, policeSees } from './police.js';
import { createCombat, EV_SHOT, EV_HIT_PED, EV_HIT_POLICE, EV_PED_DOWN, EV_PLAYER_HIT } from './combat.js';
import { createMissions } from './missions.js';
import { CAR_TYPES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createWorld(random) {
  const city = createCity(random);
  const cars = spawnTraffic(random, city, 13);
  const peds = spawnPeds(random, city, 26);
  const police = [];
  const combat = createCombat();
  const missions = createMissions(city);
  const effects = { skids: [], puffs: [], shake: 0, flashRed: 0 };
  const player = {
    x: 984, y: 470, angle: 0, aimAngle: 0, health: PLAYER.health, car: null,
    dead: false, aimX: 0, aimY: 0, walkPhase: 0,
  };
  const game = {
    city, cars, peds, police, combat, missions, player, effects,
    cash: 50, wanted: 0, heat: 0, bustedMeter: 0, unseenT: 0, time: 0,
    dayT: 0.32, screen: SCREEN_PLAY, overReason: '', muted: false,
    events: 0, markedCar: null,
    onShot(x, y) { addHeat(0.6); scarePeds(peds, x, y, 240); },
    onPedHurt(ped, shot) { if (shot) addHeat(1.2); },
    onPoliceHurt() { addHeat(0.8); },
    onPlayerHurt() { effects.flashRed = 0.25; },
  };

  function addHeat(n) {
    game.heat = Math.min(5.6, game.heat + n);
    game.wanted = Math.max(game.wanted, Math.min(5, Math.floor(game.heat + 0.001)));
    if (game.wanted === 0 && game.heat > 0.4) game.wanted = 1;
  }
  game.addHeat = addHeat;

  function playerPos() { return player.car ? { x: player.car.x, y: player.car.y } : { x: player.x, y: player.y }; }

  function crimeWitnessed(x, y, amount) {
    let seen = policeSees(police, { x, y });
    if (!seen) for (const ped of peds) { if (ped.dead) continue; const dx = ped.x - x, dy = ped.y - y; if (dx * dx + dy * dy < 200 * 200) { seen = true; break; } }
    addHeat(seen ? amount : amount * 0.35);
  }

  function tryEnterExit() {
    if (player.car) {
      const car = player.car;
      player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
      player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
      if (city.collides(player.x, player.y, PLAYER.radius)) { player.x = car.x; player.y = car.y; }
      player.car = null; car.driver = null; car.parked = true;
      return 'exit';
    }
    let best = null, bd = 52;
    for (const car of cars) {
      const dx = car.x - player.x, dy = car.y - player.y, d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = car; }
    }
    if (best) {
      const wasParked = best.parked;
      player.car = best; best.driver = 'player'; best.parked = false;
      if (wasParked || bd > 20) crimeWitnessed(best.x, best.y, 1.1); // stealing in view heats up
      scarePeds(peds, best.x, best.y, 90);
      return 'enter';
    }
    return null;
  }

  function respawn(kind) {
    const at = kind === 'busted' ? city.places.police : city.places.hospital;
    player.car = null;
    player.x = at.x; player.y = at.y; player.health = PLAYER.health;
    game.wanted = 0; game.heat = 0; game.bustedMeter = 0; police.length = 0;
    game.cash = Math.max(0, game.cash - (kind === 'busted' ? 150 : 100));
    game.screen = SCREEN_PLAY;
  }

  function save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: game.cash, mission: missions.state.index, storyDone: missions.state.storyDone,
        x: player.x, y: player.y,
      }));
    } catch { /* storage may be unavailable */ }
  }
  function loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function applySave(s) {
    if (!s) return;
    game.cash = s.cash | 0;
    missions.state.index = Math.min(missions.story.length, s.mission | 0);
    missions.state.storyDone = !!s.storyDone;
    if (Number.isFinite(s.x) && Number.isFinite(s.y) && !city.collides(s.x, s.y, PLAYER.radius)) { player.x = s.x; player.y = s.y; }
    if (missions.state.storyDone) missions.startSide(random);
  }

  function step(dt, input, aimWorld) {
    game.events = 0;
    game.time += dt;
    game.dayT = (game.dayT + dt / 300) % 1;
    if (effects.shake > 0) effects.shake = Math.max(0, effects.shake - dt * 2.2);
    if (effects.flashRed > 0) effects.flashRed -= dt;
    const pos = playerPos();

    // --- player movement ---
    if (player.car) {
      const car = player.car;
      const before = Math.abs(car.speed);
      const impact = driveCar(car, dt, input.driving(), city);
      player.x = car.x; player.y = car.y;
      if (impact > 170) {
        game.events |= 64; effects.shake = Math.min(1, impact / 420);
        car.health -= (impact - 150) * 0.08; player.health -= (impact - 170) * 0.03;
        scarePeds(peds, car.x, car.y, 170); crimeWitnessed(car.x, car.y, 0.25);
      }
      if (car.skid) effects.skids.push({ x: car.x, y: car.y, t: 6 });
      if (Math.abs(car.speed) > 200 && Math.random() < 0.3) effects.puffs.push({ x: car.x - Math.cos(car.angle) * 24, y: car.y - Math.sin(car.angle) * 24, t: 0.5, r: 4 });
      // running over a pedestrian: a serious crime
      for (const ped of peds) {
        if (ped.dead || Math.abs(car.speed) < 60) continue;
        const dx = ped.x - car.x, dy = ped.y - car.y;
        if (dx * dx + dy * dy < 26 * 26) {
          ped.health -= 70; ped.hitT = 0.4;
          if (ped.health <= 0) ped.dead = true;
          scarePeds(peds, car.x, car.y, 260);
          crimeWitnessed(car.x, car.y, 1.6);
          game.events |= 128;
        }
      }
      void before;
    } else {
      const ax = input.axis();
      const len = Math.hypot(ax.x, ax.y);
      if (len > 0) {
        const sp = input.running() ? PLAYER.run : PLAYER.walk;
        const nx = player.x + (ax.x / len) * sp * dt, ny = player.y + (ax.y / len) * sp * dt;
        if (!city.collides(nx, player.y, PLAYER.radius)) player.x = nx;
        if (!city.collides(player.x, ny, PLAYER.radius)) player.y = ny;
        player.angle = Math.atan2(ax.y, ax.x);
        player.walkPhase += dt * (input.running() ? 13 : 9);
      }
      if (player.health < PLAYER.health) player.health = Math.min(PLAYER.health, player.health + dt * 1.6);
    }

    // --- traffic, peds, police ---
    for (const car of cars) if (car.driver === 'traffic') stepTraffic(car, dt, city, cars, pos);
    stepPeds(peds, dt, city, random);
    spawnPolice(police, game.wanted, pos, city, random);
    for (const car of police) {
      const inp = policeInput(car, pos, dt);
      const impact = driveCar(car, dt, inp, city);
      if (impact > 200) car.health -= 4;
      // ramming the player
      const dx = pos.x - car.x, dy = pos.y - car.y;
      if (dx * dx + dy * dy < 44 * 44 && Math.abs(car.speed) > 120) {
        if (player.car) { player.car.health -= 6; effects.shake = 0.5; }
        else { player.health -= 6 * dt * 10; effects.flashRed = 0.2; }
        addHeat(0.02);
      }
    }
    // car-to-car collisions (the player's car is already one of `cars`)
    const all = [...cars, ...police];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const rel = collideCars(all[i], all[j]);
      if (rel > 190) { game.events |= 64; if (all[i] === player.car || all[j] === player.car) { effects.shake = 0.6; crimeWitnessed(pos.x, pos.y, 0.5); } }
    }
    for (let i = effects.skids.length - 1; i >= 0; i--) { effects.skids[i].t -= dt; if (effects.skids[i].t <= 0) effects.skids.splice(i, 1); }
    for (let i = effects.puffs.length - 1; i >= 0; i--) { const f = effects.puffs[i]; f.t -= dt; f.r += dt * 16; if (f.t <= 0) effects.puffs.splice(i, 1); }
    if (effects.skids.length > 220) effects.skids.splice(0, effects.skids.length - 220);

    // --- combat ---
    const cev = combat.step(dt, game, aimWorld ? { ...aimWorld, shooting: input.shooting() } : null);
    game.events |= cev;
    if (cev & EV_PED_DOWN) crimeWitnessed(pos.x, pos.y, 1.4);

    // --- wanted decay & busted ---
    const seen = policeSees(police, pos);
    if (seen) game.unseenT = 0; else game.unseenT += dt;
    if (game.unseenT > 7 && game.wanted > 0) {
      game.heat = Math.max(0, game.heat - dt * 0.14);
      game.wanted = Math.min(game.wanted, Math.max(0, Math.ceil(game.heat - 0.6)));
      if (game.heat <= 0.05) { game.wanted = 0; game.heat = 0; }
    }
    const speedNow = player.car ? Math.abs(player.car.speed) : (Math.hypot(input.axis().x, input.axis().y) > 0 ? PLAYER.walk : 0);
    let copClose = false;
    for (const car of police) { const dx = pos.x - car.x, dy = pos.y - car.y; if (dx * dx + dy * dy < 95 * 95) copClose = true; }
    if (copClose && speedNow < 40 && game.wanted > 0) game.bustedMeter = Math.min(1, game.bustedMeter + dt * 0.45);
    else game.bustedMeter = Math.max(0, game.bustedMeter - dt * 0.3);
    if (game.bustedMeter >= 1) { game.overReason = 'BUSTED'; game.screen = SCREEN_OVER; game.events |= 256; }
    if (player.health <= 0) { player.health = 0; game.overReason = 'WASTED'; game.screen = SCREEN_OVER; game.events |= 512; }

    // --- missions ---
    const stepDef = missions.currentStep();
    if (stepDef && stepDef.kind === 'steal' && !game.markedCar) {
      const coupe = makeCar(CAR_TYPES[2], stepDef.at.x + 60, stepDef.at.y + 20, 0);
      coupe.parked = true; coupe.marked = true; cars.push(coupe); game.markedCar = coupe;
    }
    missions.update(dt, {
      distTo: (s) => Math.hypot(pos.x - s.at.x, pos.y - s.at.y),
      inMarkedCar: !!game.markedCar && player.car === game.markedCar,
      inAnyCar: !!player.car,
      wanted: game.wanted,
      pay: (n) => { game.cash += n; game.events |= 1024; save(); },
      setHeat: (n) => addHeat(n),
    }, random);
    if (missions.state.storyDone) { /* side jobs keep spawning inside missions */ }
    void STEP; void WORLD; void isRoad;
    return game.events;
  }

  return { game, step, tryEnterExit, respawn, save, loadSave, applySave, playerPos };
}
