// Solmar City — tuning, palette and world constants in one place.
// A top-down coastal city of avenues and streets, drawn entirely on canvas.

export const STEP = 1 / 60;
export const WORLD = { width: 2400, height: 1680 };
export const ROAD_HALF = 52;
export const AVENUES = [264, 624, 984, 1344, 1704];
export const STREETS = [264, 624, 984, 1344];
export const WATER_X = 2064;
export const BEACH_X = 1930;

export const PLAYER = { radius: 13, walk: 168, run: 268, health: 100 };
export const SAVE_KEY = 'solmar-city.save.v1';

export const CAR_TYPES = [
  { name: 'Compact', w: 40, h: 20, max: 330, accel: 300, grip: 3.4, color: '#e0a458' },
  { name: 'Sedan', w: 46, h: 22, max: 380, accel: 330, grip: 3.1, color: '#7fb3d5' },
  { name: 'Coupe', w: 44, h: 21, max: 470, accel: 430, grip: 3.6, color: '#c94f6d' },
  { name: 'Pickup', w: 50, h: 24, max: 350, accel: 310, grip: 2.8, color: '#8bc34a' },
  { name: 'Van', w: 52, h: 25, max: 320, accel: 280, grip: 2.6, color: '#b0bec5' },
];
export const POLICE_TYPE = { name: 'Interceptor', w: 47, h: 22, max: 440, accel: 400, grip: 3.4, color: '#263238' };

export const PALETTE = {
  grass: '#79a85b', grassAlt: '#71a054', sidewalk: '#cfc8b8', kerb: '#b7b09c',
  road: '#4a4a52', roadLine: '#e8d27a', sand: '#ecd28f', water: '#2e7fa8',
  waterDeep: '#256b91', plaza: '#d8cfb4', park: '#6da34f',
  roofA: '#c96f4a', roofB: '#a8573c', roofC: '#d9a05b', roofD: '#8d6e63', roofE: '#78909c',
  text: '#ffffff', panel: 'rgba(16,20,28,0.88)', accent: '#ffd54f', danger: '#ef5350',
  good: '#7ee787', police: '#90caf9',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
