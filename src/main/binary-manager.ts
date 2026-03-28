import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { getSetting, setSetting } from './settings';

const execFileAsync = promisify(execFile);

const BIN_DIR = path.join(app.getPath('userData'), 'bin');

const DOWNLOAD_URLS: Record<BinaryName, string> = {
  'yt-dlp': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
  'ffmpeg': 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
  'deno': 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip',
};

/** チェックサムファイルのURL（取得できない場合は検証スキップ） */
const CHECKSUM_URLS: Record<BinaryName, string> = {
  'yt-dlp': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/SHA2-256SUMS',
  'ffmpeg': 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip.sha256',
  'deno': 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip.sha256sum',
};

export type BinaryName = 'yt-dlp' | 'ffmpeg' | 'deno';

export interface DownloadStatus {
  binary: BinaryName;
  status: 'searching' | 'downloading' | 'verifying' | 'extracting' | 'complete' | 'error';
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
 * URLからテキストを取得（リダイレクト対応）
 */
function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const mod = reqUrl.startsWith('https') ? https : http;
      mod.get(reqUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve(data));
      }).on('error', reject);
    };

    doRequest(url);
  });
}

/**
 * ファイルのSHA256ハッシュを計算
 */
function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * 公式チェックサムを取得してファイル名に対応するハッシュを返す
 */
async function fetchExpectedHash(name: BinaryName): Promise<string | null> {
  const url = CHECKSUM_URLS[name];
  try {
    const text = await fetchText(url);
    const lines = text.trim().split('\n');

    if (name === 'yt-dlp') {
      // SHA2-256SUMS形式: "hash  filename"
      for (const line of lines) {
        if (line.includes('yt-dlp.exe') && !line.includes('_')) {
          // "yt-dlp.exe" にマッチ、"yt-dlp_x86.exe" 等は除外
          return line.split(/\s+/)[0].toLowerCase();
        }
      }
    } else if (name === 'ffmpeg') {
      // 単一ハッシュ値のみのファイル、または "hash  filename" 形式
      const hash = lines[0].split(/\s+/)[0].trim();
      if (hash.length === 64) return hash.toLowerCase();
    } else if (name === 'deno') {
      // "hash  filename" 形式
      const hash = lines[0].split(/\s+/)[0].trim();
      if (hash.length === 64) return hash.toLowerCase();
    }

    return null;
  } catch {
    // チェックサムファイルが取得できなくても続行
    console.warn(`Could not fetch checksum for ${name}`);
    return null;
  }
}

/**
 * SHA256検証。不一致なら例外を投げる。チェックサム取得不可なら警告のみ。
 */
async function verifySha256(filePath: string, name: BinaryName): Promise<void> {
  sendStatus({ binary: name, status: 'verifying' });

  const expected = await fetchExpectedHash(name);
  if (!expected) {
    console.warn(`SHA256 verification skipped for ${name}: checksum not available`);
    return;
  }

  const actual = await computeSha256(filePath);

  if (actual !== expected) {
    // 不一致: ファイル削除して例外
    fs.rmSync(filePath, { force: true });
    throw new Error(
      `SHA256 mismatch for ${name}! Expected: ${expected.slice(0, 16)}... Got: ${actual.slice(0, 16)}... File deleted.`
    );
  }

  console.log(`SHA256 verified for ${name}: ${actual.slice(0, 16)}...`);
}

/**
 * zipを展開して指定exeを取り出す
 */
async function extractExeFromZip(zipPath: string, exeName: string, destDir: string): Promise<string> {
  const tempDir = path.join(destDir, '_extract_tmp');
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force`,
    ], { timeout: 120000 });

    const found = findFileRecursive(tempDir, exeName);
    if (!found) {
      throw new Error(`${exeName} not found in zip`);
    }

    const destPath = path.join(destDir, exeName);
    fs.copyFileSync(found, destPath);
    return destPath;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
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
 * バイナリをダウンロードしてbinフォルダに配置（SHA256検証付き）
 */
async function downloadBinary(name: BinaryName): Promise<string> {
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const url = DOWNLOAD_URLS[name];
  const exeName = `${name}.exe`;

  if (name === 'yt-dlp') {
    // 単体exe: DL → 検証
    const destPath = path.join(BIN_DIR, exeName);
    await downloadFile(url, destPath, name);
    await verifySha256(destPath, name);
    sendStatus({ binary: name, status: 'complete' });
    setSetting('ytdlpPath', destPath);
    return destPath;
  } else {
    // zip: DL → zip検証 → 展開
    const zipPath = path.join(BIN_DIR, `${name}.zip`);
    await downloadFile(url, zipPath, name);
    await verifySha256(zipPath, name);
    sendStatus({ binary: name, status: 'extracting' });
    const exePath = await extractExeFromZip(zipPath, exeName, BIN_DIR);
    sendStatus({ binary: name, status: 'complete' });
    if (name === 'ffmpeg') setSetting('ffmpegPath', exePath);
    return exePath;
  }
}

/**
 * 全バイナリを検索し、無ければ自動DL（SHA256検証付き）。
 */
export async function ensureBinaries(): Promise<{ ytdlp: string | null; ffmpeg: string | null; deno: string | null }> {
  const result: { ytdlp: string | null; ffmpeg: string | null; deno: string | null } = {
    ytdlp: null, ffmpeg: null, deno: null,
  };

  for (const [key, name] of [['ytdlp', 'yt-dlp'], ['ffmpeg', 'ffmpeg'], ['deno', 'deno']] as const) {
    sendStatus({ binary: name as BinaryName, status: 'searching' });
    result[key as keyof typeof result] = await findBinary(name as BinaryName);
    if (!result[key as keyof typeof result]) {
      try {
        result[key as keyof typeof result] = await downloadBinary(name as BinaryName);
      } catch (e: any) {
        sendStatus({ binary: name as BinaryName, status: 'error', error: e.message });
      }
    } else {
      sendStatus({ binary: name as BinaryName, status: 'complete' });
    }
  }

  return result;
}

export function getBinDir(): string {
  fs.mkdirSync(BIN_DIR, { recursive: true });
  return BIN_DIR;
}
