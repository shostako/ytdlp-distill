import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { getSetting, setSetting } from './settings';

const execFileAsync = promisify(execFile);

const BIN_DIR = path.join(app.getPath('userData'), 'bin');

const DOWNLOAD_URLS = {
  'yt-dlp': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
  'ffmpeg': 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
  'deno': 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip',
};

export type BinaryName = 'yt-dlp' | 'ffmpeg' | 'deno';

export interface DownloadStatus {
  binary: BinaryName;
  status: 'searching' | 'downloading' | 'extracting' | 'complete' | 'error';
  percent?: number;
  error?: string;
}

function sendStatus(status: DownloadStatus): void {
  const wins = BrowserWindow.getAllWindows();
  for (const win of wins) {
    if (!win.isDestroyed()) {
      win.webContents.send('binary-download-status', status);
    }
  }
}

/**
 * HTTPSでファイルをダウンロード（リダイレクト対応）
 */
function downloadFile(url: string, dest: string, binaryName: BinaryName): Promise<void> {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const mod = reqUrl.startsWith('https') ? https : http;
      mod.get(reqUrl, (res) => {
        // リダイレクト処理
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${reqUrl}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        res.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            sendStatus({
              binary: binaryName,
              status: 'downloading',
              percent: Math.round((downloadedBytes / totalBytes) * 100),
            });
          }
        });

        const file = createWriteStream(dest);
        pipeline(res, file)
          .then(() => resolve())
          .catch(reject);
      }).on('error', reject);
    };

    doRequest(url);
  });
}

/**
 * zipを展開して指定exeを取り出す（Node.js標準のみ使用）
 */
async function extractExeFromZip(zipPath: string, exeName: string, destDir: string): Promise<string> {
  // PowerShellのExpand-Archiveでzip展開
  const tempDir = path.join(destDir, '_extract_tmp');
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force`,
    ], { timeout: 120000 });

    // exe を再帰検索
    const found = findFileRecursive(tempDir, exeName);
    if (!found) {
      throw new Error(`${exeName} not found in zip`);
    }

    const destPath = path.join(destDir, exeName);
    fs.copyFileSync(found, destPath);
    return destPath;
  } finally {
    // 一時ディレクトリ削除
    fs.rmSync(tempDir, { recursive: true, force: true });
    // zipも削除
    fs.rmSync(zipPath, { force: true });
  }
}

function findFileRecursive(dir: string, target: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, target);
      if (found) return found;
    } else if (entry.name.toLowerCase() === target.toLowerCase()) {
      return fullPath;
    }
  }
  return null;
}

/**
 * バイナリを検索する。見つからなければnull。
 */
export async function findBinary(name: BinaryName): Promise<string | null> {
  const settingKey = name === 'yt-dlp' ? 'ytdlpPath' : name === 'ffmpeg' ? 'ffmpegPath' : null;
  const exeName = process.platform === 'win32' ? `${name}.exe` : name;

  // 1. 設定に保存されたパス
  if (settingKey) {
    const configured = getSetting(settingKey);
    if (configured && fs.existsSync(configured)) {
      return configured;
    }
  }

  // 2. アプリのbinフォルダ
  const binPath = path.join(BIN_DIR, exeName);
  if (fs.existsSync(binPath)) {
    if (settingKey) setSetting(settingKey, binPath);
    return binPath;
  }

  // 3. よくある場所
  const commonPaths = [
    path.join(app.getPath('downloads'), exeName),
    path.join(app.getPath('exe'), '..', exeName),
    path.join(app.getPath('home'), exeName),
  ];
  // deno用: AppData\Local\deno
  if (name === 'deno' && process.platform === 'win32') {
    commonPaths.push(path.join(app.getPath('home'), 'AppData', 'Local', 'deno', 'deno.exe'));
    commonPaths.push(path.join(app.getPath('home'), '.deno', 'bin', 'deno.exe'));
  }

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      if (settingKey) setSetting(settingKey, p);
      return p;
    }
  }

  // 4. PATH検索
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execFileAsync(cmd, [exeName]);
    const found = stdout.trim().split('\n')[0].trim();
    if (found && fs.existsSync(found)) {
      if (settingKey) setSetting(settingKey, found);
      return found;
    }
  } catch {
    // not found
  }

  return null;
}

/**
 * バイナリをダウンロードしてbinフォルダに配置
 */
async function downloadBinary(name: BinaryName): Promise<string> {
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const url = DOWNLOAD_URLS[name];
  const exeName = `${name}.exe`;

  if (name === 'yt-dlp') {
    // 単体exe: 直接ダウンロード
    const destPath = path.join(BIN_DIR, exeName);
    await downloadFile(url, destPath, name);
    sendStatus({ binary: name, status: 'complete' });
    setSetting('ytdlpPath', destPath);
    return destPath;
  } else {
    // zip: ダウンロード → 展開 → exe取り出し
    const zipPath = path.join(BIN_DIR, `${name}.zip`);
    await downloadFile(url, zipPath, name);
    sendStatus({ binary: name, status: 'extracting' });
    const exePath = await extractExeFromZip(zipPath, exeName, BIN_DIR);
    sendStatus({ binary: name, status: 'complete' });
    if (name === 'ffmpeg') setSetting('ffmpegPath', exePath);
    return exePath;
  }
}

/**
 * 全バイナリを検索し、無ければ自動DL。
 * RendererにIPCで進捗通知する。
 */
export async function ensureBinaries(): Promise<{ ytdlp: string | null; ffmpeg: string | null; deno: string | null }> {
  const result: { ytdlp: string | null; ffmpeg: string | null; deno: string | null } = {
    ytdlp: null, ffmpeg: null, deno: null,
  };

  // yt-dlp
  sendStatus({ binary: 'yt-dlp', status: 'searching' });
  result.ytdlp = await findBinary('yt-dlp');
  if (!result.ytdlp) {
    try {
      result.ytdlp = await downloadBinary('yt-dlp');
    } catch (e: any) {
      sendStatus({ binary: 'yt-dlp', status: 'error', error: e.message });
    }
  } else {
    sendStatus({ binary: 'yt-dlp', status: 'complete' });
  }

  // ffmpeg
  sendStatus({ binary: 'ffmpeg', status: 'searching' });
  result.ffmpeg = await findBinary('ffmpeg');
  if (!result.ffmpeg) {
    try {
      result.ffmpeg = await downloadBinary('ffmpeg');
    } catch (e: any) {
      sendStatus({ binary: 'ffmpeg', status: 'error', error: e.message });
    }
  } else {
    sendStatus({ binary: 'ffmpeg', status: 'complete' });
  }

  // deno
  sendStatus({ binary: 'deno', status: 'searching' });
  result.deno = await findBinary('deno');
  if (!result.deno) {
    try {
      result.deno = await downloadBinary('deno');
    } catch (e: any) {
      sendStatus({ binary: 'deno', status: 'error', error: e.message });
    }
  } else {
    sendStatus({ binary: 'deno', status: 'complete' });
  }

  return result;
}

export function getBinDir(): string {
  fs.mkdirSync(BIN_DIR, { recursive: true });
  return BIN_DIR;
}
