// Keyboard and mouse input for Solmar City: a held-key set, mouse position in
// screen space, a click queue, and one-shot action flags consumed once by the loop.
export const ACT_CONFIRM = 1;
export const ACT_PAUSE = 2;
export const ACT_ENTER = 4;
export const ACT_MUTE = 16;
export const ACT_NEWGAME = 32;

export function createInput(canvas) {
  const held = new Set();
  const mouse = { x: 0, y: 0, down: false };
  const clicks = [];
  let actions = 0;
  const flagFor = { Enter: ACT_CONFIRM, Space: ACT_CONFIRM, KeyP: ACT_PAUSE, Escape: ACT_PAUSE, KeyE: ACT_ENTER, KeyM: ACT_MUTE, KeyN: ACT_NEWGAME };

  window.addEventListener('keydown', (e) => {
    held.add(e.code);
    if (!e.repeat && flagFor[e.code]) actions |= flagFor[e.code];
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('pointerdown', (e) => {
    mouse.down = true;
    const r = canvas.getBoundingClientRect();
    clicks.push({ x: e.clientX - r.left, y: e.clientY - r.top });
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });

  return {
    held, mouse,
    axis() {
      const x = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      const y = (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    driving() {
      return {
        up: held.has('KeyW') || held.has('ArrowUp'),
        down: held.has('KeyS') || held.has('ArrowDown'),
        left: held.has('KeyA') || held.has('ArrowLeft'),
        right: held.has('KeyD') || held.has('ArrowRight'),
        brake: held.has('Space'),
      };
    },
    running() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    shooting() { return mouse.down || held.has('KeyF'); },
    takeActions() { const a = actions; actions = 0; return a; },
    takeClicks() { const c = clicks.slice(); clicks.length = 0; return c; },
  };
}
