import * as barcode from "@undecaf/zbar-wasm";
import type { ZBarSymbol } from "@undecaf/zbar-wasm";

/** Options for static image scanning APIs. */
export interface ScanOptions {
  /**
   * When true, only the center 40% of the image is scanned (camera-style region).
   * Defaults to `false` for image APIs — the full image is scanned.
   */
  useScanRegion?: boolean;
}

/** Result of scanning a single image. */
export interface ScanResult {
  success: boolean;
  symbols: ZBarSymbol[];
  error?: Error;
}

/** Supported static image sources for `scanImage` / `scanImages`. */
export type ScanSource =
  | Blob
  | File
  | HTMLCanvasElement
  | HTMLImageElement
  | ImageBitmap
  | ImageData;

export interface CanvasScanContext {
  imageData: ImageData;
  width: number;
  height: number;
  backupCtx: OffscreenCanvasRenderingContext2D;
}

const SCAN_REGION_RATIO = 0.4;

/**
 * Black out the top and bottom regions so only the center band remains visible.
 * Used for live camera scanning to focus on the viewfinder area.
 */
export function applyScanRegion(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const visibleHeight = canvasHeight * SCAN_REGION_RATIO;
  const startY = (canvasHeight - visibleHeight) / 2;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvasWidth, startY);
  ctx.fillRect(
    0,
    startY + visibleHeight,
    canvasWidth,
    canvasHeight - (startY + visibleHeight),
  );
}

/**
 * Decode barcodes from raw pixel data via zbar-wasm.
 * All scanning paths in this library should call this function.
 */
export async function scanImageDataInternal(
  imageData: ImageData,
): Promise<ZBarSymbol[]> {
  if (!imageData?.data?.length) {
    throw new Error("Failed to extract image data");
  }
  return barcode.scanImageData(imageData);
}

function drawableToImageData(
  source: CanvasImageSource,
  width: number,
  height: number,
  useScanRegion: boolean,
): ImageData {
  const backupCanvas = new OffscreenCanvas(width, height);
  const backupCtx = backupCanvas.getContext("2d");

  if (!backupCtx) {
    throw new Error("Failed to obtain canvas rendering context");
  }

  backupCtx.drawImage(source, 0, 0, width, height);

  if (useScanRegion) {
    applyScanRegion(backupCtx, width, height);
  }

  return backupCtx.getImageData(0, 0, width, height);
}

/**
 * Extract pixel data from a canvas, optionally applying the camera scan region mask.
 */
export function extractImageDataFromCanvas(
  canvas: HTMLCanvasElement,
  useScanRegion: boolean,
): CanvasScanContext {
  const width = canvas.width;
  const height = canvas.height;

  if (!width || !height) {
    throw new Error("Canvas not ready, dimensions unavailable");
  }

  const backupCanvas = new OffscreenCanvas(width, height);
  const backupCtx = backupCanvas.getContext("2d");

  if (!backupCtx) {
    throw new Error("Failed to obtain canvas rendering context");
  }

  backupCtx.drawImage(canvas, 0, 0);

  if (useScanRegion) {
    applyScanRegion(backupCtx, width, height);
  }

  const imageData = backupCtx.getImageData(0, 0, width, height);

  return { imageData, width, height, backupCtx };
}

function resolveUseScanRegion(options?: ScanOptions): boolean {
  return options?.useScanRegion ?? false;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Scan an `ImageData` buffer for barcodes.
 */
export async function scanImageData(
  imageData: ImageData,
  options?: ScanOptions,
): Promise<ZBarSymbol[]> {
  if (resolveUseScanRegion(options)) {
    const backupCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    const backupCtx = backupCanvas.getContext("2d");

    if (!backupCtx) {
      throw new Error("Failed to obtain canvas rendering context");
    }

    backupCtx.putImageData(imageData, 0, 0);
    applyScanRegion(backupCtx, imageData.width, imageData.height);
    return scanImageDataInternal(
      backupCtx.getImageData(0, 0, imageData.width, imageData.height),
    );
  }

  return scanImageDataInternal(imageData);
}

/**
 * Scan an `HTMLCanvasElement` for barcodes.
 */
export async function scanCanvas(
  canvas: HTMLCanvasElement,
  options?: ScanOptions,
): Promise<ZBarSymbol[]> {
  const { imageData } = extractImageDataFromCanvas(
    canvas,
    resolveUseScanRegion(options),
  );
  return scanImageDataInternal(imageData);
}

/**
 * Scan an `ImageBitmap` for barcodes.
 */
export async function scanImageBitmap(
  bitmap: ImageBitmap,
  options?: ScanOptions,
): Promise<ZBarSymbol[]> {
  const imageData = drawableToImageData(
    bitmap,
    bitmap.width,
    bitmap.height,
    resolveUseScanRegion(options),
  );
  return scanImageDataInternal(imageData);
}

/**
 * Scan an `HTMLImageElement` for barcodes.
 */
export async function scanImageElement(
  image: HTMLImageElement,
  options?: ScanOptions,
): Promise<ZBarSymbol[]> {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error("Image element has no dimensions");
  }

  const imageData = drawableToImageData(
    image,
    width,
    height,
    resolveUseScanRegion(options),
  );
  return scanImageDataInternal(imageData);
}

/**
 * Scan a `Blob` (e.g. image file contents) for barcodes.
 */
export async function scanBlob(
  blob: Blob,
  options?: ScanOptions,
): Promise<ZBarSymbol[]> {
  const bitmap = await createImageBitmap(blob);
  try {
    return await scanImageBitmap(bitmap, options);
  } finally {
    bitmap.close();
  }
}

/**
 * Scan any supported image source. The input type is detected automatically.
 */
export async function scanSource(
  source: ScanSource,
  options?: ScanOptions,
): Promise<ZBarSymbol[]> {
  if (source instanceof ImageData) {
    return scanImageData(source, options);
  }

  if (source instanceof HTMLCanvasElement) {
    return scanCanvas(source, options);
  }

  if (source instanceof HTMLImageElement) {
    return scanImageElement(source, options);
  }

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return scanImageBitmap(source, options);
  }

  if (source instanceof Blob) {
    return scanBlob(source, options);
  }

  throw new Error("Unsupported scan source");
}

/**
 * Scan a single image source (`File`, `Blob`, canvas, `ImageData`, etc.).
 */
export async function scanImage(
  source: ScanSource,
  options?: ScanOptions,
): Promise<ZBarSymbol[]> {
  return scanSource(source, options);
}

/**
 * Scan multiple image sources in order. Failures on individual sources do not stop the batch.
 */
export async function scanImages(
  sources: ScanSource[],
  options?: ScanOptions,
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const source of sources) {
    try {
      const symbols = await scanSource(source, options);
      results.push({ success: true, symbols });
    } catch (error) {
      results.push({ success: false, symbols: [], error: toError(error) });
    }
  }

  return results;
}
