// Solmar City — entrypoint for the make.fun gta6-01 bounty (Node 22, standard
// library only). The game itself is this directory's game/ folder: plain static
// files a desktop browser loads fully offline (game/index.html plus its ES
// modules, no libraries, no network requests). Solmar City is an original
// top-down open-world crime game: a sun-soaked coastal city you explore on
// foot and by car, with traffic and pedestrians, cars to steal, a five-star
// wanted system with police who chase, ram and shoot back, pistol combat, a
// five-mission story for marina boss Marisol Vega plus endless side jobs, a
// HUD with a live minimap, procedural WebAudio sound, and a localStorage save.
//
// This program hands the entry in: it validates the screenshots, copies game/
// and screenshots/ from beside this file to the output directory, and writes
// dossier.json there with the vendored make.fun library (vendor/makefun-game.ts,
// copied from the kit unchanged).
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Solmar City ships exactly four screenshot scenes (city, driving, chase,
// marina). Refuse to hand in an entry whose screenshots are missing or
// incomplete rather than letting the scorer discover it.
const shotsDir = join(here, 'screenshots');
const shotFiles = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort()
  : [];
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`Solmar City needs 3-4 screenshots in screenshots/, found ${shotFiles.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`Solmar City handed in: ${shotFiles.length} screenshots (${shotFiles.join(', ')})`);
