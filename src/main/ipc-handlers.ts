import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { fetchMetadata, startDownload, DownloadProgress } from './ytdlp';
import { ensureBinaries } from './binary-manager';
import { getSetting, setSetting, getAllSettings } from './settings';

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
  // バイナリ確認
  ipcMain.handle('check-binaries', async () => {
    return ensureBinaries();
  });

  // メタデータ取得
  ipcMain.handle('fetch-metadata', async (_event, url: string) => {
    const { ytdlp } = await ensureBinaries();
    if (!ytdlp) throw new Error('yt-dlp not found');
    return fetchMetadata(ytdlp, url);
  });

  // ダウンロード開始
  ipcMain.handle('start-download', async (event, url: string, resolution: string) => {
    const { ytdlp } = await ensureBinaries();
    if (!ytdlp) throw new Error('yt-dlp not found');

    const id = generateId();
    const win = BrowserWindow.fromWebContents(event.sender);

    const { cancel } = await startDownload(ytdlp, url, resolution, (progress: DownloadProgress) => {
      // 進捗をRendererに送信
      if (win && !win.isDestroyed()) {
        win.webContents.send('download-progress', { id, ...progress });
      }
      // 完了・エラー・重複時はアクティブから除去
      if (['complete', 'error', 'duplicate'].includes(progress.status)) {
        activeDownloads.delete(id);
      }
    });

    activeDownloads.set(id, { id, cancel });
    return id;
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

  // 設定更新
  ipcMain.handle('set-setting', async (_event, key: string, value: unknown) => {
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

  // フォルダを開く
  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    shell.openPath(folderPath);
  });

  // ファイルのフォルダを開く
  ipcMain.handle('show-in-folder', async (_event, filePath: string) => {
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
