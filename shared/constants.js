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

// ========== TEAM MODE (2v2) ==========
export const TEAMS = {
  NONE: 0, // Free-for-all (no team)
  ALPHA: 1, // Team Alpha (blue)
  BETA: 2, // Team Beta (red)
};

export const TEAM_INFO = {
  [0]: { name: "—", label: "FFA", color: "#888", glow: "transparent" },
  [1]: {
    name: "Alpha",
    label: "α",
    color: "#4d9fff",
    glow: "rgba(77,159,255,0.5)",
  },
  [2]: {
    name: "Beta",
    label: "β",
    color: "#ff6b6b",
    glow: "rgba(255,107,107,0.5)",
  },
};

// Maximum players per team
export const TEAM_MAX_PLAYERS = 2;

// ========== GAME MODES ==========
export const GAME_MODES = {
  FFA: "ffa", // Free-for-all (default)
  TEAM: "team", // 2v2 Team mode
};

export const GAME_MODE_INFO = {
  ffa: {
    name: "Free for All",
    short: "FFA",
    icon: "⚔",
    description: "Chacun pour soi",
  },
  team: {
    name: "Équipe 2v2",
    short: "2v2",
    icon: "🤝",
    description: "2 équipes de 2",
  },
};
