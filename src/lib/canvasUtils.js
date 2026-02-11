/**
 * Canvas utilities for CactusTree
 * Handles canvas setup, context management, and basic drawing operations
 */

// Canvas setup cache — avoids expensive buffer reallocation when dimensions are unchanged
/** @type {HTMLCanvasElement|null} */
let _lastCanvasRef = null;
let _lastWidth = -1;
let _lastHeight = -1;
let _lastDpr = -1;
/** @type {CanvasRenderingContext2D|null} */
let _cachedCtx = null;

/**
 * Sets up canvas with proper pixel ratio and dimensions.
 * Skips buffer reallocation when canvas reference, dimensions, and DPR are unchanged.
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {CanvasRenderingContext2D|null} - The canvas context
 */
export function setupCanvas(canvas, width, height) {
  if (!canvas) return null;

  const devicePixelRatio = window.devicePixelRatio || 1;

  if (
    canvas === _lastCanvasRef &&
    width === _lastWidth &&
    height === _lastHeight &&
    devicePixelRatio === _lastDpr &&
    _cachedCtx
  ) {
    return _cachedCtx;
  }

  // Full setup needed — dimensions or canvas changed
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  _lastCanvasRef = canvas;
  _lastWidth = width;
  _lastHeight = height;
  _lastDpr = devicePixelRatio;
  _cachedCtx = ctx;

  return ctx;
}

/**
 * Utility: embed an alpha into a color string when possible.
 * - If color is hex (#rgb or #rrggbb) -> convert to rgba(...)
 * - If color is 'rgb(...)' -> convert to rgba(...)
 * - If color is already 'rgba(...)' -> replace alpha component
 * - Otherwise return the original color (alpha ignored)
 *
 * This lets us avoid touching `ctx.globalAlpha` while still applying per-stroke opacity.
 * Results are cached since only a small number of distinct color+alpha combinations exist.
 *
 * @param {string} color
 * @param {number} alpha
 * @returns {string}
 */
/** @type {Map<string, string>} */
const _colorAlphaCache = new Map();
const _COLOR_CACHE_MAX_SIZE = 256;

/**
 * @param {string} color
 * @param {number} alpha
 * @returns {string}
 */
export function colorWithAlpha(color, alpha) {
  if (color == null) return color;
  const c = String(color).trim();
  if (!c) return c;
  if (alpha === undefined || alpha === null) return c;
  if (alpha === 1) return c;

  const cacheKey = `${c}|${alpha}`;
  const cached = _colorAlphaCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let result = c;

  if (c.startsWith('rgba(')) {
    const inner = c.slice(5, -1);
    const parts = inner.split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      result = `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
  } else if (c.startsWith('rgb(')) {
    const inner = c.slice(4, -1);
    const parts = inner.split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      result = `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
  } else if (c[0] === '#') {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((h) => h + h)
        .join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      result = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  if (_colorAlphaCache.size > _COLOR_CACHE_MAX_SIZE) {
    _colorAlphaCache.clear();
  }
  _colorAlphaCache.set(cacheKey, result);
  return result;
}

/**
 * Optimized style setter that only updates canvas properties when they change
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {{ strokeStyle?: string, fillStyle?: string, lineWidth?: number, globalAlpha?: number, textAlign?: CanvasTextAlign, textBaseline?: CanvasTextBaseline, font?: string }} styles - Object containing style properties to set
 */
export function setCanvasStyles(ctx, styles) {
  if (!ctx) return;

  const {
    strokeStyle,
    fillStyle,
    lineWidth,
    globalAlpha,
    textAlign,
    textBaseline,
    font,
  } = styles;

  if (strokeStyle !== undefined && ctx.strokeStyle !== strokeStyle) {
    ctx.strokeStyle = strokeStyle;
  }

  if (fillStyle !== undefined && ctx.fillStyle !== fillStyle) {
    ctx.fillStyle = fillStyle;
  }

  if (lineWidth !== undefined && ctx.lineWidth !== lineWidth) {
    ctx.lineWidth = lineWidth;
  }

  if (globalAlpha !== undefined && ctx.globalAlpha !== globalAlpha) {
    ctx.globalAlpha = globalAlpha;
  }

  if (textAlign !== undefined && ctx.textAlign !== textAlign) {
    ctx.textAlign = /** @type {CanvasTextAlign} */ (textAlign);
  }

  if (textBaseline !== undefined && ctx.textBaseline !== textBaseline) {
    ctx.textBaseline = /** @type {CanvasTextBaseline} */ (textBaseline);
  }

  if (font !== undefined && ctx.font !== font) {
    ctx.font = font;
  }
}
