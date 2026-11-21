// Boot and main loop for Solmar City: fixed-step simulation, screen flow
// (title → play → paused / busted / wasted), car entry, shooting, sound
// triggers, autosave, and the ?shot= staging used for screenshots.
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { ACT_CONFIRM, ACT_ENTER, ACT_MUTE, ACT_NEWGAME, ACT_PAUSE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const game = world.game;
const renderer = createRenderer(canvas);
const audio = createAudio();

if (shot) {
  const scene = stageShot(shot, world);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, { snap: true, hasSave: false });
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let hasSave = !!world.loadSave();
  let accumulator = 0, last = performance.now(), saveT = 0;
  game.screen = SCREEN_TITLE;
  const announce = (m) => { status.textContent = m; };

  function startGame(fresh) {
    if (fresh) {
      try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      game.cash = 50; game.missions.state.index = 0; game.missions.state.storyDone = false;
      game.player.x = 984; game.player.y = 470;
    } else if (hasSave) world.applySave(world.loadSave());
    screen = SCREEN_PLAY; game.screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Solmar City.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const clicks = input.takeClicks();
    if (actions & ACT_MUTE) { game.muted = audio.toggleMute(); }
    if (screen === SCREEN_TITLE) {
      if (actions & ACT_NEWGAME) startGame(true);
      else if ((actions & ACT_CONFIRM) || clicks.length) startGame(false);
    } else if (screen === SCREEN_OVER) {
      if ((actions & ACT_CONFIRM) || clicks.length) { world.respawn(game.overReason === 'BUSTED' ? 'busted' : 'wasted'); screen = SCREEN_PLAY; }
    } else if (actions & ACT_PAUSE) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      game.screen = screen;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACT_ENTER) { if (world.tryEnterExit()) audio.door(); }
      // Build the aim point in world space from the last camera.
      const cam = renderer.cam;
      const aim = { x: cam.x + input.mouse.x, y: cam.y + input.mouse.y };
      game.player.aimAngle = Math.atan2(aim.y - game.player.y, aim.x - game.player.x);
      game.player.aimX = aim.x; game.player.aimY = aim.y;
      while (accumulator >= STEP) {
        const ev = world.step(STEP, input, aim);
        accumulator -= STEP;
        if (ev & 1) audio.shoot();
        if (ev & 64) audio.crash();
        if (ev & 128) audio.hit();
        if (ev & 1024) audio.cash();
        if (game.screen === SCREEN_OVER) { screen = SCREEN_OVER; audio.busted(); world.save(); break; }
      }
      saveT += 1 / 60;
      if (saveT > 6) { saveT = 0; world.save(); }
      const pos = world.playerPos();
      audio.update(1 / 60, { driving: !!game.player.car, speed: game.player.car ? game.player.car.speed : 0, wanted: game.wanted, playing: true });
      void pos;
    } else accumulator = 0;
    renderer.draw(game, screen, { hasSave });
  }
  announce('Solmar City. Press Enter to start.');
  requestAnimationFrame(frame);
}
