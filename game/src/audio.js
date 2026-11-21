// Procedural WebAudio sound for Solmar City: no audio files, only oscillators
// and filtered noise. Engine hum, police siren, gunshots, blips and a calm
// ambient chord loop. Audio starts on the first user gesture; M mutes.
export function createAudio() {
  let ctx = null, master = null, muted = false;
  let engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, musicTimer = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
      const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 300;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(ef); ef.connect(engineGain); engineGain.connect(master); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 800;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
      return true;
    } catch { return false; }
  }
  function blip(freq, dur, type = 'sine', vol = 0.2, slide = 0) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  const CHORDS = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    isMuted() { return muted; },
    update(dt, opts) {
      if (!ctx) return;
      const t = ctx.currentTime;
      if (engineGain) engineGain.gain.value = opts.driving ? 0.05 + Math.abs(opts.speed) / 6000 : 0;
      if (engineOsc && opts.driving) engineOsc.frequency.value = 55 + Math.abs(opts.speed) * 0.35;
      if (sirenGain) sirenGain.gain.value = opts.wanted > 0 && opts.playing ? 0.035 : 0;
      if (sirenOsc && opts.wanted > 0) sirenOsc.frequency.value = 750 + Math.sin(t * 5) * 180;
      musicTimer -= dt;
      if (opts.playing && musicTimer <= 0) {
        musicTimer = 3.6;
        const chord = CHORDS[Math.floor(t / 3.6) % CHORDS.length];
        for (const f of chord) blip(f, 3.2, 'sine', 0.035);
      }
    },
    shoot() { noise(0.12, 0.5, 900); blip(160, 0.1, 'square', 0.25, -100); },
    hit() { noise(0.08, 0.3, 500); },
    crash() { noise(0.3, 0.6, 240); blip(70, 0.3, 'sine', 0.4, -30); },
    pickup() { blip(660, 0.1, 'sine', 0.25); setTimeout(() => blip(990, 0.14, 'sine', 0.25), 70); },
    cash() { blip(880, 0.09, 'triangle', 0.3); setTimeout(() => blip(1320, 0.16, 'triangle', 0.3), 80); },
    door() { blip(220, 0.08, 'square', 0.15); },
    busted() { blip(392, 0.3, 'sawtooth', 0.2, -150); },
  };
}
