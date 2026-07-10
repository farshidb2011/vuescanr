import { Point, ZBarSymbol } from "@undecaf/zbar-wasm";

// ─── Config ───────────────────────────────────────────────────────────────
const BARCODE_LOST_FRAMES = 8;
const MAX_TRACK_DISTANCE = 150;

// ─── Types ────────────────────────────────────────────────────────────────

interface TrackedBarcode {
  key: string;
  points: Point[];
  rect: { x: number; y: number; w: number; h: number }; // ← اضافه شد
  lostFrames: number;
}

interface DisplayBarcode {
  key: string;
  rect: { x: number; y: number; w: number; h: number }; // ← فقط rect کافیه
  lostFrames: number;
}

const trackedBarcodes = new Map<string, TrackedBarcode>();
const displayBarcodes = new Map<string, DisplayBarcode>();
let lastBarcodeRenderTime = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SEPARATION_PADDING = 8; // px فاصله بین مستطیل‌های متداخل

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function separateRects(
  rects: { key: string; rect: { x: number; y: number; w: number; h: number } }[],
): void {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].rect;
      const b = rects[j].rect;

      if (!rectsOverlap(a, b)) continue;

      // مرکز هر مستطیل
      const acx = a.x + a.w / 2;
      const acy = a.y + a.h / 2;
      const bcx = b.x + b.w / 2;
      const bcy = b.y + b.h / 2;

      // تداخل در هر محور
      const overlapX = (a.w + b.w) / 2 - Math.abs(acx - bcx) + SEPARATION_PADDING;
      const overlapY = (a.h + b.h) / 2 - Math.abs(acy - bcy) + SEPARATION_PADDING;

      // فقط روی محوری که تداخل کمتره جدا کن
      if (overlapX < overlapY) {
        const shift = overlapX / 2 * (acx < bcx ? -1 : 1);
        a.x += shift;
        b.x -= shift;
      } else {
        const shift = overlapY / 2 * (acy < bcy ? -1 : 1);
        a.y += shift;
        b.y -= shift;
      }
    }
  }
}

function getBoundingRect(points: Point[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}


function updateBarcodeTracker(symbols: ZBarSymbol[]): void {
  const seen = new Set<string>();
  console.log(symbols.length);
  console.log(symbols);
  
  
  
  for (const sym of symbols) {
    const key = `${sym.typeName}:${sym.decode()}`;
    const rect = getBoundingRect(sym.points); // ← per-symbol، ایزوله
    seen.add(key);

    const t = trackedBarcodes.get(key);
    if (!t) {
      trackedBarcodes.set(key, {
        key,
        points: sym.points.map((p) => ({ ...p })),
        rect,
        lostFrames: 0,
      });
    } else {
      t.rect = rect; // آپدیت rect همین سیمبول
      t.lostFrames = 0;
    }
  }

  for (const [key, t] of trackedBarcodes) {
    if (!seen.has(key) && ++t.lostFrames > BARCODE_LOST_FRAMES)
      trackedBarcodes.delete(key);
  }
}

function tickBarcodeDisplay(dt: number): void {
  const t = Math.min(1, dt * 0.025);

  for (const [key, tracked] of trackedBarcodes) {
    let ds = displayBarcodes.get(key);

    if (!ds) {
      displayBarcodes.set(key, {
        key,
        rect: { ...tracked.rect },
        lostFrames: 0,
      });
      continue;
    }

    ds.lostFrames = tracked.lostFrames;

    // smooth روی rect مستقیم — نه points
    ds.rect.x = lerp(ds.rect.x, tracked.rect.x, t);
    ds.rect.y = lerp(ds.rect.y, tracked.rect.y, t);
    ds.rect.w = lerp(ds.rect.w, tracked.rect.w, t);
    ds.rect.h = lerp(ds.rect.h, tracked.rect.h, t);
  }

  for (const key of displayBarcodes.keys()) {
    if (!trackedBarcodes.has(key)) displayBarcodes.delete(key);
  }
}

export function drawBarcodes(
  symbols: ZBarSymbol[],
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  color: string,
  now: number,
) {
  updateBarcodeTracker(symbols.filter(Boolean));
  const dt = now - lastBarcodeRenderTime;
  lastBarcodeRenderTime = now;
  tickBarcodeDisplay(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const ds of displayBarcodes.values()) {
    const { x, y, w, h } = ds.rect;
    const alpha = 1 - ds.lostFrames / BARCODE_LOST_FRAMES;

    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.strokeRect(x, y, w, h);
  }

  ctx.globalAlpha = 1;
}

export function drawScanRegion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
) {
  const regionH = canvas.height * 0.4;
  const regionY = (canvas.height - regionH) / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, regionY);
  ctx.fillRect(0, regionY + regionH, canvas.width, canvas.height);
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, regionY, canvas.width, regionH);
}
