# Changelog

All notable changes to VueScanr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-15

### Added
- Initial release of VueScanr
- Vue 3 composable `useZbar` for barcode detection
- Real-time barcode scanning with camera integration
- Support for single and multiple barcode detection
- Visual feedback with detection boundary visualization
- Comprehensive TypeScript definitions
- Frame capture and detection separation for better performance
- Camera control interface (init, start, pause, resume, stop)
- Configurable detection options (visualization, colors, line width)
- Professional UI demo in playground
- Complete API documentation in USAGE.md
- MIT License
- Support for all zbar-wasm barcode formats

### Features
- ✨ Real-time barcode detection from camera feed
- 🎯 Single and multiple barcode detection modes
- 📸 WebAssembly-powered scanning with zbar-wasm
- 🖼️ Visual feedback with detection boundaries
- ⚡ Optimized performance with frame caching
- 📱 Mobile-friendly implementation
- 🔄 Proper resource cleanup
- 📦 Full TypeScript support
- 🌐 Cross-browser compatibility

### Dependencies
- `@undecaf/zbar-wasm@^0.11.0` - WebAssembly barcode scanner
- `vue3cam-lib@^0.0.6` - Camera handling library
- `vue@^3.5.0` - Vue 3 framework

## Unreleased

### Planned Features
- QR code detection optimization
- Barcode validation utilities
- Decoder plugins system
- Performance benchmarking tools
- Extended barcode format support
- Custom visualization templates
- Barcode data export utilities
- Integration examples with popular frameworks

### Under Consideration
- React integration
- Svelte integration
- Standalone JavaScript API
- Web Worker support for detection
- Advanced filtering and noise reduction
- OCR capabilities
- Batch processing mode

## Version History

### Version 0.1.0
**Release Date:** January 15, 2024

First stable release with complete barcode detection functionality.

## Security

For security issues, please email: security@example.com instead of using the issue tracker.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.
