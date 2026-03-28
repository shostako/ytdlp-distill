import Store from 'electron-store';
import { app } from 'electron';
import path from 'node:path';

export interface AppSettings {
  downloadPath: string;
  defaultResolution: string;
  ytdlpPath: string;
  ffmpegPath: string;
  maxConcurrentDownloads: number;
  windowBounds?: { x: number; y: number; width: number; height: number };
}

let store: Store<AppSettings> | null = null;

function getStore(): Store<AppSettings> {
  if (!store) {
    const defaults: AppSettings = {
      downloadPath: path.join(app.getPath('downloads'), 'YouTube'),
      defaultResolution: '1080p',
      ytdlpPath: '',
      ffmpegPath: '',
      maxConcurrentDownloads: 2,
    };
    store = new Store<AppSettings>({ defaults });
  }
  return store;
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return getStore().get(key);
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  getStore().set(key, value);
}

export function getAllSettings(): AppSettings {
  return getStore().store;
}
