# Changelog

## [1.2.2] - 2026-10-05

### Fixed
- Downloads came out as **AV1** video, not H.264, at every resolution including the default 1080p. The format strings only asked for `[ext=mp4]`, and YouTube now serves AV1 in MP4. 360p to 1080p now select H.264 (`vcodec^=avc1`) and AAC (`acodec^=mp4a`) by codec. Checked with `yt-dlp -s` on a 4K test video: 1080p went from `399+258` (av01) to `299+258` (avc1).
- Audio is selected by codec (`acodec^=mp4a`) instead of by extension for every option, MP3 included.

### Changed
- 1440p, 4K and Best still download AV1/VP9 video, because YouTube has no H.264 above 1080p. The README now says so instead of promising H.264 for every option.

## [1.2.1] - 2026-08-26

### Fixed
- yt-dlp update failed with "yt-dlp.exe is in use" when the old exe was running (e.g. a URL pasted right at startup) or antivirus was still scanning the freshly downloaded file. The replacement now retries briefly, then renames the running exe aside (`yt-dlp.exe.old`) and installs the new one; the leftover is removed at next startup.

## [1.2.0] - 2026-08-26

### Added
- Japanese UI. Settings → Language: System (follows the OS locale) / English / 日本語. Switches live, no restart.
- Main-process errors are now error codes translated in the renderer; yt-dlp's own output is shown verbatim.
- Errors from starting a download (e.g. concurrency limit) are shown in the UI instead of only the console.

## [1.1.0] - 2026-08-26

### Added
- yt-dlp auto-update: on startup the bundled yt-dlp is compared against the latest GitHub release and replaced when outdated (SHA256 verified, atomic rename so a failed download never leaves a broken exe)
- Settings panel shows the installed yt-dlp version with a Check / Update button
- Banner on the main screen while updating, and an "update available" prompt when a download fails with HTTP 403

### Fixed
- Downloads failing mid-way with `HTTP Error 403: Forbidden`. Root cause: YouTube disabled the `android_vr` client streams on 2026-08-17; yt-dlp <= 2026.07.04 still used it by default. The app had no update path for yt-dlp, so every install froze on whatever version it fetched at first launch.
- `--no-update` passed to yt-dlp so its 90-day "outdated" warning no longer pollutes stderr / error messages

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
