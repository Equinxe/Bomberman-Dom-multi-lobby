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
// Matches PlayerTest.png row order (pixel-verified):
//   Row 0 = White, Row 1 = Green, Row 2 = Red, Row 3 = Cyan,
//   Row 4 = Yellow, Row 5 = Blue, Row 6 = Pink, Row 7 = Black
export const PLAYER_COLORS = [
  { name: "Blanc", code: "#e0e0e0", hex: "#e0e0e0" },
  { name: "Vert", code: "#00c000", hex: "#00c000" },
  { name: "Rouge", code: "#a02000", hex: "#c03000" },
  { name: "Cyan", code: "#00e0c0", hex: "#00d4b0" },
  { name: "Jaune", code: "#e0e000", hex: "#e0c000" },
  { name: "Bleu", code: "#0060e0", hex: "#0060e0" },
  { name: "Rose", code: "#e080c0", hex: "#e080c0" },
  { name: "Noir", code: "#404040", hex: "#404040" },
];

// Standard map dimensions
export const MAP_COLS = 15;
export const MAP_ROWS = 13;

// Player hitbox size (fraction of a cell)
// Art is ~16px wide in a 24px cell = 0.67, but use slightly smaller for forgiving gameplay
export const PLAYER_HITBOX_SIZE = 0.5;
