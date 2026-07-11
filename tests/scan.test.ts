import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ZBarSymbol } from "@undecaf/zbar-wasm";

const mockScanImageData = vi.fn<(_: ImageData) => Promise<ZBarSymbol[]>>();

vi.mock("@undecaf/zbar-wasm", () => ({
  scanImageData: (imageData: ImageData) => mockScanImageData(imageData),
}));

import {
  applyScanRegion,
  extractImageDataFromCanvas,
  scanCanvas,
  scanImageData,
  scanImages,
  scanSource,
} from "@/core/scan";
import { useZbar } from "@/composables/zbar";

function createImageData(width: number, height: number, fill = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = fill;
    data[i + 2] = fill;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

function createSourceCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as unknown as { pixels: Uint8ClampedArray };
  ctx.pixels.fill(255);
  return canvas;
}

describe("applyScanRegion", () => {
  it("blackens the top and bottom bands outside the center 40%", () => {
    const fillRect = vi.fn();
    const ctx = {
      fillStyle: "",
      fillRect,
    } as unknown as CanvasRenderingContext2D;

    applyScanRegion(ctx, 100, 200);

    expect(fillRect).toHaveBeenCalledTimes(2);
    expect(fillRect).toHaveBeenNthCalledWith(1, 0, 0, 100, 60);
    expect(fillRect).toHaveBeenNthCalledWith(2, 0, 140, 100, 60);
  });
});

describe("scanImageData", () => {
  beforeEach(() => {
    mockScanImageData.mockReset();
    mockScanImageData.mockResolvedValue([]);
  });

  it("passes full ImageData to zbar when useScanRegion is false", async () => {
    const imageData = createImageData(4, 4, 128);

    await scanImageData(imageData);

    expect(mockScanImageData).toHaveBeenCalledTimes(1);
    expect(mockScanImageData.mock.calls[0][0]).toBe(imageData);
  });

  it("applies scan region masking when useScanRegion is true", async () => {
    const imageData = createImageData(10, 10, 200);

    await scanImageData(imageData, { useScanRegion: true });

    expect(mockScanImageData).toHaveBeenCalledTimes(1);
    const passed = mockScanImageData.mock.calls[0][0];
    expect(passed.width).toBe(10);
    expect(passed.height).toBe(10);
    expect(passed.data[0]).not.toBe(imageData.data[0]);
  });
});

describe("extractImageDataFromCanvas", () => {
  beforeEach(() => {
    mockScanImageData.mockReset();
    mockScanImageData.mockResolvedValue([]);
  });

  it("extracts full canvas pixels when useScanRegion is false", async () => {
    const canvas = createSourceCanvas(8, 8);
    const { imageData } = extractImageDataFromCanvas(canvas, false);

    expect(imageData.width).toBe(8);
    expect(imageData.height).toBe(8);
    expect(imageData.data.some((value) => value > 0)).toBe(true);
  });

  it("masks the canvas when useScanRegion is true", () => {
    const canvas = createSourceCanvas(10, 10);
    const full = extractImageDataFromCanvas(canvas, false);
    const masked = extractImageDataFromCanvas(canvas, true);

    expect(masked.imageData.data[0]).toBe(0);
    expect(full.imageData.data[0]).toBe(255);
  });
});

describe("scanCanvas", () => {
  beforeEach(() => {
    mockScanImageData.mockReset();
    mockScanImageData.mockResolvedValue([]);
  });

  it("scans the entire canvas by default", async () => {
    const canvas = createSourceCanvas(6, 6);
    await scanCanvas(canvas);

    expect(mockScanImageData).toHaveBeenCalledTimes(1);
    const passed = mockScanImageData.mock.calls[0][0];
    expect(passed.width).toBe(6);
    expect(passed.height).toBe(6);
  });
});

describe("scanSource", () => {
  beforeEach(() => {
    mockScanImageData.mockReset();
    mockScanImageData.mockResolvedValue([]);
  });

  it("routes ImageData sources", async () => {
    const imageData = createImageData(4, 4);
    await scanSource(imageData);
    expect(mockScanImageData.mock.calls[0][0]).toBe(imageData);
  });

  it("routes HTMLCanvasElement sources", async () => {
    const canvas = createSourceCanvas(5, 5);
    await scanSource(canvas);
    expect(mockScanImageData.mock.calls[0][0].width).toBe(5);
  });

  it("routes Blob sources", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 4,
        height: 4,
        close: vi.fn(),
      })),
    );

    await scanSource(new Blob(["x"], { type: "image/png" }));
    expect(mockScanImageData).toHaveBeenCalledTimes(1);
  });
});

describe("scanImages", () => {
  beforeEach(() => {
    mockScanImageData.mockReset();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 4,
        height: 4,
        close: vi.fn(),
      })),
    );
  });

  it("returns results in input order and continues after a failure", async () => {
    mockScanImageData
      .mockRejectedValueOnce(new Error("decode failed"))
      .mockResolvedValueOnce([{ decode: () => "ok" } as ZBarSymbol]);

    const sources = [
      createImageData(2, 2),
      createSourceCanvas(4, 4),
    ];

    const results = await scanImages(sources);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[0].error?.message).toBe("decode failed");
    expect(results[1].success).toBe(true);
    expect(results[1].symbols).toHaveLength(1);
  });
});

describe("useZbar detect", () => {
  beforeEach(() => {
    mockScanImageData.mockReset();
    mockScanImageData.mockResolvedValue([]);
  });

  it("uses scan region masking by default for camera canvas scanning", async () => {
    const video = document.createElement("video");
    const canvas = createSourceCanvas(10, 10);
    const { init, detect } = useZbar();

    init(video, canvas);
    await detect({ enableVisualization: false });

    expect(mockScanImageData).toHaveBeenCalledTimes(1);
    const masked = extractImageDataFromCanvas(canvas, true);
    expect(mockScanImageData.mock.calls[0][0].data).toEqual(masked.imageData.data);
  });

  it("scans the full canvas when useScanRegion is false", async () => {
    const video = document.createElement("video");
    const canvas = createSourceCanvas(10, 10);
    const { init, detect } = useZbar();

    init(video, canvas);
    await detect({ enableVisualization: false, useScanRegion: false });

    expect(mockScanImageData).toHaveBeenCalledTimes(1);
    const full = extractImageDataFromCanvas(canvas, false);
    expect(mockScanImageData.mock.calls[0][0].data).toEqual(full.imageData.data);
  });

  it("returns an empty array when canvas dimensions are unavailable", async () => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    canvas.width = 0;
    canvas.height = 0;
    const { init, detect } = useZbar();

    init(video, canvas);
    await expect(detect()).resolves.toEqual([]);
  });
});

describe("useZbar scanImage", () => {
  beforeEach(() => {
    mockScanImageData.mockReset();
    mockScanImageData.mockResolvedValue([]);
  });

  it("scans a canvas without requiring init or video", async () => {
    const { scanImage } = useZbar();
    const canvas = createSourceCanvas(6, 6);

    await scanImage(canvas);

    expect(mockScanImageData).toHaveBeenCalledTimes(1);
    expect(mockScanImageData.mock.calls[0][0].width).toBe(6);
  });

  it("scanImages accepts mixed source types", async () => {
    const { scanImages } = useZbar();

    const results = await scanImages([
      createImageData(3, 3),
      createSourceCanvas(4, 4),
    ]);

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.success)).toBe(true);
  });
});
