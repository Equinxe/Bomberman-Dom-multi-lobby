// sprite-loader.js
// ============================================================================
// IMPORTANT: This file uses an offscreen <canvas> ONLY as a one-time image
// processing utility to remove colored backgrounds (chroma-key) from sprite
// PNG files.  The canvas is NEVER inserted into the DOM and is NEVER used for
// game rendering.  All actual game visuals are rendered with standard DOM
// elements (<div>, <img>) managed by the mini-framework in Core/dom.js.
// The processed result is exported as a data-URL string and consumed via
// normal <img src="…"> attributes — no canvas element is ever visible or
// participates in the rendering pipeline.
// ============================================================================

const _spriteCache = {};
const _bgUrlCache = {};

/**
 * Returns a data URL with the green background removed from PlayerTest.png.
 * BG colors: (186,254,202) and (204,255,204)
 * On first call, starts async processing and returns the original URL.
 * On subsequent calls, returns the processed data URL.
 */
export function getTransparentSpriteUrl(originalUrl) {
  if (_spriteCache[originalUrl]) {
    return _spriteCache[originalUrl];
  }
  if (typeof document === "undefined") return originalUrl;

  if (!_spriteCache["_loading_" + originalUrl]) {
    _spriteCache["_loading_" + originalUrl] = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Green background (186,254,202) with tolerance
          if (
            Math.abs(r - 186) <= 3 &&
            Math.abs(g - 254) <= 3 &&
            Math.abs(b - 202) <= 3
          ) {
            data[i + 3] = 0;
          }
          // Light green background (204,255,204) with tolerance
          else if (
            Math.abs(r - 204) <= 3 &&
            Math.abs(g - 255) <= 3 &&
            Math.abs(b - 204) <= 3
          ) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        _spriteCache[originalUrl] = dataUrl;
        _bgUrlCache[originalUrl] = `url('${dataUrl}')`;
        console.log(
          "✅ Sprite processed: green background removed from",
          originalUrl,
        );
      } catch (e) {
        console.warn("Failed to process sprite sheet:", e);
        _spriteCache[originalUrl] = originalUrl;
        _bgUrlCache[originalUrl] = `url('${originalUrl}')`;
      }
    };
    img.onerror = () => {
      _spriteCache[originalUrl] = originalUrl;
      _bgUrlCache[originalUrl] = `url('${originalUrl}')`;
    };
    img.src = originalUrl;
  }

  return originalUrl;
}

/**
 * Returns CSS background-image url() with the processed sprite.
 */
export function getTransparentSpriteBgUrl(originalUrl) {
  getTransparentSpriteUrl(originalUrl);
  return _bgUrlCache[originalUrl] || `url('${originalUrl}')`;
}

/**
 * Preload and process the player sprite sheet immediately.
 */
export function preloadPlayerSprites(url = "./assets/images/PlayerTest.png") {
  getTransparentSpriteUrl(url);
}

/**
 * Process PowerUps.png: removes magenta bg + blue backgrounds specific to power-up sprites.
 * PowerUps.png layout (pixel-verified):
 *   - Magenta (255,0,255) sheet background/margin
 *   - Col 0 light blue border (66,162,231)
 *   - Col 0 inner blue fill (99,130,231)
 *   - Col 1 dark blue border (66,0,132)
 *   - Col 1 dark inner (33,32,66)
 * All must become transparent so only the actual sprite art remains.
 */
export function getTransparentPowerUpUrl(originalUrl) {
  const cacheKey = "_powerup_" + originalUrl;
  if (_spriteCache[cacheKey]) {
    return _spriteCache[cacheKey];
  }
  if (typeof document === "undefined") return originalUrl;

  if (!_spriteCache["_loading_" + cacheKey]) {
    _spriteCache["_loading_" + cacheKey] = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i],
            g = d[i + 1],
            b = d[i + 2];

          // Magenta background (255,0,255) with tolerance
          if (r >= 240 && g <= 15 && b >= 240) {
            d[i + 3] = 0;
            continue;
          }
          // Light blue border (66,162,231) with tolerance
          if (
            Math.abs(r - 66) <= 10 &&
            Math.abs(g - 162) <= 10 &&
            Math.abs(b - 231) <= 10
          ) {
            d[i + 3] = 0;
            continue;
          }
          // Inner blue fill (99,130,231) with tolerance
          if (
            Math.abs(r - 99) <= 10 &&
            Math.abs(g - 130) <= 10 &&
            Math.abs(b - 231) <= 10
          ) {
            d[i + 3] = 0;
            continue;
          }
          // Dark blue border col 1 (66,0,132) with tolerance
          if (Math.abs(r - 66) <= 10 && g <= 10 && Math.abs(b - 132) <= 10) {
            d[i + 3] = 0;
            continue;
          }
          // Dark inner col 1 (33,32,66) with tolerance
          if (
            Math.abs(r - 33) <= 10 &&
            Math.abs(g - 32) <= 10 &&
            Math.abs(b - 66) <= 10
          ) {
            d[i + 3] = 0;
            continue;
          }
          // Dark inner variant (99,0,66) with tolerance — appears in some sprites
          if (Math.abs(r - 99) <= 10 && g <= 10 && Math.abs(b - 66) <= 10) {
            d[i + 3] = 0;
            continue;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        _spriteCache[cacheKey] = dataUrl;
        console.log(
          "✅ PowerUps sprite processed: magenta+blue backgrounds removed (" +
            img.width +
            "x" +
            img.height +
            ")",
        );
      } catch (e) {
        console.warn("Failed to process PowerUps sprite sheet:", e);
        _spriteCache[cacheKey] = originalUrl;
      }
    };
    img.onerror = () => {
      _spriteCache[cacheKey] = originalUrl;
    };
    img.src = originalUrl;
  }

  return _spriteCache[cacheKey] || originalUrl;
}

/**
 * Preload and process the PowerUps sprite sheet immediately.
 */
export function preloadPowerUpSprites(url = "./assets/images/PowerUps.png") {
  getTransparentPowerUpUrl(url);
}
