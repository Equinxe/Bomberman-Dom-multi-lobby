export const PLAYER_COLORS = [
  { name: "Blanc", code: "#fff" },
  { name: "Noir", code: "#222" },
  { name: "Rouge", code: "#ff525d" },
  { name: "Bleu", code: "#3daaff" },
  { name: "Vert", code: "#43ff8e" },
  { name: "Jaune", code: "#ffe854" },
];

export const SPRITE_ROWS = [
  { row: 0, offsetY: 0 }, // Blanc
  { row: 3, offsetY: 0 }, // Noir
  { row: 11, offsetY: 6 }, // Rouge
  { row: 13, offsetY: 6 }, // Bleu
  { row: 15, offsetY: 6 }, // Vert
  { row: 17, offsetY: 6 }, // Jaune
];

export const SPRITE_SIZE = 24;
export const SPRITE_ZOOM = 3;
export const SHEET_WIDTH = 303;
export const SHEET_HEIGHT = 687;

// Collision constants
export const PLAYER_HITBOX_SIZE = 0.6; // Player hitbox is 60% of a cell (centered)
