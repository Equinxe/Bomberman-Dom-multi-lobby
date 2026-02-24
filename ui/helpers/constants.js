// Re-export shared constants so existing imports keep working
export {
  PLAYER_COLORS,
  POWERUP_TYPE_KEYS,
  POWERUP_DROP_CHANCE,
  PLAYER_HITBOX_SIZE,
} from "../../shared/constants.js";

// PlayerTest.png layout (pixel-verified): 456×592, green background removed
// Grid: 19 cols × 18 rows, cell = 24×32 px, NO margin, NO gaps
// Col stride = 24px, Row stride = 32px
// Art within each cell: ~5px left pad, 13px top pad, 14-16px wide, 19px tall
// CSS formula: bgPosX = -(col*24*zoom), bgPosY = -(row*32*zoom)
// Display size per cell = 24*zoom × 32*zoom
//
// Player color rows (pixel-verified, 8 rows):
//   Row 0 = White, Row 1 = Green, Row 2 = Red, Row 3 = Cyan,
//   Row 4 = Yellow, Row 5 = Blue, Row 6 = Pink, Row 7 = Black
// Walk frames per row: cols 0-1-2 (down), 3-4-5 (up), 6-7-8 (right)
// Left = mirror of right

// SPRITE_ROWS maps color index → row in the spritesheet
// Color index matches PLAYER_COLORS order in shared/constants.js
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

export const SPRITE_WIDTH = 24; // cell width in the spritesheet
export const SPRITE_HEIGHT = 32; // cell height in the spritesheet (row stride)
export const SPRITE_SIZE = 24; // kept for backward compat (width)
export const SPRITE_ZOOM = 3;
export const SHEET_WIDTH = 456;
export const SHEET_HEIGHT = 592;

// Player sprite sheet grid constants — no margin, no gaps
export const PLAYER_SHEET_MARGIN = 0;
export const PLAYER_SHEET_COL_GAP = 0;
export const PLAYER_SHEET_ROW_GAP = 0;
export const PLAYER_SHEET_COL_STRIDE = 24; // = SPRITE_WIDTH (no gap)
export const PLAYER_SHEET_ROW_STRIDE = 32; // = SPRITE_HEIGHT (row stride, verified)

// Legacy aliases
export const PLAYER_SHEET_SPACING = PLAYER_SHEET_COL_GAP;
export const PLAYER_SHEET_STRIDE = PLAYER_SHEET_COL_STRIDE;

// ✅ Animation configuration for each direction
// PlayerTest.png walk frames: 0-1-2 (down), 3-4-5 (up), 6-7-8 (right)
// Walk cycle: idle(0) → walkA(1) → idle(0) → walkB(2) for smooth leg alternation
// Left = mirror of right frames
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

// Animation timing
export const ANIMATION_SPEED = 120; // ms per frame (faster for smoother walk)

// ============= BOMB & EXPLOSION SPRITE CONSTANTS =============
// TileSets.png: 679x373, 40 cols × 22 rows, tile=16px, gap=1px, stride=17px
// Background color: magenta (255,0,220) = treat as transparent

// Bomb sprites in TileSets.png - Row 6
// Dark bomb: cols 0,1,2 (3 frames: small, medium, large pump)
// Bright/flash bomb: cols 4,5,6,7
// Pattern repeats every 8 cols for different bomb variants
export const BOMB_SPRITE = {
  row: 6,
  // Bomb animation: C32, C33, C34 (3 frames pump before explosion)
  frames: [32, 33, 34],
};

// Explosion sprites (verified by pixel analysis)
// Center: R6 C35-C39 = 5 frames of center explosion
// Directional pieces depend on distance from center:
//   distance 1-2 from center (body): R8
//   distance 3 from center (tip):
//     Top tip:    R7 (C32-C35 range)
//     Bottom tip: R9 (C32-C35 range)
//     Left tip:   R7 (C36-C39 range)
//     Right tip:  R9 (C36-C39 range)
// Vertical pieces use C32-C35, horizontal pieces use C36-C39
export const EXPLOSION_SPRITES = {
  // Center frames: R6 C35→C39 (5 frames)
  center: {
    row: 6,
    cols: [35, 36, 37, 38, 39],
  },
  // Body pieces (distance 1 and 2 from center) — always R8
  // 5 frames to match center: C32→C33→C34→C35→C32 (return to first)
  body: {
    vertical: { row: 8, cols: [32, 33, 34, 35, 32] }, // up/down body
    horizontal: { row: 8, cols: [36, 37, 38, 39, 36] }, // left/right body
  },
  // Tip pieces (distance 3 = farthest from center)
  // 5 frames to match center: C32→C33→C34→C35→C32 (return to first)
  tip: {
    top: { row: 7, cols: [32, 33, 34, 35, 32] },
    bottom: { row: 9, cols: [32, 33, 34, 35, 32] },
    left: { row: 7, cols: [36, 37, 38, 39, 36] },
    right: { row: 9, cols: [36, 37, 38, 39, 36] },
  },
  // Explosion radius: center + 3 cells each direction
  radius: 3,
};

// Tileset constants
export const TILESET_BG_COLOR = { r: 255, g: 0, b: 220 }; // Magenta = transparent
export const PLAYER_BG_COLOR = { r: 0, g: 128, b: 255 }; // Blue = transparent

// ============= POWER-UP CONSTANTS =============
// PowerUps.png: 112x160 (pixel-verified)
//   - Magenta (255,0,255) margin: 8px on all sides
//   - 2 columns x 9 rows of 16x16 sprites (we only use Col 0)
//   - Col 0 starts at x=8  (light blue bg: rgb(66,162,231) border, rgb(99,130,231) inner)
//   - Col 1 starts at x=24 (dark blue bg:  rgb(66,0,132))
//   - Each row: y = 8 + rowIndex * 16, no gap between sprites
//   - Content beyond col 1 (x>=40) is extra decorations, ignored
//
// Sprite order (Col 0):
// Row 0 (y= 8): Fire Up (flames+)
// Row 1 (y=24): Bomb Up (bombs+)
// Row 2 (y=40): Speed Up (roller)
// Row 3 (y=56): Remote Control (detonator)
// Row 4 (y=72): Bomb Pass
// Row 5 (y=88): Live Up (extra life)
// Row 6 (y=104): Block Pass (wall pass)
// Row 7 (y=120): Vest (invincibility)
// Row 8 (y=136): Skull (curse)

export const POWERUP_SPRITE = {
  sheetUrl: "./assets/images/PowerUps.png",
  sheetWidth: 112,
  sheetHeight: 160,
  spriteSize: 16, // each sprite is 16x16
  marginX: 8, // left margin before first col sprite
  marginY: 8, // top margin before first row sprite
  colStride: 16, // col 0 to col 1 = 16px apart (no gap)
  rowStride: 16, // row 0 to row 1 = 16px apart (no gap)
  cols: 2, // 2 color variants
  rows: 9, // 9 power-up types
  // Blue background colors to make transparent (pixel-verified)
  bgColors: [
    { r: 66, g: 162, b: 231 }, // col 0 border blue
    { r: 99, g: 130, b: 231 }, // col 0 inner fill blue
    { r: 66, g: 0, b: 132 }, // col 1 dark blue border
  ],
};

// Power-up type definitions - Col 0, pixel-verified row indices
// srcX = marginX = 8  (Col 0)
// srcY = marginY + row * 16
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
