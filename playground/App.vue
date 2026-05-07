<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useZbar } from '@/composiable/zbar';
import type { ZBarSymbol } from "@undecaf/zbar-wasm";

const { camera, detect, video, canvas, cleanup, startFrameCapture, stopFrameCapture } = useZbar();

const detected = ref<string[]>([]);
const isScanning = ref<boolean>(false);
const lastDetectionTime = ref<number>(0);
const scanInterval = ref<number | null>(null);
const multipleDetectionMode = ref<boolean>(false);

// Configuration for barcode scanning
const SCAN_INTERVAL = 100; // milliseconds between scans
const MIN_DETECTION_INTERVAL = 50; // minimum ms between detections

/**
 * Process detected barcodes
 */
const handleDetection = (symbols: ZBarSymbol[]): void => {
  if (symbols.length === 0) return;

  const now = performance.now();

  // Throttle detections to prevent excessive updates
  if (now - lastDetectionTime.value < MIN_DETECTION_INTERVAL) {
    return;
  }

  // Stop frame capture to freeze the last frame
  stopFrameCapture();

  // Pause camera to prevent further video updates
  camera.pause();

  // Stop scanning
  stopScanning();

  // Decode all detected barcodes
  const decodedValues = multipleDetectionMode.value 
    ? symbols.map((symbol) => symbol.decode('utf-8')).filter(Boolean) 
    : [symbols[0].decode('utf-8')];

  if (decodedValues.length > 0) {
    detected.value = decodedValues;
    lastDetectionTime.value = now;
    console.log('Barcodes detected:', decodedValues);
  }
};

/**
 * Start continuous barcode scanning
 */
const startScanning = (): void => {
  if (isScanning.value) return;
  isScanning.value = true;

  const scan = async () => {
    try {
      const symbols = await detect({
        enableVisualization: true,
        visualizationColor: '#00ff0080',
        visualizationLineWidth: 2,
        multipleDetection: multipleDetectionMode.value,
      });
      handleDetection(symbols);
    } catch (error) {
      console.error('Scanning error:', error);
    }
  };

  scanInterval.value = window.setInterval(scan, SCAN_INTERVAL);
};

/**
 * Stop barcode scanning
 */
const stopScanning = (): void => {
  if (scanInterval.value !== null) {
    clearInterval(scanInterval.value);
    scanInterval.value = null;
  }
  isScanning.value = false;
};

/**
 * Reset detected barcodes and resume scanning
 */
const resetDetection = (): void => {
  detected.value = [];

  // Clear canvas
  const ctx = canvas.value?.getContext('2d');
  if (ctx && canvas.value) {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  }

  // Resume camera
  camera.resume();

  // Start frame capture again
  startFrameCapture();

  // Begin scanning
  startScanning();
};

onMounted(async () => {
  try {
    // Initialize camera
    await camera.init();

    // Start camera stream
    await camera.start();

    // Start capturing frames to canvas
    startFrameCapture();

    // Begin scanning
    startScanning();
  } catch (error) {
    console.error('Camera initialization error:', error);
  }
});

onUnmounted(() => {
  // Cleanup resources
  stopScanning();
  stopFrameCapture();
  cleanup();
});
</script>

<template>
  <div class="app-layout">
    <video ref="video" autoplay playsinline hidden></video>

    <!-- Camera Section -->
    <section class="camera-section">
      <div class="camera-wrapper">
        <canvas ref="canvas" class="scanner-canvas"></canvas>
        <div v-if="isScanning && detected.length === 0" class="scanning-indicator">
          <div class="spinner"></div>
          <p>Scanning...</p>
        </div>
      </div>
    </section>

    <!-- Controls Section -->
    <section class="controls-section">
      <div class="controls-container">
        <h3>Detection Settings</h3>
        <div class="control-group">
          <label class="checkbox-label">
            <input v-model="multipleDetectionMode" type="checkbox" />
            <span>Multiple Barcode Detection</span>
          </label>
          <p class="control-hint">
            {{ multipleDetectionMode ? 'Detecting multiple barcodes' : 'Detecting single barcode' }}
          </p>
        </div>
      </div>
    </section>

    <!-- Result Section -->
    <section class="result-section">
      <div class="result-container">
        <div v-if="detected.length > 0" class="detection-result">
          <h3>Detected Barcode{{ detected.length > 1 ? 's' : '' }}</h3>
          
          <div v-if="detected.length === 1" class="single-barcode">
            <div class="barcode-value">{{ detected[0] }}</div>
          </div>

          <div v-else class="multiple-barcodes">
            <div class="barcode-count">{{ detected.length }} Barcodes Found</div>
            <div class="barcode-items">
              <div v-for="(code, index) in detected" :key="index" class="barcode-item">
                <span class="barcode-index">{{ index + 1 }}</span>
                <span class="barcode-text">{{ code }}</span>
              </div>
            </div>
          </div>

          <button @click="resetDetection" class="btn-reset">
            Scan Another
          </button>
        </div>

        <div v-else class="no-result">
          <p>{{ isScanning ? 'Waiting for barcode detection...' : 'Not scanning' }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: #0a0a0a;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Camera Section */
.camera-section {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}

.camera-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 4 / 3;
}

