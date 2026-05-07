import * as barcode from "@undecaf/zbar-wasm";
import { ref } from "vue";
import { useCamera } from "vue3cam-lib";
import type { ZBarSymbol } from "@undecaf/zbar-wasm";

interface DetectionConfig {
  enableVisualization?: boolean;
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
  const { video, canvas, init, pause, start, stop, resume } = useCamera();

  const offCanvas = ref<OffscreenCanvas | null>(null);
  const detectionState: DetectionState = {
    isProcessing: false,
    lastDetectionTime: 0,
    isCapturing: false,
    captureIntervalId: null,
  };

  // Cache OffscreenCanvas support check
  const supportsOffscreenCanvas = (() => {
    try {
      return Boolean(new OffscreenCanvas(1, 1).getContext("2d"));
    } catch {
      return false;
    }
  })();

  /**
   * Get or create OffscreenCanvas context
   * Reuses existing canvas if dimensions match
   */
  const getOffscreenContext = (
    width: number,
    height: number,
  ): OffscreenCanvasRenderingContext2D | null => {
    if (!supportsOffscreenCanvas) return null;

    // Reuse existing canvas if dimensions match
    if (
      offCanvas.value &&
      offCanvas.value.width === width &&
      offCanvas.value.height === height
    ) {
      return offCanvas.value.getContext("2d");
    }

    // Create new offscreen canvas only if needed
    offCanvas.value = new OffscreenCanvas(width, height);
    return offCanvas.value.getContext("2d");
  };

  /**
   * Draw barcode detection results on canvas
   * Only called if visualization is enabled
   */
  const visualizeDetections = (
    ctx: CanvasRenderingContext2D,
    symbols: ZBarSymbol[],
    canvasWidth: number,
    canvasHeight: number,
    color: string,
    lineWidth: number,
    multipleDetection: boolean,
  ): void => {
    if (symbols.length === 0) return;

    // Calculate dynamic line width based on canvas size
    const dynamicLineWidth = Math.max(
      Math.min(canvasHeight, canvasWidth) / 100,
      lineWidth,
    );

    const drawVisual = (symbol: ZBarSymbol) => {
      if (symbol.points.length === 0) return;

      // Draw barcode boundary
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = dynamicLineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Move to first point
      ctx.moveTo(symbol.points[0].x, symbol.points[0].y);

      // Draw lines through all points
      for (let i = 1; i < symbol.points.length; i++) {
        ctx.lineTo(symbol.points[i].x, symbol.points[i].y);
      }

      // Close the path
      ctx.lineTo(symbol.points[0].x, symbol.points[0].y);
      ctx.stroke();
    };

    multipleDetection === true
      ? symbols.forEach(drawVisual)
      : drawVisual(symbols[0]);
  };

  /**
   * Capture current video frame to canvas
   * Does not clear previous content, just draws the latest frame
   */
  const captureFrame = (): void => {
    if (!canvas.value || !video.value) {
      return;
    }

    const videoWidth = video.value.videoWidth;
    const videoHeight = video.value.videoHeight;

    if (!videoWidth || !videoHeight) {
      return;
    }

    // Update canvas dimensions if needed
    if (
      canvas.value.width !== videoWidth ||
      canvas.value.height !== videoHeight
    ) {
      canvas.value.width = videoWidth;
      canvas.value.height = videoHeight;
    }

    // Draw current video frame to canvas
    const ctx = canvas.value.getContext("2d");
    if (ctx) {
      ctx.drawImage(video.value, 0, 0, videoWidth, videoHeight);
    }
  };

  /**
   * Start continuous frame capture to canvas
   * Runs at specified interval
   */
  const startFrameCapture = (intervalMs: number = 33): void => {
    if (detectionState.isCapturing) return;

    detectionState.isCapturing = true;
    detectionState.captureIntervalId = window.setInterval(() => {
      captureFrame();
    }, intervalMs);
  };

  /**
   * Stop continuous frame capture
   * Last frame remains frozen on canvas
   */
  const stopFrameCapture = (): void => {
    if (detectionState.captureIntervalId !== null) {
      clearInterval(detectionState.captureIntervalId);
      detectionState.captureIntervalId = null;
    }
    detectionState.isCapturing = false;
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

      // Validate canvas dimensions
      if (!canvasWidth || !canvasHeight) {
        console.warn("Canvas not ready, dimensions unavailable");
        return [];
      }

      // Get canvas context for image data extraction
      const canvasCtx = canvas.value.getContext("2d");

      if (!canvasCtx) {
        throw new Error("Failed to obtain canvas rendering context");
      }

      // Extract image data from canvas (already contains the captured frame)
      const imageData = canvasCtx.getImageData(0, 0, canvasWidth, canvasHeight);

      if (!imageData || !imageData.data || imageData.data.length === 0) {
        throw new Error("Failed to extract image data from canvas");
      }

      // Perform barcode detection
      const symbols = await barcode.scanImageData(imageData);

      // Visualize detections if enabled
      if (config?.enableVisualization !== false && symbols.length > 0) {
        visualizeDetections(
          canvasCtx,
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

  /**
   * Cleanup resources
   */
  const cleanup = (): void => {
    offCanvas.value = null;
  };

  return {
    video,
    canvas,
    detect,
    init,
    start,
    stop,
    pause,
    resume,
    captureFrame,
    startFrameCapture,
    stopFrameCapture,
    cleanup,
  };
};
