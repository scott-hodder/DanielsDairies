/**
 * Parallax scrolling background with procedural scenery layers.
 * Supports horizontal or vertical scrolling.
 */
export default class ScrollingScene {
  /**
   * @param {Object} opts
   * @param {'horizontal'|'vertical'} [opts.direction='horizontal']
   * @param {Array<{speed:number, draw:(ctx,offset,w,h)=>void}>} opts.layers
   */
  constructor(opts = {}) {
    this.direction = opts.direction || 'horizontal';
    this.layers = opts.layers || [];
    this.scroll = 0; // current scroll position in world units
    this.speed = opts.speed || 100; // pixels per second (auto-scroll)
    this.autoScroll = opts.autoScroll !== false;
  }

  update(dt) {
    if (this.autoScroll) {
      this.scroll += this.speed * dt;
    }
  }

  render(ctx, canvasWidth, canvasHeight) {
    for (const layer of this.layers) {
      const offset = this.scroll * (layer.speed || 1);
      ctx.save();
      layer.draw(ctx, offset, canvasWidth, canvasHeight);
      ctx.restore();
    }
  }
}

/**
 * Helper: create a repeating gradient sky layer.
 */
export function createSkyLayer(colors, speed = 0.1) {
  return {
    speed,
    draw(ctx, _offset, w, h) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  };
}

/**
 * Helper: create a repeating ground/terrain layer with hills.
 */
export function createHillsLayer(color, baseY, amplitude, frequency, speed = 0.5) {
  return {
    speed,
    draw(ctx, offset, w, h) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const worldX = x + offset;
        const y = baseY + Math.sin(worldX * frequency) * amplitude +
                  Math.sin(worldX * frequency * 2.3) * (amplitude * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    },
  };
}

/**
 * Helper: create repeating procedural trees/objects.
 */
export function createObjectsLayer(drawObj, spacing, yBase, speed = 1) {
  return {
    speed,
    draw(ctx, offset, w, _h) {
      const startIdx = Math.floor(offset / spacing) - 1;
      const endIdx = startIdx + Math.ceil(w / spacing) + 2;
      for (let i = startIdx; i <= endIdx; i++) {
        const worldX = i * spacing;
        const screenX = worldX - offset;
        // Seeded variation per object
        const seed = Math.abs(((i * 127) ^ (i * 311)) % 100) / 100;
        ctx.save();
        drawObj(ctx, screenX, yBase, seed, i);
        ctx.restore();
      }
    },
  };
}
