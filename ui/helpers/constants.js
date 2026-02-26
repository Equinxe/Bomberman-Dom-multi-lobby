// Re-export shared constants
export {
  PLAYER_COLORS,
  POWERUP_TYPE_KEYS,
  POWERUP_DROP_CHANCE,
  PLAYER_HITBOX_SIZE,
  TEAMS,
  TEAM_INFO,
  TEAM_MAX_PLAYERS,
  GAME_MODES,
  GAME_MODE_INFO,
} from "../../shared/constants.js";

// PlayerTest.png layout: 456×592, 19 cols × 18 rows, cell = 24×32 px
// Color rows: 0=White, 1=Green, 2=Red, 3=Cyan, 4=Yellow, 5=Blue, 6=Pink, 7=Black
// Walk frames: cols 0-2 (down), 3-5 (up), 6-8 (right), left = mirror of right

export const SPRITE_ROWS = [
  { row: 0 }, // White
  { row: 1 }, // Green
  { row: 2 }, // Red
  { row: 3 }, // Cyan
  { row: 4 }, // Yellow
  { row: 5 }, // Blue
  { row: 6 }, // Pink
  { row: 7 }, // Black
];

export const SPRITE_WIDTH = 24;
export const SPRITE_HEIGHT = 32;
export const SPRITE_ZOOM = 3;
export const SHEET_WIDTH = 456;
export const SHEET_HEIGHT = 592;

export const PLAYER_SHEET_COL_STRIDE = 24;
export const PLAYER_SHEET_ROW_STRIDE = 32;

// Animation: walk cycle idle→walkA→idle→walkB
export const PLAYER_ANIMATIONS = {
  down: {
    frames: [0, 1, 0, 2],
    idleFrame: 0,
  },
  up: {
    frames: [3, 4, 3, 5],
    idleFrame: 3,
  },
  right: {
    frames: [6, 7, 6, 8],
    idleFrame: 6,
  },
  left: {
    frames: [6, 7, 6, 8],
    idleFrame: 6,
    mirror: true,
  },
};

export const ANIMATION_SPEED = 120;

// Bomb & explosion sprites (TileSets.png: 679x373, tile=16px, gap=1px, stride=17px)
export const BOMB_SPRITE = {
  row: 6,
  frames: [32, 33, 34],
};

// Explosion sprites (verified by pixel analysis)
// Explosion sprites: center R6 C35-39, body R8, tips R7/R9
export const EXPLOSION_SPRITES = {
  center: {
    row: 6,
    cols: [35, 36, 37, 38, 39],
  },
  body: {
    vertical: { row: 8, cols: [32, 33, 34, 35, 32] },
    horizontal: { row: 8, cols: [36, 37, 38, 39, 36] },
  },
  tip: {
    top: { row: 7, cols: [32, 33, 34, 35, 32] },
    bottom: { row: 9, cols: [32, 33, 34, 35, 32] },
    left: { row: 7, cols: [36, 37, 38, 39, 36] },
    right: { row: 9, cols: [36, 37, 38, 39, 36] },
  },
  radius: 3,
};

export const TILESET_BG_COLOR = { r: 255, g: 0, b: 220 };
export const PLAYER_BG_COLOR = { r: 0, g: 128, b: 255 };

// PowerUps.png: 112x160, 2 cols × 9 rows of 16x16 sprites, 8px margin
export const POWERUP_SPRITE = {
  sheetUrl: "./assets/images/PowerUps.png",
  sheetWidth: 112,
  sheetHeight: 160,
  spriteSize: 16,
  marginX: 8,
  marginY: 8,
  colStride: 16,
  rowStride: 16,
  cols: 2,
  rows: 9,
  bgColors: [
    { r: 66, g: 162, b: 231 },
    { r: 99, g: 130, b: 231 },
    { r: 66, g: 0, b: 132 },
  ],
};

// Power-up type definitions (Col 0, srcX=8, srcY=8+row*16)
export const POWERUP_TYPES = {
  flames: {
    row: 0,
    srcX: 8,
    srcY: 8,
    name: "Fire Up",
    emoji: "F",
    description: "+1 explosion range",
  },
  bombs: {
    row: 1,
    srcX: 8,
    srcY: 24,
    name: "Bomb Up",
    emoji: "B",
    description: "+1 max bomb",
  },
  speed: {
    row: 2,
    srcX: 8,
    srcY: 40,
    name: "Speed Up",
    emoji: "S",
    description: "+movement speed",
  },
  detonator: {
    row: 3,
    srcX: 8,
    srcY: 56,
    name: "Remote Ctrl",
    emoji: "D",
    description: "Remote detonate bombs (E)",
  },
  bombpass: {
    row: 4,
    srcX: 8,
    srcY: 72,
    name: "Bomb Pass",
    emoji: "P",
    description: "Walk through bombs",
  },
  liveup: {
    row: 5,
    srcX: 8,
    srcY: 88,
    name: "Live Up",
    emoji: "L",
    description: "+1 life",
  },
  wallpass: {
    row: 6,
    srcX: 8,
    srcY: 104,
    name: "Block Pass",
    emoji: "W",
    description: "Walk through blocks",
  },
  vest: {
    row: 7,
    srcX: 8,
    srcY: 120,
    name: "Vest",
    emoji: "V",
    description: "10s invincibility",
  },
  skull: {
    row: 8,
    srcX: 8,
    srcY: 136,
    name: "Skull",
    emoji: "X",
    description: "Random curse",
  },
};
