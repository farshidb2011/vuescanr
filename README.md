# VueScanr API Documentation

VueScanr supports **live camera scanning** and **static image scanning** from files, blobs, canvases, and raw `ImageData`.

## Overview

- **Camera scanning** — use the `useZbar` composable with a video stream and canvas (via your camera library or custom code).
- **Static image scanning** — use top-level `scan*` functions; no `<video>` element required.

### Scan region behavior

Live camera scanning applies a **center scan region** by default: only the middle 40% of the frame is decoded. This matches a viewfinder-style UX and ignores barcodes near the top or bottom edge.

Static image APIs scan the **entire image** by default. Pass `useScanRegion: true` only if you want the same center-band behavior on a still image.

---

## Installation

```bash
pnpm add vuescanr vue@^3.5.0
```

### Package dependencies

| Kind | Package | Notes |
|------|---------|-------|
| **Runtime** | `@undecaf/zbar-wasm` | Bundled with vuescanr for barcode decoding |
| **Peer** | `vue@^3.5.0` | Required in your application |

**`vue3cam-lib` is not a dependency of vuescanr.** The published npm package does not include camera handling. Install it separately only if you want its camera composable:

```bash
pnpm add vue3cam-lib
```

---

## Playground (this repository)

The local demo under `playground/` uses [`vue3cam-lib`](https://www.npmjs.com/package/vue3cam-lib) for camera streaming. It is listed in **devDependencies** only and is **not** shipped to consumers of `vuescanr`.

```bash
pnpm install
pnpm run dev
```

Playground camera flow (`vue3cam-lib@^0.0.9`):

```typescript
import { useCamera } from 'vue3cam-lib'
import { useZbar } from 'vuescanr'

const { video, canvas, init: initCamera, start } = useCamera()
const { init: initScanner, detect } = useZbar()

onMounted(async () => {
  await initCamera()
  await start()
})

watch(canvas, (el) => {
  if (el && video.value) {
    initScanner(video.value, el)
    // poll detect() on an interval
  }
})
```

See the [vue3cam-lib documentation](https://www.npmjs.com/package/vue3cam-lib) for `init`, `start`, `pause`, `resume`, `capture`, torch control, and recording APIs.

---

## Static Image Scanning

```typescript
import {
  scanImage,
  scanImages,
  scanBlob,
  scanCanvas,
  scanImageData,
  scanImageElement,
  scanImageBitmap,
} from 'vuescanr'
```

### Single file or any image source

```typescript
import { scanImage, scanSource } from 'vuescanr'

// File, Blob, canvas, ImageData, HTMLImageElement, or ImageBitmap
const symbols = await scanImage(file)
const symbols = await scanSource(canvas)
```

### Multiple files

```typescript
const results = await scanImages(files)

results.forEach((result, index) => {
  if (result.success) {
    console.log(index, result.symbols.map((s) => s.decode('utf-8')))
  } else {
    console.error(index, result.error)
  }
})
```

Results are returned in the same order as the input. One failed image does not stop the rest.

### Canvas, ImageData, and other sources

```typescript
// HTMLCanvasElement — full canvas by default
const symbols = await scanCanvas(canvas)

// Raw pixels
const symbols = await scanImageData(imageData)

// Blob / loaded image / ImageBitmap
const symbols = await scanBlob(blob)
const symbols = await scanImageElement(img)
const symbols = await scanImageBitmap(bitmap)
```

### Optional scan region on images

```typescript
// Same center 40% band as camera mode
const symbols = await scanImage(file, { useScanRegion: true })
```

---

## Camera Scanning (`useZbar`)

`useZbar` handles **barcode detection** on a canvas. It does **not** manage the camera stream — bring your own `MediaStream` setup or use a library such as [`vue3cam-lib`](https://www.npmjs.com/package/vue3cam-lib).

Complete API documentation for the `useZbar` composable function.

`useZbar` is a Vue 3 composable that provides a high-level interface for real-time barcode detection using a camera feed.

## Basic Usage

```typescript
import { useZbar } from 'vuescanr'

const {
  init,               // Bind video + canvas elements
  detect,             // Detection function (scan region on by default)
  drawScanRegion,     // Draw the viewfinder overlay
  scanImage,          // Scan any static image source
  scanImages,         // Scan multiple static sources
} = useZbar()
```

### Static image scanning via composable

`scanImage` and `scanImages` accept any supported source — no `<video>` or `init()` required:

```typescript
const { scanImage, scanImages } = useZbar()

// Auto-detects source type
await scanImage(file)
await scanImage(blob)
await scanImage(canvas)
await scanImage(imageData)
await scanImage(imgElement)
await scanImage(bitmap)

const results = await scanImages([file, canvas, imageData])
```

## API Reference

### `init(video, canvas)`

- **Type**: `(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) => void`
- **Description**: Binds the video and canvas elements used by `detect()`. Camera permission and streaming are your responsibility (e.g. via `vue3cam-lib` or `getUserMedia`).

### `detect(config?)`

- **Type**: `(config?: DetectionConfig) => Promise<ZBarSymbol[]>`
- **Parameters**:
  - `config` (optional) - Detection configuration object
- **Returns**: Promise resolving to array of detected barcode symbols
- **Description**: Performs barcode detection on the current canvas content

#### DetectionConfig

```typescript
interface DetectionConfig {
  enableVisualization?: boolean      // Draw detection boxes (default: true)
  visualizationColor?: string        // Hex color for drawing (default: "#00ff0080")
  visualizationLineWidth?: number    // Line width in pixels (default: 2)
  multipleDetection?: boolean        // Detect all barcodes or just first (default: false)
  useScanRegion?: boolean            // Center 40% band only (default: true for detect)
}
```

#### Usage Examples

```typescript
// Basic detection
const symbols = await detect()

// Detection with visualization
const symbols = await detect({
  enableVisualization: true,
  visualizationColor: '#00ff0080'
})

// Multiple barcode detection
const symbols = await detect({
  multipleDetection: true
})

// Custom visualization
const symbols = await detect({
  enableVisualization: true,
  visualizationColor: '#ff0000aa',
  visualizationLineWidth: 3
})

// Full canvas (disable camera scan region)
const symbols = await detect({
  useScanRegion: false
})

// Process results
symbols.forEach(symbol => {
  const barcode = symbol.decode('utf-8')
  console.log('Detected:', barcode)
})
```

### `drawScanRegion(ctx, canvas)`

- **Type**: `(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void`
- **Description**: Draws the center viewfinder overlay (dimmed top/bottom, green border) on a canvas context.

### `scanImage(source, options?)` / `scanImages(sources, options?)`

- **Description**: Scan static image sources without camera setup. Accepts `File`, `Blob`, `HTMLCanvasElement`, `HTMLImageElement`, `ImageBitmap`, or `ImageData`. See [Static Image Scanning](#static-image-scanning).

## Complete Example

Live camera scanner using [`vue3cam-lib`](https://www.npmjs.com/package/vue3cam-lib) for the stream and `useZbar` for detection. This matches the `playground/App.vue` demo in this repository.

```bash
pnpm add vuescanr vue3cam-lib
```

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCamera } from 'vue3cam-lib'
import { useZbar } from 'vuescanr'
import type { ZBarSymbol } from '@undecaf/zbar-wasm'

const { video, canvas, init: initCamera, start, resume } = useCamera()
const { init: initScanner, detect } = useZbar()

const overlay = ref<HTMLCanvasElement | null>(null)
let overlayContext: CanvasRenderingContext2D | null = null

const detected = ref<string[]>([])
const isScanning = ref(false)
const lastDetectionTime = ref(0)
const scanInterval = ref<number | null>(null)
const multipleDetectionMode = ref(false)

const SCAN_INTERVAL = 100
const MIN_DETECTION_INTERVAL = 50

const handleDetection = (symbols: ZBarSymbol[]) => {
  if (symbols.length === 0) return

  const now = performance.now()
  if (now - lastDetectionTime.value < MIN_DETECTION_INTERVAL) return

  detected.value = multipleDetectionMode.value
    ? symbols.map((s) => s.decode('utf-8')).filter(Boolean)
    : [symbols[0].decode('utf-8')]

  lastDetectionTime.value = now
}

const startScanning = () => {
  if (isScanning.value) return
  isScanning.value = true

  const scan = async () => {
    try {
      const symbols = await detect({
        enableVisualization: true,
        visualizationColor: '#05ad2c',
        overlayCtx: overlayContext,
        visualizationLineWidth: 2,
        multipleDetection: multipleDetectionMode.value,
      })
      handleDetection(symbols)
    } catch (error) {
      console.error('Scanning error:', error)
    }
  }

  scanInterval.value = window.setInterval(scan, SCAN_INTERVAL)
}

const stopScanning = () => {
  if (scanInterval.value !== null) {
    clearInterval(scanInterval.value)
    scanInterval.value = null
  }
  isScanning.value = false
}

const resetDetection = () => {
  detected.value = []

  const ctx = canvas.value?.getContext('2d')
  if (ctx && canvas.value) {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  }

  const overlayCtx = overlay.value?.getContext('2d')
  if (overlayCtx && overlay.value) {
    overlayCtx.clearRect(0, 0, overlay.value.width, overlay.value.height)
  }

  resume()
  startScanning()
}

onMounted(async () => {
  overlayContext = overlay.value?.getContext('2d') ?? null
  await initCamera()
  await start()
  await nextTick()
})

onUnmounted(() => {
  stopScanning()
})

watch(canvas, (newCanvas) => {
  if (newCanvas && video.value) {
    initScanner(video.value, newCanvas)
    startScanning()
  }
}, { once: true })
</script>

<template>
  <div class="scanner">
    <video ref="video" autoplay playsinline muted hidden />

    <div class="camera-wrapper">
      <canvas ref="canvas" class="preview" />
      <canvas ref="overlay" class="overlay" />

      <div v-if="isScanning && detected.length === 0" class="scanning">
        Scanning...
      </div>
    </div>

    <label>
      <input v-model="multipleDetectionMode" type="checkbox" />
      Multiple barcode detection
    </label>

    <div v-if="detected.length > 0" class="results">
      <h2>Detected Barcode{{ detected.length > 1 ? 's' : '' }}</h2>
      <div v-for="(code, i) in detected" :key="i">{{ i + 1 }}. {{ code }}</div>
      <button @click="resetDetection">Scan Again</button>
    </div>
  </div>
</template>

<style scoped>
.camera-wrapper {
  position: relative;
  width: 640px;
  height: 480px;
}
.preview,
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.overlay {
  pointer-events: none;
}
</style>
```

## Real-Time Scanning Pattern

For real-time scanning applications:

```typescript
const SCAN_INTERVAL = 100 // milliseconds between scans
const MIN_DETECTION_INTERVAL = 50 // throttle rapid detections

const scan = async () => {
  try {
    const symbols = await detect({
      enableVisualization: true,
      multipleDetection: false // single barcode mode
    })

    if (symbols.length > 0) {
      const now = performance.now()
      if (now - lastDetectionTime > MIN_DETECTION_INTERVAL) {
        handleDetection(symbols)
        lastDetectionTime = now
      }
    }
  } catch (error) {
    console.error('Scanning error:', error)
  }
}

const intervalId = setInterval(scan, SCAN_INTERVAL)

// Cleanup
onUnmounted(() => {
  clearInterval(intervalId)
})
```

## Error Handling

```typescript
const scan = async () => {
  try {
    const symbols = await detect()
    
    if (symbols.length === 0) {
      console.log('No barcode found')
      return
    }

    const barcode = symbols[0].decode('utf-8')
    console.log('Barcode:', barcode)
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detection failed:', error.message)
    }
  }
}
```

## Performance Optimization

1. **Scan interval**: Adjust how often `detect()` runs
   ```typescript
   const SCAN_INTERVAL = 100 // ms between detect() calls
   ```

2. **Detection Throttling**: Prevent excessive detections
   ```typescript
   const MIN_DETECTION_INTERVAL = 100 // ms between detections
   ```

3. **Visualization Toggle**: Disable when not needed
   ```typescript
   await detect({
     enableVisualization: false // Production mode
   })
   ```

4. **Single Detection Mode**: Faster than multiple detection
   ```typescript
   await detect({
     multipleDetection: false // Only detect first barcode
   })
   ```

## TypeScript Support

Full TypeScript support with proper types:

```typescript
import { useZbar } from 'vuescanr'
import type { ZBarSymbol } from '@undecaf/zbar-wasm'

const { detect } = useZbar()

const symbols: ZBarSymbol[] = await detect()
symbols.forEach(symbol => {
  // symbol has proper typing
  const decoded: string = symbol.decode('utf-8')
})
```

## Troubleshooting

### Camera Not Starting

Camera access is handled outside `vuescanr` (e.g. with `vue3cam-lib`):

```typescript
import { useCamera } from 'vue3cam-lib'

const { init, start } = useCamera()

try {
  await init()
  await start()
} catch (error) {
  console.error('Camera error:', error)
  // Check browser permissions
  // Ensure HTTPS in production
}
```

### No Barcodes Detected
- Check barcode is within camera frame
- Ensure adequate lighting
- Try adjusting visualization color for better visibility
- Check browser console for errors

### Performance Issues
- Increase frame capture interval (lower fps)
- Disable visualization
- Use single detection mode
- Check browser DevTools Performance tab

## Browser Compatibility

All modern browsers with:
- MediaStream API
- Canvas API
- WebAssembly
- Promise support

## FAQ

**Q: Does vuescanr include a camera library?**  
A: No. The published package only includes barcode detection (`@undecaf/zbar-wasm`). Use [`vue3cam-lib`](https://www.npmjs.com/package/vue3cam-lib) or your own `getUserMedia` setup for camera access. The playground in this repo uses `vue3cam-lib` as a dev-only dependency.

**Q: Can I use this in production?**  
A: Yes, it's designed for production use with proper error handling and resource management.

**Q: Does it work on mobile?**  
A: Yes, fully tested on iOS and Android browsers.

**Q: Can I detect multiple barcodes at once?**  
A: Yes, set `multipleDetection: true` in detection config.

**Q: How do I customize the visualization?**  
A: Use `visualizationColor` and `visualizationLineWidth` in detect config.

**Q: What formats does it support?**  
A: All zbar-wasm supported formats (CODE128, EAN-13, UPC, QR, etc.)

## License

MIT
