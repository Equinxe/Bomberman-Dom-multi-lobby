// shared/constants.js
// Constants shared between server and client to avoid duplication.

// Power-up types that can drop from blocks (gameplay-relevant ones)
export const POWERUP_TYPE_KEYS = [
  "flames",
  "bombs",
  "speed",
  "detonator",
  "wallpass",
  "liveup",
  "vest",
  "skull",
];

// Probability that a destroyed block drops a power-up
export const POWERUP_DROP_CHANCE = 0.25; // 25%

// Player colors used throughout the game
export const PLAYER_COLORS = [
  { name: "Blanc", code: "#fff", hex: "#ffffff" },
  { name: "Noir", code: "#222", hex: "#000000" },
  { name: "Rouge", code: "#ff525d", hex: "#ff3b3b" },
  { name: "Bleu", code: "#3daaff", hex: "#2d9cff" },
  { name: "Vert", code: "#43ff8e", hex: "#2ecc71" },
  { name: "Jaune", code: "#ffe854", hex: "#ffd166" },
];

// Standard map dimensions
export const MAP_COLS = 15;
export const MAP_ROWS = 13;

// Player hitbox size (fraction of a cell)
export const PLAYER_HITBOX_SIZE = 0.6;
