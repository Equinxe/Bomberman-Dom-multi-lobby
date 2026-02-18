// Tile helpers extracted from GameView
// Provides tileIndexForCell, imgStyleForIndex and tileset cache setup

const TILE_INDICES = {
  wall: 33, // L0, C33 = Mur indestructible gris
  wallDark: 71, // L1, C31 = Variante sombre
  floor: 73, // ✅ L1, C33 = Sol vert (index 1*40+33 = 73)
  blockBase: 432, // ✅ L10, C32 = Bloc destructible brun (index 10*40+32 = 432)
  blockAnimStart: 433, // L10, C33 = Start of block breaking animation
  blockAnimEnd: 439, // L10, C39 = End of block breaking animation
};

export function tileIndexForCell(cell) {
  if (!cell && cell !== 0) return TILE_INDICES.floor;
  if (typeof cell === "string") {
    if (cell === "wall") return TILE_INDICES.wall;
    if (cell === "wallDark") return TILE_INDICES.wallDark;
    if (cell === "block") return TILE_INDICES.blockBase;
    if (cell === "floor") return TILE_INDICES.floor;
    return TILE_INDICES.floor;
  }
  if (typeof cell === "number") {
    if (cell === 0) return TILE_INDICES.wall;
    if (cell === 1) return TILE_INDICES.blockBase;
    return TILE_INDICES.floor;
  }
  if (typeof cell === "object" && cell.type) {
    if (cell.type === "block") return TILE_INDICES.blockBase;
    if (cell.type === "wallDark") return TILE_INDICES.wallDark;
    if (cell.type === "wall") return TILE_INDICES.wall;
    if (cell.type === "floor") return TILE_INDICES.floor;
  }
  return TILE_INDICES.floor;
}

// tileset cache shared across modules
window.__TILESET_INFO = window.__TILESET_INFO || {};

export function ensureTilesetInfo(
  tilesetUrl,
  tileSrcSize = 16,
  tileSpacing = 1,
) {
  const cache = window.__TILESET_INFO[tilesetUrl] || {};
  if (
    (!cache.naturalWidth || !cache.naturalHeight || !cache.tilesPerRow) &&
    !cache.loading
  ) {
    cache.loading = true;
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const stride = tileSrcSize + tileSpacing;
      // Use (nw + tileSpacing) / stride to account for last tile having no trailing spacing
      const tp = Math.max(1, Math.floor((nw + tileSpacing) / stride));
      window.__TILESET_INFO[tilesetUrl] = {
        naturalWidth: nw,
        naturalHeight: nh,
        tileSrcSize,
        tileSpacing,
        tilesPerRow: tp,
        loading: false,
      };
    };
    img.onerror = () => {
      window.__TILESET_INFO[tilesetUrl] = { loading: false };
      console.warn(`[tiles] failed to load tileset ${tilesetUrl}`);
    };
    img.src = tilesetUrl + (tilesetUrl.indexOf("?") === -1 ? "?_v=1" : "&_v=1");
  }
  return window.__TILESET_INFO[tilesetUrl] || {};
}

export function imgStyleForIndex(
  index,
  tilesetUrl,
  displayedCell,
  tileSrcSize = 16,
  tileSpacing = 1,
  tilesPerRowOpt = undefined,
  SHEET_WIDTH_OVERRIDE = undefined,
  SHEET_HEIGHT_OVERRIDE = undefined,
) {
  const cache = ensureTilesetInfo(tilesetUrl, tileSrcSize, tileSpacing);
  const naturalW = cache.naturalWidth || SHEET_WIDTH_OVERRIDE || 256;
  const tileStride = tileSrcSize + tileSpacing;
  const computedTilesPerRow =
    tilesPerRowOpt ||
    cache.tilesPerRow ||
    Math.max(1, Math.floor((naturalW + tileSpacing) / tileStride));
  const naturalH = cache.naturalHeight || SHEET_HEIGHT_OVERRIDE || 256;
  const scale = displayedCell / tileSrcSize;
  const imgScaledWidth = Math.round(naturalW * scale);
  const imgScaledHeight = Math.round(naturalH * scale);
  const tx = index % computedTilesPerRow;
  const ty = Math.floor(index / computedTilesPerRow);
  const x = -Math.round(tx * tileStride * scale);
  const y = -Math.round(ty * tileStride * scale);
  return `width: ${imgScaledWidth}px; height: ${imgScaledHeight}px; image-rendering: pixelated; display:block; transform-origin: 0 0; pointer-events:none; transform: translate(${x}px, ${y}px); border: none;`;
}

/**
 * Function for bomb/explosion sprites using row and column
 */
export function imgStyleForBombSprite(
  row,
  col,
  tilesetUrl,
  displayedCell,
  tileSrcSize = 16,
  tileSpacing = 1,
  tilesPerRow = 40,
) {
  const index = row * tilesPerRow + col;
  return imgStyleForIndex(
    index,
    tilesetUrl,
    displayedCell,
    tileSrcSize,
    tileSpacing,
    tilesPerRow,
    679, // TileSets.png width
    373, // TileSets.png height
  );
}
