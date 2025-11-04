// Tile helpers extracted from GameView
// Provides tileIndexForCell, imgStyleForIndex and tileset cache setup

const TILE_INDICES = {
  wall: 33,
  wallDark: 71,
  floor: 72,
  blockBase: 422,
  blockAnimStart: 422,
  blockAnimEnd: 429,
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

export function ensureTilesetInfo(tilesetUrl, tileSrcSize = 16, tileSpacing = 1) {
  const cache = window.__TILESET_INFO[tilesetUrl] || {};
  if ((!cache.naturalWidth || !cache.naturalHeight || !cache.tilesPerRow) && !cache.loading) {
    cache.loading = true;
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const stride = tileSrcSize + tileSpacing;
      const tp = Math.max(1, Math.floor(nw / stride));
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
    img.src = tilesetUrl + (tilesetUrl.indexOf('?') === -1 ? '?_v=1' : '&_v=1');
  }
  return window.__TILESET_INFO[tilesetUrl] || {};
}

export function imgStyleForIndex(index, tilesetUrl, displayedCell, tileSrcSize = 16, tileSpacing = 1, tilesPerRowOpt = undefined, SHEET_WIDTH_OVERRIDE = undefined, SHEET_HEIGHT_OVERRIDE = undefined) {
  const cache = ensureTilesetInfo(tilesetUrl, tileSrcSize, tileSpacing);
  const naturalW = cache.naturalWidth || SHEET_WIDTH_OVERRIDE || 256;
  const tileStride = tileSrcSize + tileSpacing;
  const computedTilesPerRow = tilesPerRowOpt || cache.tilesPerRow || Math.max(1, Math.floor(naturalW / tileStride));
  const scale = displayedCell / tileSrcSize;
  const imgScaledWidth = Math.round((naturalW) * scale);
  const tx = index % computedTilesPerRow;
  const ty = Math.floor(index / computedTilesPerRow);
  const x = -Math.round(tx * tileStride * scale);
  const y = -Math.round(ty * tileStride * scale);
  return `width: ${imgScaledWidth}px; height: auto; image-rendering: pixelated; display:block; transform-origin: 0 0; pointer-events:none; transform: translate(${x}px, ${y}px); border: none;`;
}