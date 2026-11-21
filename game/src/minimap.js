// Minimap for Solmar City: the whole city shrunk into a corner panel —
// roads, water, the player arrow, traffic and police dots, mission marker.
import { AVENUES, STREETS, WATER_X, WORLD } from './config.js';

export const MAP = { w: 216, h: 152, pad: 14 };

export function drawMinimap(ctx, game, w, h) {
  const x0 = w - MAP.w - MAP.pad, y0 = MAP.pad + 30;
  const sx = MAP.w / WORLD.width, sy = MAP.h / WORLD.height;
  ctx.save();
  ctx.fillStyle = 'rgba(20,30,24,0.88)';
  ctx.fillRect(x0 - 4, y0 - 4, MAP.w + 8, MAP.h + 8);
  ctx.fillStyle = '#79a85b'; ctx.fillRect(x0, y0, MAP.w, MAP.h);
  ctx.fillStyle = '#2e7fa8'; ctx.fillRect(x0 + WATER_X * sx, y0, MAP.w - WATER_X * sx, MAP.h);
  ctx.fillStyle = '#4a4a52';
  for (const ax of AVENUES) ctx.fillRect(x0 + (ax - 52) * sx, y0, 104 * sx, MAP.h);
  for (const sy2 of STREETS) ctx.fillRect(x0, y0 + (sy2 - 52) * sy, MAP.w, 104 * sy);
  const dot = (x, y, color, r = 2.4) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 + x * sx, y0 + y * sy, r, 0, Math.PI * 2); ctx.fill(); };
  for (const car of game.cars) if (car.driver === 'traffic') dot(car.x, car.y, '#e8e4d8', 1.6);
  for (const car of game.police) dot(car.x, car.y, '#5ea0ff', 3);
  const marker = game.missions.marker();
  if (marker) {
    const mx = x0 + marker.x * sx, my = y0 + marker.y * sy;
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(mx, my, 5 + Math.sin(game.time * 5) * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a5b00'; ctx.stroke();
  }
  // Player arrow
  const pos = game.player.car ? game.player.car : game.player;
  const ang = game.player.car ? game.player.car.angle : game.player.angle;
  ctx.translate(x0 + pos.x * sx, y0 + pos.y * sy); ctx.rotate(ang);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
