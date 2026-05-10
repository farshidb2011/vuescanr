import { Point, ZBarSymbol } from "@undecaf/zbar-wasm";

// ─── Config ───────────────────────────────────────────────────────────────
const BARCODE_LOST_FRAMES = 8;
const MAX_TRACK_DISTANCE = 150;

// ─── Types ────────────────────────────────────────────────────────────────
interface TrackedBarcode {
  key: string; // unique: typeName + decoded data
  points: Point[]; // raw target from scanner
  lostFrames: number;
}

interface DisplayBarcode {
  key: string;
  points: Point[]; // smoothed visual position
  lostFrames: number;
}

const trackedBarcodes = new Map<string, TrackedBarcode>();
const displayBarcodes = new Map<string, DisplayBarcode>();
let lastBarcodeRenderTime = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function centroid(points: Point[]): Point {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}

function dist2(a: Point, b: Point) {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// ─── Tracker — call once per scanner result ────────────────────────────────
function updateBarcodeTracker(symbols: ZBarSymbol[]): void {
  const seen = new Set<string>();

  for (const sym of symbols) {
    const key = `${sym.typeName}:${sym.decode()}`;
    seen.add(key);

    const t = trackedBarcodes.get(key);

    if (!t) {
      trackedBarcodes.set(key, {
        key,
        points: sym.points.map((p) => ({ ...p })),
        lostFrames: 0,
      });
    } else {
      const dc = dist2(centroid(t.points), centroid(sym.points));
      if (dc > MAX_TRACK_DISTANCE ** 2) {
        t.points = sym.points.map((p) => ({ ...p })); // hard snap
      } else {
        t.points = sym.points.map((p) => ({ ...p })); // store raw target; display layer smooths
      }
      t.lostFrames = 0;
    }
  }

  for (const [key, t] of trackedBarcodes) {
    if (!seen.has(key) && ++t.lostFrames > BARCODE_LOST_FRAMES)
      trackedBarcodes.delete(key);
  }
}

// ─── Display tick — call every rAF ────────────────────────────────────────
function tickBarcodeDisplay(dt: number): void {
  const t = Math.min(1, dt * 0.025);

  for (const [key, tracked] of trackedBarcodes) {
    let ds = displayBarcodes.get(key);

    if (!ds) {
      displayBarcodes.set(key, {
        key,
        points: tracked.points.map((p) => ({ ...p })),
        lostFrames: tracked.lostFrames,
      });
      continue;
    }

    ds.lostFrames = tracked.lostFrames;
    ds.points = ds.points.map((p, i) => ({
      x: lerp(p.x, tracked.points[i]?.x ?? p.x, t),
      y: lerp(p.y, tracked.points[i]?.y ?? p.y, t),
    }));
  }

  for (const key of displayBarcodes.keys()) {
    if (!trackedBarcodes.has(key)) displayBarcodes.delete(key);
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

export function drawBarcodes(
  symbols: ZBarSymbol[],
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  color: string,
  now: number,
) {
  
  updateBarcodeTracker(symbols);

  const dt = now - lastBarcodeRenderTime;
  lastBarcodeRenderTime = now;
  tickBarcodeDisplay(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const ds of displayBarcodes.values()) {
    if (ds.points.length === 0) continue;

    const alpha = 1 - ds.lostFrames / BARCODE_LOST_FRAMES;
    const { x, y, w, h } = getBoundingRect(ds.points);

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
