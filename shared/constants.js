// shared/constants.js

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

export const POWERUP_DROP_CHANCE = 0.25;

// Player colors (matches PlayerTest.png row order)
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

export const MAP_COLS = 15;
export const MAP_ROWS = 13;

export const PLAYER_HITBOX_SIZE = 0.5;

// Team mode
export const TEAMS = {
  NONE: 0,
  ALPHA: 1,
  BETA: 2,
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

export const TEAM_MAX_PLAYERS = 2;

// Game modes
export const GAME_MODES = {
  FFA: "ffa",
  TEAM: "team",
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
