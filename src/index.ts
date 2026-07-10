export { useZbar } from "./composiable/zbar";
export type { DetectionConfig } from "./composiable/zbar";
export {
  scanBlob,
  scanCanvas,
  scanImage,
  scanImageBitmap,
  scanImageData,
  scanImageElement,
  scanImages,
  scanSource,
} from "./core/scan";
export type { ScanOptions, ScanResult, ScanSource } from "./core/scan";
export type {
  Point,
  ZBarConfigType,
  ZBarImage,
  ZBarModuleArgs,
  ZBarOrientation,
  ZBarScanner,
  ZBarSymbol,
  ZBarSymbolType,
} from "@undecaf/zbar-wasm";
