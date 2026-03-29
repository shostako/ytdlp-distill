# ytdlp-distill

## 概要
YouTube動画をAAC音声強制でダウンロードするWindowsデスクトップアプリ。
yt-dlpのGUIフロントエンド。Opus-in-MP4問題を回避し、どのプレーヤーでも再生可能なMP4を生成する。

## Tech Stack
- Electron + React 19 + TypeScript + Tailwind CSS 3 + Zustand
- yt-dlp / ffmpeg / deno（初回起動時に自動DL、SHA256検証付き）

## 開発環境
- **ソース管理**: WSL側 `/home/shostako/ClaudeCode/ytdlp-distill/`
- **実行テスト**: Windows側 `C:\Users\shost\ClaudeCode\ytdlp-distill/`
- **開発フロー**: WSLで編集 → rsyncでWindows側sync → Windows側 `npm start`
- **ビルド**: Windows側で `npm run make` → `out/make/squirrel.windows/x64/`
- **GitHub**: `shostako/ytdlp-distill`（Public）

## 重要なファイル
| ファイル | 内容 |
|---------|------|
| `src/main/ytdlp.ts` | yt-dlpプロセス管理、AAC強制フォーマット文字列、進捗パース |
| `src/main/binary-manager.ts` | バイナリ検出・自動DL・SHA256検証 |
| `src/main/ipc-handlers.ts` | IPC全チャネル、セキュリティバリデーション |
| `src/main/settings.ts` | electron-store設定管理 |
| `src/renderer/App.tsx` | ルートコンポーネント |
| `src/shared/types.ts` | 共有型定義 |

## Gotchas
- WSLgでElectronは表示不可。テストは必ずWindows側で
- DPIスケーリング125%環境。スクショは `Take-AppScreenshot.ps1` を使う
- electron-store v11はESM only → v8にダウングレード済み
- Viteバンドル後はrequire()動的importが使えない（静的importのみ）
- ウィンドウ位置設定が壊れたら `%APPDATA%/ytdlp-distill/config.json` を削除

## Codex Review結果
評価: **Good** — High/Medium全件対応済み
残り Low 2件: 型定義重複、ESLint互換性
