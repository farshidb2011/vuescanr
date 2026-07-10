class MockCanvas2DContext {
  canvas: { width: number; height: number };
  fillStyle = "";
  readonly pixels: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.canvas = { width, height };
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.pixels.fill(255);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    for (let py = Math.max(0, y); py < y + h && py < this.canvas.height; py++) {
      for (let px = Math.max(0, x); px < x + w && px < this.canvas.width; px++) {
        const index = (py * this.canvas.width + px) * 4;
        this.pixels[index] = 0;
        this.pixels[index + 1] = 0;
        this.pixels[index + 2] = 0;
        this.pixels[index + 3] = 255;
      }
    }
  }

  drawImage(
    source: CanvasImageSource,
    dx: number,
    dy: number,
    dw?: number,
    dh?: number,
  ): void {
    const width = dw ?? ("width" in source ? source.width : 0);
    const height = dh ?? ("height" in source ? source.height : 0);

    if ("getContext" in source && typeof source.getContext === "function") {
      const sourceCanvas = source as HTMLCanvasElement;
      const sourceCtx = sourceCanvas.getContext("2d") as MockCanvas2DContext | null;
      if (!sourceCtx) return;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sourceIndex = (y * sourceCanvas.width + x) * 4;
          const targetIndex = ((dy + y) * this.canvas.width + (dx + x)) * 4;
          if (targetIndex < 0 || targetIndex + 3 >= this.pixels.length) continue;
          this.pixels[targetIndex] = sourceCtx.pixels[sourceIndex];
          this.pixels[targetIndex + 1] = sourceCtx.pixels[sourceIndex + 1];
          this.pixels[targetIndex + 2] = sourceCtx.pixels[sourceIndex + 2];
          this.pixels[targetIndex + 3] = sourceCtx.pixels[sourceIndex + 3];
        }
      }
      return;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const targetIndex = ((dy + y) * this.canvas.width + (dx + x)) * 4;
        if (targetIndex < 0 || targetIndex + 3 >= this.pixels.length) continue;
        this.pixels[targetIndex] = 200;
        this.pixels[targetIndex + 1] = 200;
        this.pixels[targetIndex + 2] = 200;
        this.pixels[targetIndex + 3] = 255;
      }
    }
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    const data = new Uint8ClampedArray(sw * sh * 4);

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const sourceIndex = ((sy + y) * this.canvas.width + (sx + x)) * 4;
        const targetIndex = (y * sw + x) * 4;
        data[targetIndex] = this.pixels[sourceIndex] ?? 0;
        data[targetIndex + 1] = this.pixels[sourceIndex + 1] ?? 0;
        data[targetIndex + 2] = this.pixels[sourceIndex + 2] ?? 0;
        data[targetIndex + 3] = this.pixels[sourceIndex + 3] ?? 255;
      }
    }

    return new ImageData(data, sw, sh);
  }

  putImageData(imageData: ImageData, dx: number, dy: number): void {
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const sourceIndex = (y * imageData.width + x) * 4;
        const targetIndex = ((dy + y) * this.canvas.width + (dx + x)) * 4;
        if (targetIndex < 0 || targetIndex + 3 >= this.pixels.length) continue;
        this.pixels[targetIndex] = imageData.data[sourceIndex];
        this.pixels[targetIndex + 1] = imageData.data[sourceIndex + 1];
        this.pixels[targetIndex + 2] = imageData.data[sourceIndex + 2];
        this.pixels[targetIndex + 3] = imageData.data[sourceIndex + 3];
      }
    }
  }
}

class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(type: string): MockCanvas2DContext | null {
    if (type !== "2d") return null;
    return new MockCanvas2DContext(this.width, this.height);
  }
}

const contexts = new WeakMap<HTMLCanvasElement, MockCanvas2DContext>();

HTMLCanvasElement.prototype.getContext = function getContext(type: string) {
  if (type !== "2d") return null;
  let ctx = contexts.get(this);
  if (!ctx || ctx.canvas.width !== this.width || ctx.canvas.height !== this.height) {
    ctx = new MockCanvas2DContext(this.width, this.height);
    contexts.set(this, ctx);
  }
  return ctx as unknown as CanvasRenderingContext2D;
};

globalThis.OffscreenCanvas = MockOffscreenCanvas as unknown as typeof OffscreenCanvas;
