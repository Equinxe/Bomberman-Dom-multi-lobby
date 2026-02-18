export const PLAYER_COLORS = [
  { name: "Blanc", code: "#fff" },
  { name: "Noir", code: "#222" },
  { name: "Rouge", code: "#ff525d" },
  { name: "Bleu", code: "#3daaff" },
  { name: "Vert", code: "#43ff8e" },
  { name: "Jaune", code: "#ffe854" },
];

// Players.png layout: 304x687, blue bg (0,128,255)
// margin=4px from edge to first sprite, sprite=24x24, gap=1px between sprites
// stride = 25px (24+1)
// Row indices map to Y positions: y = 4 + row * 25
// Rows 0-4: 24px tall (standard player sprites)
// Row 0 (y=4):  White down(3)+left(3)+up(3) = 9 walk frames + 1 extra
// Row 1 (y=29): White extra animations
// Row 2 (y=54): White extra
// Row 3 (y=79): Black down(3)+left(3)+up(3) = 9 walk frames + 1 extra
// Row 4 (y=104): Black extra
// Rows 5-6 are taller (48px) - death/special animations
// Row 7 (y=227): 32px tall
// Rows 8-16: 24px color variants
// Row 8  (y=260): color variant walk
// Row 9  (y=285): color variant walk
// Row 10 (y=310): color variant extra
// Row 11 (y=335): Red walk (down3+left3+up3+extra)
// Row 12 (y=360): Red extra
// Row 13 (y=385): Blue walk
// Row 14 (y=410): Blue extra
// Row 15 (y=435): Green walk
// Row 16 (y=460): Green extra
// Row 17 (y=485): Yellow walk (32px tall)

export const SPRITE_ROWS = [
  { row: 0, offsetY: 0 }, // Blanc  (y=4+0*25=4)
  { row: 3, offsetY: 0 }, // Noir   (y=4+3*25=79)
  { row: 11, offsetY: 6 }, // Rouge  (y=4+11*25+6=285 → actual y=335)
  { row: 13, offsetY: 6 }, // Bleu   (y=4+13*25+6=335 → actual y=385)
  { row: 15, offsetY: 6 }, // Vert   (y=4+15*25+6=385 → actual y=435)
  { row: 17, offsetY: 6 }, // Jaune  (y=4+17*25+6=435 → actual y=485)
];

export const SPRITE_SIZE = 24;
export const SPRITE_ZOOM = 3;
export const SHEET_WIDTH = 304; // ✅ Fixed: actual measured width
export const SHEET_HEIGHT = 687;

// Player sprite sheet grid constants
export const PLAYER_SHEET_MARGIN = 4; // px from edge to first sprite
export const PLAYER_SHEET_SPACING = 1; // px gap between sprites
export const PLAYER_SHEET_STRIDE = 25; // SPRITE_SIZE + SPACING

// Collision constants
export const PLAYER_HITBOX_SIZE = 0.6;

// ✅ Animation configuration for each direction
// The walk cycle in the sprite sheet is: idle, walkA, idle, walkB
// To make fluid animation: idle(0) → walkA(1) → idle(0) → walkB(2)
// This creates a proper left-right leg cycle
// xOffsets: per-cycle-frame pixel correction to center the character art
//   (some walkB frames are drawn shifted ~8px right in the sprite sheet)
export const PLAYER_ANIMATIONS = {
  down: {
    frames: [0, 1, 0, 2],
    xOffsets: [0, 0, 0, -8], // walkB (frame 2) is shifted +8px right, correct by -8
    idleFrame: 0,
  },
  left: {
    frames: [3, 4, 3, 5],
    xOffsets: [0, 0, 0, 0], // left frames are centered
    idleFrame: 3,
  },
  up: {
    frames: [6, 7, 6, 8],
    xOffsets: [0, 0, 0, -8], // walkB (frame 8) is shifted +8px right, correct by -8
    idleFrame: 6,
  },
  right: {
    frames: [3, 4, 3, 5],
    xOffsets: [0, 0, 0, 0],
    idleFrame: 3,
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

// Power-up types that can drop from blocks (gameplay-relevant ones)
export const POWERUP_TYPE_KEYS = [
  "flames",
  "bombs",
  "speed",
  "detonator",
  "wallpass",
];

// Probability that a destroyed block drops a power-up
export const POWERUP_DROP_CHANCE = 0.25; // 25%
