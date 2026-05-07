# useZbar API Documentation

Complete API documentation for the `useZbar` composable function.

## Overview

`useZbar` is a Vue 3 composable that provides a high-level interface for real-time barcode detection using a camera feed.

## Basic Usage

```typescript
import { useZbar } from 'vuescanr'

const {
  video,              // HTMLVideoElement ref - camera stream
  canvas,             // HTMLCanvasElement ref - display canvas
  camera,             // Camera control object
  detect,             // Detection function
  captureFrame,       // Single frame capture function
  startFrameCapture,  // Start continuous frame capture
  stopFrameCapture,   // Stop continuous frame capture
  cleanup             // Resource cleanup
} = useZbar()
```

## API Reference

### `video`

- **Type**: `Ref<HTMLVideoElement | null>`
- **Description**: Reference to the video element containing the camera stream
- **Usage**: Template binding for hidden video element

```vue
<video ref="video" autoplay playsinline hidden></video>
```

### `canvas`

- **Type**: `Ref<HTMLCanvasElement | null>`
- **Description**: Reference to the canvas where frames and visualization are drawn
- **Usage**: Template binding for display canvas

```vue
<canvas ref="canvas"></canvas>
```

### `camera`

- **Type**: `CameraObject`
- **Description**: Camera control interface
- **Methods**:
  - `init(config?: Config)` - Initialize camera with optional config
  - `start()` - Start camera stream
  - `pause()` - Pause camera stream
  - `resume()` - Resume camera stream
  - `stop()` - Stop camera stream

```typescript
// Initialize with custom config
await camera.init({
  canvasWidth: 640,
  canvasHeight: 480
})

// Start the stream
await camera.start()

// Control the stream
camera.pause()
camera.resume()
camera.stop()
```

### `captureFrame()`

- **Type**: `() => void`
- **Description**: Captures a single frame from the video stream to the canvas
- **Usage**: Called automatically by `startFrameCapture()` or manually for single captures

```typescript
// Manual single frame capture
captureFrame()

// Now canvas contains the frame
const ctx = canvas.value?.getContext('2d')
console.log('Frame captured')
```

### `startFrameCapture(intervalMs?)`

- **Type**: `(intervalMs?: number) => void`
- **Parameters**:
  - `intervalMs` (optional, default: 33ms = ~30fps) - Interval between frame captures
- **Description**: Continuously captures frames from the video stream to the canvas
- **Usage**: Call this to begin continuous frame capture

```typescript
// Start with default interval (30fps)
startFrameCapture()

// Or specify custom interval
startFrameCapture(50) // ~20fps
```

### `stopFrameCapture()`

- **Type**: `() => void`
- **Description**: Stops continuous frame capture. Last frame remains frozen on canvas.
- **Usage**: Call when you want to freeze the camera stream

```typescript
stopFrameCapture()

// Canvas now shows the last captured frame
// Perfect for displaying detection results
```

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

// Process results
symbols.forEach(symbol => {
  const barcode = symbol.decode('utf-8')
  console.log('Detected:', barcode)
})
```

### `cleanup()`

- **Type**: `() => void`
- **Description**: Cleans up resources (OffscreenCanvas, etc.)
- **Usage**: Call in component unmount hook

```typescript
onUnmounted(() => {
  cleanup()
})
```

## Complete Example

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useZbar } from 'vuescanr'
import type { ZBarSymbol } from '@undecaf/zbar-wasm'

const {
  camera,
  detect,
  video,
  canvas,
  startFrameCapture,
  stopFrameCapture,
  cleanup
} = useZbar()

const detected = ref<string[]>([])
const isScanning = ref(false)
const scanInterval = ref<number | null>(null)

const startScanning = () => {
  if (isScanning.value) return
  isScanning.value = true

  const scan = async () => {
    try {
      const symbols = await detect({
        enableVisualization: true,
        visualizationColor: '#00ff0080',
        multipleDetection: true
      })

      if (symbols.length > 0) {
        const barcodes = symbols.map(s => s.decode('utf-8'))
        detected.value = barcodes
        
        // Stop after detection
        stopScanning()
      }
    } catch (error) {
      console.error('Detection error:', error)
    }
  }

  scanInterval.value = window.setInterval(scan, 100)
}

const stopScanning = () => {
  if (scanInterval.value) {
    clearInterval(scanInterval.value)
    scanInterval.value = null
  }
  isScanning.value = false
  stopFrameCapture()
}

const reset = () => {
  detected.value = []
  const ctx = canvas.value?.getContext('2d')
  if (ctx && canvas.value) {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  }
  camera.resume()
  startFrameCapture()
  startScanning()
}

onMounted(async () => {
  await camera.init()
  await camera.start()
  startFrameCapture()
  startScanning()
})

onUnmounted(() => {
  stopScanning()
  cleanup()
})
</script>

<template>
  <div class="scanner">
    <video ref="video" autoplay playsinline hidden></video>
    <canvas ref="canvas" class="preview"></canvas>

    <div v-if="detected.length > 0" class="results">
      <h2>Detected Barcodes</h2>
      <div v-for="(code, i) in detected" :key="i" class="barcode">
        {{ i + 1 }}. {{ code }}
      </div>
      <button @click="reset">Scan Again</button>
    </div>

    <div v-else-if="isScanning" class="scanning">
      Scanning...
    </div>
  </div>
</template>

<style scoped>
.scanner {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.preview {
  width: 100%;
  border: 2px solid #00ff00;
  border-radius: 8px;
  margin-bottom: 20px;
}

.results {
  background: #f0f0f0;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.barcode {
  padding: 10px;
  margin: 5px 0;
  background: #fff;
  border-left: 3px solid #00ff00;
  font-family: monospace;
}

.scanning {
  text-align: center;
  padding: 20px;
  color: #666;
}

button {
  width: 100%;
  padding: 12px;
  background: #00ff00;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

button:hover {
  background: #00dd00;
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
  stopFrameCapture()
  cleanup()
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

1. **Frame Capture Interval**: Adjust based on detection needs
   ```typescript
   startFrameCapture(50)  // 20fps - more frequent
   startFrameCapture(100) // 10fps - less frequent
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
```typescript
try {
  await camera.init()
  await camera.start()
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
