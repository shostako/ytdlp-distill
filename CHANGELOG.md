# Changelog

## [1.0.1] - 2026-03-29

### Security
- SHA256 verification for all downloaded binaries (yt-dlp, ffmpeg, deno)
- IPC input validation: setting key allowlist + type/range checks
- Path access restricted to download directory (symlink/junction traversal prevention)
- TOCTOU fix for concurrent download limit enforcement

### Fixed
- Download state overwrites: duplicate no longer becomes "complete", cancel no longer becomes "error"
- URL change now triggers new metadata fetch (previously stuck on first URL)
- Metadata race condition: rapid URL changes no longer show stale results
- Full stderr preserved for error reporting (no more truncated error messages)
- Binary setup flow: initial load searches only, download triggered by user action
- `shell.openPath` error return value now handled
- URL regex: `youtube.com/watch?v=` was not matching (required `/` after `watch`)
- Focus ring color changed from red to blue (consistent with Download button)

### Added
- Concurrent download limit enforced (maxConcurrentDownloads setting, default 2)
- Shared type definitions (`src/shared/types.ts`)
- `check-binaries-exist` IPC for search-only (no download)
- Settings screenshot in README
- Resolution options table in README

### Changed
- Menu bar removed
- Settings icon changed to gear
- Download button color changed to blue
- Window auto-resizes based on content
- Compact initial window size

## [1.0.0] - 2026-03-28

### Added
- Initial release
- Electron + React + TypeScript desktop app
- AAC audio enforced (Opus-in-MP4 avoidance) for universal playback
- Resolution selection: 360p, 480p, 720p, 1080p, 1440p, 4K, Best, MP3
- Auto-download yt-dlp, ffmpeg, deno on first launch
- Video metadata preview with thumbnails
- Download progress tracking with real-time percentage, speed, ETA
- Duplicate detection via download archive
- Configurable save location
- Dark theme, compact auto-resizing window
- Right-click context menu (Cut, Copy, Paste, Select All)
- Settings panel (download path, default resolution)
- Windows installer (Squirrel)
