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
