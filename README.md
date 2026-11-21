# solmar-city-game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/KJ0078/solmar-city-game/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/KJ0078/solmar-city-game/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar City** is an original top-down open-world crime game that plays offline in a desktop browser from static files — no build step, no network requests, everything drawn on canvas with procedural WebAudio sound.

Explore a sun-soaked coastal city — avenues and named blocks (Seabreeze Diner, Banco Solmar, Palms Motel, Solmar PD, St. Lucia Medical), a marina and beach on the east shore — on foot and by car. Steal parked cars, weave through live traffic, and work a five-job story for marina boss **Marisol Vega**: a dock pickup, a timed delivery, a marked coupe to lift, a police heat-shake, and a three-drop finale to her boat. Get caught and the busted meter fills; get away and the heat cools. After the story, endless package runs keep the cash coming.

Features: traffic AI and fleeing pedestrians · five car types with different speed/handling · a 0–5 star wanted system with chasing, ramming police who shoot back at high heat · pistol combat with mouse aim · HUD with health, cash, stars, objective and speed · a live minimap (roads, traffic, police, mission marker) · start/pause/busted/wasted screens · progress saved to localStorage with Continue · a slow day cycle from golden morning to lit night streets · skid marks, exhaust puffs, crash shake, headlights and streetlight glow at dusk.

## Controls

- **WASD / arrows** — walk, or drive · **Shift** — run
- **E** — steal / enter a car, exit a car · **Space** — handbrake
- **Mouse** — aim · **Click or F** — shoot pistol (on foot)
- **P / Esc** — pause · **M** — mute · **Enter** — start / continue · **N** — new game

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser (Chrome is easiest). To hand the game in as an entry, run `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` — it validates the four screenshots, copies `game/` and `screenshots/` to `out/`, and writes `out/dossier.json`.

The code is split by job under `game/src/`: `city.js` generates the deterministic city, `vehicles.js` drives traffic and car physics, `police.js` runs pursuits, `combat.js` handles gunfire, `missions.js` holds Marisol's story, `world.js` orchestrates the simulation and the wanted/save rules, and `render.js`, `hud.js` and `minimap.js` draw it. Screenshot scenes are deterministic via `?shot=city|driving|chase|marina&seed=1` (see `shots.json`).

---

Entered on [make.fun](https://make.fun/?ref=rbdf2sjb&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
