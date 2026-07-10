import { MaybeRef, ref, toValue } from "vue";
import type { ZBarSymbol } from "@undecaf/zbar-wasm";
import {
  extractImageDataFromCanvas,
  scanImage as scanImageSource,
  scanImages as scanImagesSources,
  scanImageDataInternal,
} from "@/core/scan";
import type { ScanOptions, ScanSource } from "@/core/scan";
import { drawBarcodes, drawScanRegion } from "@/core/visualiz";

export interface DetectionConfig {
  enableVisualization?: boolean;
  overlayCtx?: CanvasRenderingContext2D | null;
  visualizationColor?: string;
  visualizationLineWidth?: number;
  multipleDetection?: boolean;
  /**
   * When true (default), only the center 40% of the canvas is scanned.
   * Set to false to scan the entire canvas.
   */
  useScanRegion?: boolean;
}

interface DetectionState {
  isProcessing: boolean;
  lastDetectionTime: number;
  isCapturing: boolean;
  captureIntervalId: number | null;
}

export const useZbar = () => {
  const video = ref<HTMLVideoElement>();
  const canvas = ref<HTMLCanvasElement>();

  const detectionState: DetectionState = {
    isProcessing: false,
    lastDetectionTime: 0,
    isCapturing: false,
    captureIntervalId: null,
  };

  const init = (
    videoEl: MaybeRef<HTMLVideoElement>,
    canvasEl: MaybeRef<HTMLCanvasElement>,
  ) => {
    video.value = toValue(videoEl);
    canvas.value = toValue(canvasEl);
  };

  /**
   * Draw barcode detection results on canvas
   * Only called if visualization is enabled
   */
  const visualizeDetections = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    symbols: ZBarSymbol[],
    canvasWidth: number,
    canvasHeight: number,
    color: string,
    lineWidth: number,
    multipleDetection: boolean,
  ): void => {
    if (!canvas.value) throw new Error("VisualizeDetection canvas undefiend");
    // if (symbols.length === 0) return;

    // Calculate dynamic line width based on canvas size
    const dynamicLineWidth = Math.max(
      Math.min(canvasHeight, canvasWidth) / 100,
      lineWidth,
    );
    drawBarcodes(
      multipleDetection ? symbols : [symbols[0]],
      ctx,
      canvas.value,
      color,
      performance.now(),
    );
  };

  /**
   * Main barcode detection function
   * Works on the canvas content (which should have a captured frame)
   * Separated from frame capture for better control
   */
  const detect = async (config?: DetectionConfig): Promise<ZBarSymbol[]> => {
    // Early return if canvas not ready
    if (!canvas.value) {
      throw new Error(
        "Canvas element not initialized. Ensure camera is started and frame capture is active.",
      );
    }

    // Prevent concurrent processing
    if (detectionState.isProcessing) {
      return [];
    }

    detectionState.isProcessing = true;

    try {
      const canvasWidth = canvas.value.width;
      const canvasHeight = canvas.value.height;

      if (config?.overlayCtx) {
        config.overlayCtx.canvas.width = canvasWidth;
        config.overlayCtx.canvas.height = canvasHeight;
      }

      // Validate canvas dimensions
      if (!canvasWidth || !canvasHeight) {
        console.warn("Canvas not ready, dimensions unavailable");
        return [];
      }

      const useScanRegion = config?.useScanRegion !== false;
      const { imageData, backupCtx } = extractImageDataFromCanvas(
        canvas.value,
        useScanRegion,
      );

      const symbols = await scanImageDataInternal(imageData);

      // Visualize detections if enabled
      if (config?.enableVisualization !== false) {
        visualizeDetections(
          config?.overlayCtx || backupCtx,
          symbols,
          canvasWidth,
          canvasHeight,
          config?.visualizationColor || "#00ff0080",
          config?.visualizationLineWidth || 2,
          config?.multipleDetection || false,
        );
      }

      detectionState.lastDetectionTime = performance.now();
      return symbols;
    } catch (error) {
      console.error("Barcode detection error:", error);
      throw error;
    } finally {
      detectionState.isProcessing = false;
    }
  };

  return {
    init,
    detect,
    drawScanRegion,
    /**
     * Scan a single static image source. Accepts `File`, `Blob`, canvas,
     * `ImageData`, `HTMLImageElement`, or `ImageBitmap`.
     */
    scanImage: (source: ScanSource, options?: ScanOptions) =>
      scanImageSource(source, options),
    /**
     * Scan multiple static image sources in order.
     */
    scanImages: (sources: ScanSource[], options?: ScanOptions) =>
      scanImagesSources(sources, options),
  };
};
