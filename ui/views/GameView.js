// ui/views/GameView.js
// Slim orchestrator  delegates rendering to focused renderer modules.
//
// Module map:
//   ui/renderers/tile-renderer.js     Map tiles + block-destruction animation
//   ui/renderers/bomb-renderer.js     Bomb pump + explosion sprites
//   ui/renderers/powerup-renderer.js  Power-up items + pickup flash
//   ui/renderers/player-renderer.js   Player sprites, effects, name tags

import { renderTiles, renderBlockDestruction } from "../renderers/tile-renderer.js";
import { renderBombs, renderExplosions } from "../renderers/bomb-renderer.js";
import { renderPowerUps, renderPickupFlashes } from "../renderers/powerup-renderer.js";
import { renderPlayers } from "../renderers/player-renderer.js";
import { ensureTilesetInfo } from "../helpers/tiles.js";
import { MAP_COLS, MAP_ROWS } from "../../shared/constants.js";

export function GameView(options) {
  const {
    map,
    players = [],
    bombs = [],
    explosions = [],
    destroyingBlocks = [],
    powerUps = [],
    pickupFlashes = [],
    cellSize = 24,
    mapScale = 1.6,
    tilesetUrl = "./assets/images/TileSets.png",
    playerSpriteUrl = "./assets/images/PlayerTest.png",
    powerUpSpriteUrl = "./assets/images/PowerUps.png",
    tileSrcSize = 16,
    tileSpacing = 1,
    tilesPerRow: tilesPerRowOpt = undefined,
    playerScale = 1.6,
    localPlayerId = null,
  } = options || {};

  const grid = (map && map.grid) || [];
  const rows = (map && (map.height || grid.length)) || MAP_ROWS;
  const cols = (map && (map.width || (grid[0] && grid[0].length))) || MAP_COLS;
  const displayedCell = Math.max(
    1,
    Math.round(cellSize * (typeof mapScale === "number" ? mapScale : 1)),
  );

  // Ensure tileset info is loaded/cached
  ensureTilesetInfo(tilesetUrl, tileSrcSize, tileSpacing);

  // Delegate to renderers
  const tileNodes = renderTiles(grid, rows, cols, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt);
  const blockDestroyNodes = renderBlockDestruction(destroyingBlocks, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt);
  const bombNodes = renderBombs(bombs, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt);
  const explosionNodes = renderExplosions(explosions, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt);
  const powerUpNodes = renderPowerUps(powerUps, displayedCell, powerUpSpriteUrl);
  const pickupFlashNodes = renderPickupFlashes(pickupFlashes, displayedCell);
  const playerNodes = renderPlayers(players, displayedCell, playerSpriteUrl, playerScale, localPlayerId);

  // Assemble
  const wrapperStyle = `position:relative;width:${cols * displayedCell}px;height:${rows * displayedCell}px;background:transparent;overflow:hidden;`;

  return {
    tag: "div",
    attrs: { style: wrapperStyle, id: "game-map-root" },
    children: [
      ...tileNodes,
      ...blockDestroyNodes,
      ...powerUpNodes,
      ...bombNodes,
      ...explosionNodes,
      ...playerNodes,
      ...pickupFlashNodes,
    ],
  };
}
