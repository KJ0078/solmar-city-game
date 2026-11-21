// Rendering for Solmar City: a camera that follows the player over the
// canvas-drawn city — roads, sidewalks, named buildings, beach and sea,
// palms and streetlights — plus cars, pedestrians, bullets and effects,
// a slow day-cycle tint, and the title / pause / busted / wasted screens.
import { AVENUES, BEACH_X, FONT, PALETTE, ROAD_HALF, STREETS, WATER_X, WORLD } from './config.js';
import { drawHud } from './hud.js';
import { drawMinimap } from './minimap.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const cam = { x: 0, y: 0 };
  function resize() {
    canvas.width = Math.round(window.innerWidth * (window.devicePixelRatio || 1));
    canvas.height = Math.round(window.innerHeight * (window.devicePixelRatio || 1));
  }
  window.addEventListener('resize', resize); resize();

  function dayTint(t) {
    // t in [0,1): warm morning, bright noon, golden dusk, blue night.
    const stops = [
      [0.0, 'rgba(255,170,80,0.10)'], [0.25, 'rgba(0,0,0,0)'], [0.5, 'rgba(255,140,50,0.16)'],
      [0.68, 'rgba(20,30,90,0.34)'], [0.85, 'rgba(10,16,60,0.38)'], [1.0, 'rgba(255,170,80,0.10)'],
    ];
    for (let i = 0; i < stops.length - 1; i++) if (t >= stops[i][0] && t <= stops[i + 1][0]) return stops[i][1];
    return 'rgba(0,0,0,0)';
  }
  function isNight(t) { return t > 0.62 && t < 0.92; }

  function drawCar(car, night) {
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    const w = car.type.w, h = car.type.h;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    ctx.fillStyle = car.type.color;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 6); ctx.fill();
    if (car.driver === 'police') {
      ctx.fillStyle = '#f5f5f5'; ctx.fillRect(-w * 0.18, -h / 2, w * 0.36, h);
      ctx.fillStyle = (Math.floor(performance.now() / 280) % 2) ? '#ef5350' : '#42a5f5';
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.fillStyle = 'rgba(20,30,40,0.85)';
    ctx.fillRect(-w * 0.08, -h * 0.36, w * 0.26, h * 0.72); // windshield/cabin
    ctx.fillRect(-w * 0.38, -h * 0.34, w * 0.14, h * 0.68);
    ctx.fillStyle = '#111'; // wheels
    for (const [wx, wy] of [[-w * 0.32, -h / 2 - 2], [w * 0.3, -h / 2 - 2], [-w * 0.32, h / 2 - 2], [w * 0.3, h / 2 - 2]]) ctx.fillRect(wx, wy, 10, 4);
    if (car.marked) { ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 8); ctx.stroke(); }
    if (night) { // headlights
      const g = ctx.createRadialGradient(w / 2, 0, 2, w / 2, 0, 74);
      g.addColorStop(0, 'rgba(255,240,180,0.5)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.fillRect(w / 2, -26, 78, 52);
    }
    if (car.health < 45) { ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.beginPath(); ctx.arc(-w * 0.2, 0, 8 + Math.random() * 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function drawWorld(game) {
    const city = game.city, t = game.time;
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // block checker for texture
    ctx.fillStyle = PALETTE.grassAlt;
    for (let gx = 0; gx < WORLD.width; gx += 240) for (let gy = 0; gy < WORLD.height; gy += 240) if ((gx + gy) % 480 === 0) ctx.fillRect(gx, gy, 240, 240);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(BEACH_X, 0, WATER_X - BEACH_X, WORLD.height);
    const wave = Math.sin(t * 1.4) * 6;
    ctx.fillStyle = PALETTE.waterDeep; ctx.fillRect(WATER_X, 0, WORLD.width - WATER_X, WORLD.height);
    ctx.fillStyle = PALETTE.water; ctx.fillRect(WATER_X + 14 + wave, 0, WORLD.width - WATER_X, WORLD.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let y = 40; y < WORLD.height; y += 110) { ctx.beginPath(); ctx.moveTo(WATER_X + 20 + Math.sin(t + y) * 8, y); ctx.lineTo(WORLD.width - 30, y + 14); ctx.stroke(); }
    // sidewalks: blocks get a pale border via slightly larger rects under buildings (drawn as plaza)
    ctx.fillStyle = PALETTE.sidewalk;
    for (const b of city.buildings) ctx.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
    // roads
    ctx.fillStyle = PALETTE.road;
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_HALF, 0, ROAD_HALF * 2, WORLD.height);
    for (const sy of STREETS) ctx.fillRect(0, sy - ROAD_HALF, BEACH_X + 40, ROAD_HALF * 2);
    ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 3; ctx.setLineDash([26, 22]);
    for (const ax of AVENUES) { ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, WORLD.height); ctx.stroke(); }
    for (const sy of STREETS) { ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(BEACH_X + 40, sy); ctx.stroke(); }
    ctx.setLineDash([]);
    // skid marks + exhaust
    ctx.fillStyle = 'rgba(30,30,30,0.35)';
    for (const s of game.effects.skids) ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    for (const f of game.effects.puffs) { ctx.fillStyle = 'rgba(230,230,230,0.4)'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    // buildings with names
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of city.buildings) {
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 3; ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      const rows = Math.max(1, Math.floor(b.h / 44));
      for (let r = 0; r < rows; r++) ctx.fillRect(b.x + 12, b.y + 16 + r * 44, b.w - 24, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.font = `600 ${b.w > 150 ? 14 : 11}px ${FONT}`;
      if (b.w > 64 && b.h > 36) ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 4, b.w - 8);
    }
    // trees and lights
    for (const tr of city.trees) {
      ctx.fillStyle = '#5d4037'; ctx.fillRect(tr.x - 2, tr.y - 2, 4, 8);
      ctx.fillStyle = tr.palm ? '#43a047' : '#2e7d32';
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(tr.x - 3, tr.y - 3, tr.r * 0.55, 0, Math.PI * 2); ctx.fill();
    }
    const night = isNight(game.dayT);
    for (const l of city.lights) {
      ctx.fillStyle = '#616161'; ctx.fillRect(l.x - 1, l.y - 1, 3, 3);
      if (night) { const g = ctx.createRadialGradient(l.x, l.y, 1, l.x, l.y, 30); g.addColorStop(0, 'rgba(255,220,130,0.55)'); g.addColorStop(1, 'rgba(255,220,130,0)'); ctx.fillStyle = g; ctx.fillRect(l.x - 30, l.y - 30, 60, 60); }
    }
    // mission marker pillar
    const marker = game.missions.marker();
    if (marker) {
      const bob = Math.sin(t * 4) * 8;
      ctx.fillStyle = 'rgba(255,213,79,0.25)'; ctx.fillRect(marker.x - 22, marker.y - 22, 44, 44);
      ctx.fillStyle = PALETTE.accent;
      ctx.beginPath(); ctx.moveTo(marker.x, marker.y - 44 + bob); ctx.lineTo(marker.x - 13, marker.y - 66 + bob); ctx.lineTo(marker.x + 13, marker.y - 66 + bob); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(marker.x, marker.y, 24 + Math.sin(t * 4) * 3, 0, Math.PI * 2); ctx.stroke();
    }
    // peds
    for (const ped of game.peds) {
      if (ped.dead) { ctx.fillStyle = 'rgba(120,40,40,0.7)'; ctx.beginPath(); ctx.ellipse(ped.x, ped.y, 13, 7, ped.angle, 0, Math.PI * 2); ctx.fill(); continue; }
      const bob = Math.sin(game.time * 10 + ped.x) * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(ped.x + 2, ped.y + 3, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ped.shirt; ctx.beginPath(); ctx.arc(ped.x, ped.y + bob * 0.3, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3, 4.6, 0, Math.PI * 2); ctx.fill();
      if (ped.hitT > 0) { ctx.fillStyle = 'rgba(239,83,80,0.6)'; ctx.beginPath(); ctx.arc(ped.x, ped.y, 11, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const car of game.cars) if (car !== game.player.car) drawCar(car, night);
    for (const car of game.police) drawCar(car, night);
    // player
    const p = game.player;
    if (p.car) drawCar(p.car, night);
    else {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 4, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, 13.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(p.x, p.y, 5.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.aimAngle || 0) * 17, p.y + Math.sin(p.aimAngle || 0) * 17); ctx.stroke();
    }
    // bullets + flashes
    ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 2.4;
    for (const b of game.combat.bullets) { ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (const f of game.combat.flashes) { ctx.fillStyle = 'rgba(255,200,60,0.9)'; ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, Math.PI * 2); ctx.fill(); }
  }

  function panel(title, lines, prompt, w, h) {
    ctx.fillStyle = 'rgba(10,14,20,0.55)'; ctx.fillRect(0, 0, w, h);
    const pw = Math.min(700, w - 60), ph = 150 + lines.length * 27;
    const x = (w - pw) / 2, y = (h - ph) / 2;
    ctx.fillStyle = PALETTE.panel; ctx.beginPath(); ctx.roundRect(x, y, pw, ph, 14); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.accent; ctx.font = `800 44px ${FONT}`;
    ctx.fillText(title, w / 2, y + 66);
    ctx.fillStyle = PALETTE.text; ctx.font = `16px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, w / 2, y + 108 + i * 27));
    ctx.fillStyle = PALETTE.accent; ctx.font = `700 18px ${FONT}`;
    ctx.fillText(prompt, w / 2, y + ph - 24);
  }

  function draw(game, screen, opts = {}) {
    const w = canvas.width, h = canvas.height;
    const pos = game.player.car ? game.player.car : game.player;
    cam.x += (pos.x - w / 2 - cam.x) * 0.16; cam.y += (pos.y - h / 2 - cam.y) * 0.16;
    if (opts.snap) { cam.x = pos.x - w / 2; cam.y = pos.y - h / 2; }
    cam.x = Math.max(0, Math.min(WORLD.width - w, cam.x)); cam.y = Math.max(0, Math.min(WORLD.height - h, cam.y));
    const shX = game.effects.shake > 0 ? (Math.random() - 0.5) * 12 * game.effects.shake : 0;
    const shY = game.effects.shake > 0 ? (Math.random() - 0.5) * 12 * game.effects.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#79a85b'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(-Math.round(cam.x + shX), -Math.round(cam.y + shY));
    drawWorld(game);
    ctx.restore();
    ctx.fillStyle = dayTint(game.dayT); ctx.fillRect(0, 0, w, h);
    if (game.effects.flashRed > 0) { ctx.fillStyle = `rgba(220,40,40,${game.effects.flashRed * 0.5})`; ctx.fillRect(0, 0, w, h); }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) { drawHud(ctx, game, w, h); drawMinimap(ctx, game, w, h); }
    if (screen === SCREEN_TITLE) {
      panel('SOLMAR CITY', [
        'A sun-soaked coastal city of fast cars and bad decisions.',
        'Marisol Vega runs the marina — and she is hiring.',
        'Work her five jobs, dodge the Solmar PD, get rich or get busted.',
        '', 'Controls: WASD move/drive · Shift run · E enter/exit car',
        'Mouse aim, click or F to shoot · Space handbrake · P pause · M mute',
        opts.hasSave ? 'ENTER / click: Continue your saved game · N: New game' : '',
      ], opts.hasSave ? 'Press ENTER to continue' : 'Press ENTER or click to start', w, h);
    } else if (screen === SCREEN_PAUSED) panel('PAUSED', ['Solmar City waits for no one. Except now.'], 'Press P or Esc to resume', w, h);
    else if (screen === SCREEN_OVER) {
      const reason = game.overReason === 'BUSTED' ? 'BUSTED' : 'WASTED';
      panel(reason, [
        reason === 'BUSTED' ? 'The Solmar PD haul you in. Bail and fines cost you.' : 'You wake up outside St. Lucia Medical, lighter of pocket.',
        `Cash: $${game.cash} · Story progress is saved.`,
      ], 'Press ENTER to get back on the street', w, h);
    }
    return { camX: cam.x, camY: cam.y };
  }
  return { draw, cam };
}
