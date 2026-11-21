// HUD for Solmar City: health, cash, wanted stars, mission objective and
// dialogue, vehicle speed, busted meter and hints — drawn in screen space.
import { FONT, PALETTE } from './config.js';

export function drawHud(ctx, game, w, h) {
  const p = game.player;
  ctx.save();
  ctx.font = `600 15px ${FONT}`;
  // Top-left panel: health + cash
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(14, 14, 228, 64);
  ctx.fillStyle = '#37474f'; ctx.fillRect(26, 26, 204, 14);
  ctx.fillStyle = p.health > 30 ? PALETTE.good : PALETTE.danger;
  ctx.fillRect(26, 26, 204 * Math.max(0, p.health) / 100, 14);
  ctx.fillStyle = PALETTE.text; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`$${game.cash}`, 26, 68);
  if (p.car) ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.22)} mph · ${p.car.type.name}`, 110, 68);
  else ctx.fillText(p.car ? '' : 'On foot', 110, 68);
  // Wanted stars top-right
  ctx.font = `26px ${FONT}`; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < game.wanted ? PALETTE.accent : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', w - 20 - (4 - i) * 28, 42);
  }
  // Busted meter
  if (game.bustedMeter > 0.02) {
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(w / 2 - 130, 58, 260, 20);
    ctx.fillStyle = PALETTE.danger; ctx.fillRect(w / 2 - 124, 63, 248 * game.bustedMeter, 10);
    ctx.fillStyle = PALETTE.text; ctx.font = `700 13px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('BUSTED', w / 2, 53);
  }
  // Objective bar bottom-centre
  ctx.font = `600 15px ${FONT}`;
  const obj = game.missions.objectiveText();
  const tw = ctx.measureText(obj).width;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(w / 2 - tw / 2 - 16, h - 48, tw + 32, 32);
  ctx.fillStyle = PALETTE.accent; ctx.textAlign = 'center';
  ctx.fillText(obj, w / 2, h - 27);
  // Dialogue line above the objective
  const ms = game.missions.state;
  if (ms.dialogueT > 0 && ms.dialogue) {
    ctx.font = `italic 15px ${FONT}`;
    const dw = Math.min(w - 80, ctx.measureText(ms.dialogue).width);
    ctx.fillStyle = 'rgba(16,20,28,0.75)';
    ctx.fillRect(w / 2 - dw / 2 - 14, h - 92, dw + 28, 30);
    ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
    ctx.fillText(ms.dialogue, w / 2, h - 71, w - 100);
  }
  // Context hint
  ctx.font = `13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(p.car ? 'E exit · Space handbrake · WASD drive' : 'WASD move · Shift run · E enter car · Click/F shoot · P pause · M mute', 16, h - 20);
  if (game.muted) { ctx.textAlign = 'right'; ctx.fillText('MUTED', w - 16, h - 20); }
  ctx.restore();
}