.scanner-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border: 2px solid #00ff00;
  border-radius: 8px;
  background: #000;
  object-fit: cover;
}

.scanning-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.scanning-indicator p {
  font-size: 14px;
  color: #00ff00;
  font-weight: 500;
}

/* Controls Section */
.controls-section {
  flex: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #0f0f0f;
  border-bottom: 1px solid #333;
}

.controls-container {
  width: 100%;
  max-width: 600px;
}

.controls-container h3 {
  font-size: 14px;
  font-weight: 600;
  color: #00ff00;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #00ff00;
}

.checkbox-label span {
  font-size: 14px;
  font-weight: 500;
}

.control-hint {
  font-size: 12px;
  color: #888;
  margin-top: 6px;
}

/* Result Section */
.result-section {
  flex: 1.4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #050505;
  overflow-y: auto;
}

.result-container {
  width: 100%;
  max-width: 600px;
  max-height: 100%;
}

.detection-result {
  background: rgba(0, 255, 0, 0.08);
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 20px;
  animation: slideUp 0.3s ease-out;
}

.detection-result h3 {
  font-size: 14px;
  font-weight: 600;
  color: #00ff00;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.single-barcode {
  margin-bottom: 15px;
}

.barcode-value {
  font-size: 20px;
  font-weight: bold;
  font-family: 'Courier New', 'Courier', monospace;
  word-break: break-all;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 4px solid #00ff00;
  border-radius: 4px;
  letter-spacing: 1px;
}

.multiple-barcodes {
  margin-bottom: 15px;
}

.barcode-count {
  font-size: 14px;
  font-weight: 600;
  color: #00ff00;
  margin-bottom: 12px;
}

.barcode-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 8px;
}

.barcode-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px 12px;
  border-left: 4px solid #00ff00;
  border-radius: 4px;
}

.barcode-index {
  font-weight: 600;
  color: #00ff00;
  min-width: 24px;
  font-size: 12px;
}

.barcode-text {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 12px;
  word-break: break-all;
  flex: 1;
}

.no-result {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 14px;
}

.btn-reset {
  width: 100%;
  background: #00ff00;
  color: #000;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-reset:hover {
  background: #00dd00;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 0, 0.3);
}

.btn-reset:active {
  transform: translateY(0);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 255, 0, 0.2);
  border-top-color: #00ff00;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar Styling */
.barcode-items::-webkit-scrollbar {
  width: 6px;
}

.barcode-items::-webkit-scrollbar-track {
  background: rgba(0, 255, 0, 0.1);
  border-radius: 3px;
}

.barcode-items::-webkit-scrollbar-thumb {
  background: #00ff00;
  border-radius: 3px;
}

.barcode-items::-webkit-scrollbar-thumb:hover {
  background: #00dd00;
}

/* Responsive Design */
@media (max-width: 768px) {
  .app-layout {
    height: auto;
  }

  .camera-section {
    flex: 1;
    min-height: 300px;
  }

  .controls-section {
    flex: auto;
    min-height: auto;
  }

  .result-section {
    flex: auto;
    min-height: 300px;
  }

  .camera-wrapper {
    max-width: 100%;
  }

  .barcode-value {
    font-size: 16px;
  }

  .btn-reset {
    padding: 10px 16px;
    font-size: 12px;
  }
}
</style>