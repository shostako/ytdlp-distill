import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { fetchMetadata, startDownload, DownloadProgress } from './ytdlp';
import { ensureBinaries, findBinary } from './binary-manager';
import { getSetting, setSetting, getAllSettings } from './settings';
import path from 'node:path';
import fs from 'node:fs';

interface ActiveDownload {
  id: string;
  cancel: () => void;
}

const activeDownloads = new Map<string, ActiveDownload>();
let downloadIdCounter = 0;

function generateId(): string {
  return `dl-${Date.now()}-${++downloadIdCounter}`;
}

export function registerIpcHandlers(): void {
  // バイナリ確認（検索+DL）
  ipcMain.handle('check-binaries', async () => {
    return ensureBinaries();
  });

  // バイナリ検索のみ（DLしない、初期ロード用）
  ipcMain.handle('check-binaries-exist', async () => {
    const ytdlp = await findBinary('yt-dlp');
    const ffmpeg = await findBinary('ffmpeg');
    const deno = await findBinary('deno');
    return { ytdlp, ffmpeg, deno };
  });

  // メタデータ取得
  ipcMain.handle('fetch-metadata', async (_event, url: string) => {
    const { ytdlp } = await ensureBinaries();
    if (!ytdlp) throw new Error('yt-dlp not found');
    return fetchMetadata(ytdlp, url);
  });

  // ダウンロード開始（同時DL数制限付き、TOCTOU防止）
  ipcMain.handle('start-download', async (event, url: string, resolution: string) => {
    const maxConcurrent = getSetting('maxConcurrentDownloads') || 2;
    if (activeDownloads.size >= maxConcurrent) {
      throw new Error(`Maximum concurrent downloads (${maxConcurrent}) reached. Wait for one to finish.`);
    }

    // IDを先に予約してTOCTOU防止（同時リクエストが枠を超えない）
    const id = generateId();
    activeDownloads.set(id, { id, cancel: () => {} });

    try {
      const { ytdlp } = await ensureBinaries();
      if (!ytdlp) throw new Error('yt-dlp not found');

      const win = BrowserWindow.fromWebContents(event.sender);

      const { cancel } = await startDownload(ytdlp, url, resolution, (progress: DownloadProgress) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('download-progress', { id, ...progress });
        }
        if (['complete', 'error', 'duplicate'].includes(progress.status)) {
          activeDownloads.delete(id);
        }
      });

      // cancel関数を更新
      activeDownloads.set(id, { id, cancel });
      return id;
    } catch (e) {
      activeDownloads.delete(id);
      throw e;
    }
  });

  // ダウンロードキャンセル
  ipcMain.handle('cancel-download', async (_event, id: string) => {
    const dl = activeDownloads.get(id);
    if (dl) {
      dl.cancel();
      activeDownloads.delete(id);
      return true;
    }
    return false;
  });

  // 設定取得
  ipcMain.handle('get-settings', async () => {
    return getAllSettings();
  });

  // 設定更新（許可されたキー + 型バリデーション）
  const SETTING_VALIDATORS: Record<string, (v: unknown) => boolean> = {
    downloadPath: (v) => typeof v === 'string' && v.length > 0,
    defaultResolution: (v) => typeof v === 'string' && ['360p','480p','720p','1080p','1440p','2160p','best','mp3'].includes(v as string),
    ytdlpPath: (v) => typeof v === 'string',
    ffmpegPath: (v) => typeof v === 'string',
    maxConcurrentDownloads: (v) => typeof v === 'number' && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10,
  };
  ipcMain.handle('set-setting', async (_event, key: string, value: unknown) => {
    const validator = SETTING_VALIDATORS[key];
    if (!validator) {
      throw new Error(`Invalid setting key: ${key}`);
    }
    if (!validator(value)) {
      throw new Error(`Invalid value for ${key}: ${JSON.stringify(value)}`);
    }
    setSetting(key as any, value as any);
    return true;
  });

  // フォルダ選択ダイアログ
  ipcMain.handle('select-folder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      defaultPath: getSetting('downloadPath'),
    });
    if (!result.canceled && result.filePaths[0]) {
      return result.filePaths[0];
    }
    return null;
  });

  // パス検証ヘルパー（prefix attack + symlink traversal防止）
  const isInsideDownloadDir = (targetPath: string): boolean => {
    try {
      const dlPath = fs.realpathSync(getSetting('downloadPath')) + path.sep;
      // targetPathが存在しない場合はresolveだけで比較（DL完了前のパス等）
      let resolved: string;
      try {
        resolved = fs.realpathSync(targetPath);
      } catch {
        resolved = path.resolve(targetPath);
      }
      return resolved === dlPath.slice(0, -1) || resolved.startsWith(dlPath);
    } catch {
      return false;
    }
  };

  // フォルダを開く（ダウンロードパス配下のみ許可）
  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    if (!folderPath || !isInsideDownloadDir(folderPath)) {
      throw new Error('Access denied: path outside download directory');
    }
    const error = await shell.openPath(folderPath);
    if (error) throw new Error(`Failed to open folder: ${error}`);
  });

  // ファイルのフォルダを開く（ダウンロードパス配下のみ許可）
  ipcMain.handle('show-in-folder', async (_event, filePath: string) => {
    if (!filePath || !isInsideDownloadDir(filePath)) {
      throw new Error('Access denied: path outside download directory');
    }
    shell.showItemInFolder(filePath);
  });

  // ウィンドウリサイズ
  ipcMain.handle('resize-window', async (event, width: number, height: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const [currentW, currentH] = win.getSize();
      // 大きくなる場合だけリサイズ（ユーザーが手動で縮めた場合は尊重）
      const newW = Math.max(currentW, width);
      const newH = Math.max(currentH, height);
      if (newW !== currentW || newH !== currentH) {
        win.setSize(newW, newH, true);
      }
    }
  });
}
