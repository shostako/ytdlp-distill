import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { getSetting } from './settings';
import { findBinary } from './binary-manager';

/** 解像度 → yt-dlpフォーマット文字列（AAC強制） */
const FORMAT_MAP: Record<string, string> = {
  '360p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best[height<=360]',
  '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]',
  '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]',
  '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]',
  '1440p': 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best[height<=1440]',
  '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]',
  'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
  'mp3': 'bestaudio[ext=m4a]/bestaudio',
};

export interface DownloadProgress {
  status: 'downloading' | 'postprocess' | 'complete' | 'error' | 'duplicate';
  percent?: string;
  speed?: string;
  eta?: string;
  totalSize?: string;
  filename?: string;
  error?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  channel: string;
  duration: number;
  durationStr: string;
  thumbnail: string;
  url: string;
}

/**
 * yt-dlp実行用の環境変数を構築（denoをPATHに追加）
 */
async function getSpawnEnv(): Promise<NodeJS.ProcessEnv> {
  const env = { ...process.env };
  const denoPath = await findBinary('deno');
  if (denoPath) {
    const denoDir = path.dirname(denoPath);
    env.PATH = denoDir + (process.platform === 'win32' ? ';' : ':') + (env.PATH || '');
  }
  // ffmpegもPATHに追加
  const ffmpegPath = getSetting('ffmpegPath');
  if (ffmpegPath) {
    const ffmpegDir = path.dirname(ffmpegPath);
    env.PATH = ffmpegDir + (process.platform === 'win32' ? ';' : ':') + (env.PATH || '');
  }
  return env;
}

function getArchivePath(): string {
  const dlPath = getSetting('downloadPath');
  return path.join(dlPath, '.yt-archive.txt');
}

function getOutputTemplate(): string {
  const dlPath = getSetting('downloadPath');
  return path.join(dlPath, '%(title)s [%(id)s].%(ext)s');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * yt-dlp --dump-json でメタデータ取得
 */
export async function fetchMetadata(ytdlpPath: string, url: string): Promise<VideoMetadata> {
  const env = await getSpawnEnv();
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, ['--dump-json', '--no-download', url], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        return;
      }
      try {
        const info = JSON.parse(stdout);
        resolve({
          id: info.id,
          title: info.title || 'Unknown',
          channel: info.channel || info.uploader || 'Unknown',
          duration: info.duration || 0,
          durationStr: formatDuration(info.duration || 0),
          thumbnail: info.thumbnail || '',
          url,
        });
      } catch (e) {
        reject(new Error(`Failed to parse metadata: ${e}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * yt-dlp でダウンロード実行。進捗はコールバックで返す。
 */
export async function startDownload(
  ytdlpPath: string,
  url: string,
  resolution: string,
  onProgress: (progress: DownloadProgress) => void,
): Promise<{ process: ChildProcess; cancel: () => void }> {
  const formatStr = FORMAT_MAP[resolution] || FORMAT_MAP['1080p'];
  const dlPath = getSetting('downloadPath');

  // ダウンロードフォルダを確保
  fs.mkdirSync(dlPath, { recursive: true });

  const args = [
    '-f', formatStr,
    '--merge-output-format', resolution === 'mp3' ? 'mp4' : 'mp4',
    '--download-archive', getArchivePath(),
    '-o', getOutputTemplate(),
    '--newline',
    '--progress-template', 'download:PROGRESS|%(progress.status)s|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_str)s',
    '--progress-template', 'postprocess:POSTPROCESS|%(progress.status)s',
    '--no-colors',
    url,
  ];

  // MP3モード
  if (resolution === 'mp3') {
    args.splice(0, 4); // -f と --merge-output-format を除去
    args.unshift('-f', FORMAT_MAP['mp3'], '--extract-audio', '--audio-format', 'mp3');
  }

  const spawnEnv = await getSpawnEnv();
  const proc = spawn(ytdlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: spawnEnv,
  });

  let lastFilename = '';

  const parseLine = (line: string) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('PROGRESS|')) {
      const parts = trimmed.split('|');
      // PROGRESS|status|percent|speed|eta|total
      onProgress({
        status: 'downloading',
        percent: parts[2]?.trim(),
        speed: parts[3]?.trim(),
        eta: parts[4]?.trim(),
        totalSize: parts[5]?.trim(),
      });
    } else if (trimmed.startsWith('POSTPROCESS|')) {
      onProgress({ status: 'postprocess' });
    } else if (trimmed.includes('has already been recorded in the archive')) {
      onProgress({ status: 'duplicate' });
    } else if (trimmed.startsWith('[Merger] Merging formats into')) {
      const match = trimmed.match(/"(.+)"/);
      if (match) lastFilename = match[1];
      onProgress({ status: 'postprocess' });
    } else if (trimmed.startsWith('[download] Destination:')) {
      // ファイル名を追跡
      lastFilename = trimmed.replace('[download] Destination:', '').trim();
    }
  };

  let stdoutBuf = '';
  proc.stdout.on('data', (data: Buffer) => {
    stdoutBuf += data.toString();
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop() || '';
    lines.forEach(parseLine);
  });

  let stderrBuf = '';
  proc.stderr.on('data', (data: Buffer) => {
    stderrBuf += data.toString();
    // stderrも行単位でパース（一部の進捗情報がstderrに出る）
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop() || '';
    lines.forEach(parseLine);
  });

  proc.on('close', (code) => {
    // バッファ残りを処理
    if (stdoutBuf.trim()) parseLine(stdoutBuf);
    if (stderrBuf.trim()) parseLine(stderrBuf);

    if (code === 0) {
      const outputPath = lastFilename
        ? path.join(dlPath, path.basename(lastFilename))
        : '';
      onProgress({ status: 'complete', filename: outputPath });
    } else {
      onProgress({ status: 'error', error: stderrBuf || `Exit code: ${code}` });
    }
  });

  proc.on('error', (err) => {
    onProgress({ status: 'error', error: err.message });
  });

  return {
    process: proc,
    cancel: () => {
      try { proc.kill('SIGTERM'); } catch { /* ignore */ }
    },
  };
}

export { FORMAT_MAP };
