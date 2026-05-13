import * as barcode from "@undecaf/zbar-wasm";
import { MaybeRef, ref, toValue } from "vue";
import type { ZBarSymbol } from "@undecaf/zbar-wasm";
import { drawBarcodes, drawScanRegion } from "@/core/visualiz";

interface DetectionConfig {
  enableVisualization?: boolean;
  overlayCtx?: CanvasRenderingContext2D | null;
  visualizationColor?: string;
  visualizationLineWidth?: number;
  multipleDetection?: boolean;
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

      // Get canvas context for image data extraction
      // const canvasCtx = canvas.value.getContext("2d");

      const backupCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
      const backupCtx = backupCanvas.getContext("2d");
      
      if (!backupCtx) {
        throw new Error("Failed to obtain canvas rendering context");
      }
      
      backupCtx.drawImage(canvas.value, 0, 0);
      const visibleHeight = canvasHeight * 0.4;
      const startY = (canvasHeight - visibleHeight) / 2;

      backupCtx.fillStyle = "black";

      backupCtx.fillRect(0, 0, canvasWidth, startY);

      backupCtx.fillRect(
        0,
        startY + visibleHeight,
        canvasWidth,
        canvasHeight - (startY + visibleHeight),
      );

      // Extract image data from canvas (already contains the captured frame)
      const imageData = backupCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      if (!imageData || !imageData.data || imageData.data.length === 0) {
        throw new Error("Failed to extract image data from canvas");
      }

      // Perform barcode detection
      const symbols = await barcode.scanImageData(imageData);

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
  };
};
