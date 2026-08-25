/** IPC経由のビデオメタデータ */
export interface VideoMetadata {
  id: string;
  title: string;
  channel: string;
  duration: number;
  durationStr: string;
  thumbnail: string;
  url: string;
}

/** ダウンロード進捗 */
export interface DownloadProgress {
  status: 'downloading' | 'postprocess' | 'complete' | 'error' | 'duplicate';
  percent?: string;
  speed?: string;
  eta?: string;
  totalSize?: string;
  filename?: string;
  error?: string;
}

/** バイナリ検索結果 */
export interface BinaryResult {
  ytdlp: string | null;
  ffmpeg: string | null;
  deno: string | null;
}

/** yt-dlp更新チェック結果 */
export interface YtdlpUpdateInfo {
  current: string | null;
  latest: string | null;
  outdated: boolean;
}

/** yt-dlp更新実行結果 */
export interface YtdlpUpdateResult extends YtdlpUpdateInfo {
  updated: boolean;
}

/** バイナリDL進捗（main → renderer） */
export interface BinaryDownloadStatus {
  binary: 'yt-dlp' | 'ffmpeg' | 'deno';
  status: 'searching' | 'downloading' | 'verifying' | 'extracting' | 'complete' | 'error';
  percent?: number;
  error?: string;
}

/** アプリ設定 */
export interface AppSettings {
  downloadPath: string;
  defaultResolution: string;
  ytdlpPath: string;
  ffmpegPath: string;
  maxConcurrentDownloads: number;
  windowBounds?: { x: number; y: number; width: number; height: number };
}

/** Renderer → Main IPC API */
export interface ElectronAPI {
  checkBinaries: () => Promise<BinaryResult>;
  checkBinariesExist: () => Promise<BinaryResult>;
  checkYtdlpUpdate: () => Promise<YtdlpUpdateInfo>;
  updateYtdlp: () => Promise<YtdlpUpdateResult>;
  fetchMetadata: (url: string) => Promise<VideoMetadata>;
  startDownload: (url: string, resolution: string) => Promise<string>;
  cancelDownload: (id: string) => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  setSetting: (key: string, value: unknown) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  openFolder: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
  onDownloadProgress: (callback: (data: DownloadProgress & { id: string }) => void) => () => void;
  onBinaryDownloadStatus: (callback: (data: BinaryDownloadStatus) => void) => () => void;
  resizeWindow: (width: number, height: number) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
