// sprite-loader.js
// Preprocesses Players.png to replace blue background (0,128,255) with transparency
// Uses an offscreen canvas for one-time image processing (not for game rendering)

const _spriteCache = {};
const _bgUrlCache = {};

/**
 * Returns a data URL with the blue background removed.
 * On first call, starts async processing and returns the original URL.
 * On subsequent calls, returns the processed data URL.
 */
export function getTransparentSpriteUrl(originalUrl) {
  if (_spriteCache[originalUrl]) {
    return _spriteCache[originalUrl];
  }
  if (typeof document === "undefined") return originalUrl;

  // Start loading and processing (only once)
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

        // Replace background colors with transparent:
        // 1. Blue (0,128,255) = margin/spacing background
        // 2. Magenta (255,0,255) = sprite frame background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Exact blue background (margins/spacing)
          if (r === 0 && g === 128 && b === 255) {
            data[i + 3] = 0;
          }
          // Blue with small tolerance (anti-aliased edges)
          else if (r <= 5 && g >= 123 && g <= 133 && b >= 250) {
            data[i + 3] = 0;
          }
          // Exact magenta background (sprite frame bg)
          else if (r === 255 && g === 0 && b === 255) {
            data[i + 3] = 0;
          }
          // Magenta with small tolerance (anti-aliased edges)
          else if (r >= 250 && g <= 5 && b >= 250) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        _spriteCache[originalUrl] = dataUrl;
        _bgUrlCache[originalUrl] = `url('${dataUrl}')`;
        console.log(
          "✅ Sprite processed: blue+magenta background removed from",
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

  return originalUrl; // Return original until processed
}

/**
 * Returns CSS background-image url() with the processed sprite.
 * For use in background-image CSS property.
 */
export function getTransparentSpriteBgUrl(originalUrl) {
  // Trigger processing if not already done
  getTransparentSpriteUrl(originalUrl);
  return _bgUrlCache[originalUrl] || `url('${originalUrl}')`;
}

/**
 * Preload and process the sprite sheet immediately.
 * Call this early (e.g., on page load) so sprites are ready when needed.
 */
export function preloadPlayerSprites(url = "./assets/images/Players.png") {
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
