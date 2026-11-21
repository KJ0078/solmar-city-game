// Deterministic screenshot scenes for Solmar City, behind
// ?shot=city|driving|chase|marina&seed=1. Each scene builds the real game,
// stages a genuine state (traffic rolling, a car at speed, a live police
// chase, a marina mission moment) and steps the real simulation a fixed
// number of times, so the same seed always renders the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY } from './render.js';

function runSteps(world, n, inputStub, aim) {
  for (let i = 0; i < n; i++) world.step(STEP, inputStub, aim);
}
const idleInput = {
  axis: () => ({ x: 0, y: 0 }), driving: () => ({ up: false, down: false, left: false, right: false, brake: false }),
  running: () => false, shooting: () => false,
};
function driveInput(up) {
  return {
    axis: () => ({ x: 0, y: 0 }),
    driving: () => ({ up, down: false, left: false, right: false, brake: false }),
    running: () => false, shooting: () => false,
  };
}

export function stageShot(name, world) {
  const game = world.game;
  game.screen = SCREEN_PLAY;
  if (name === 'driving') {
    // Warm the traffic up first, then put the player behind the wheel of a
    // sedan on the long east-west street, throttle down, mid-block.
    runSteps(world, 50, idleInput, null);
    const car = game.cars.find((c) => c.parked) || game.cars[0];
    game.player.car = car; car.driver = 'player'; car.parked = false;
    car.x = 700; car.y = 1008; car.angle = 0; car.speed = 300;
    game.player.x = car.x; game.player.y = car.y;
    runSteps(world, 42, driveInput(true), null);
    car.speed = Math.max(240, car.speed); // the frame must read as speed
    game.player.aimAngle = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Three stars on the same street: player fleeing east, two interceptors
    // composed right on the tail for the final frame.
    runSteps(world, 40, idleInput, null);
    const car = game.cars.find((c) => c.parked) || game.cars[0];
    game.player.car = car; car.driver = 'player'; car.parked = false;
    car.x = 1150; car.y = 1008; car.angle = 0; car.speed = 260;
    game.player.x = car.x; game.player.y = car.y;
    game.addHeat(3.2);
    runSteps(world, 30, driveInput(true), null);
    for (let i = 0; i < game.police.length; i++) {
      const cop = game.police[i];
      cop.x = car.x - 120 - i * 95; cop.y = 1008 + (i % 2 ? 22 : -18);
      cop.angle = 0; cop.speed = 240;
    }
    runSteps(world, 16, driveInput(true), null);
    game.wanted = Math.max(3, game.wanted);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'marina') {
    // Golden hour at the marina: on foot by the dock, mission marker glowing.
    game.dayT = 0.52;
    game.player.x = 1900; game.player.y = 600; game.player.angle = 0.4;
    game.player.aimAngle = 0.4;
    game.missions.state.index = 0; game.missions.state.step = 1; // delivering to the marina
    runSteps(world, 70, idleInput, null);
    game.player.x = 1900; game.player.y = 600;
    return { screen: SCREEN_PLAY };
  }
  // 'city' (default): on foot downtown among traffic and pedestrians.
  game.player.x = 900; game.player.y = 560; game.player.angle = 0.8;
  game.player.aimAngle = 0.8;
  runSteps(world, 80, idleInput, null);
  game.player.x = 900; game.player.y = 560;
  return { screen: SCREEN_PLAY };
}
