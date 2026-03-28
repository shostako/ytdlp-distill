import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  checkBinaries: () => Promise<{ ytdlp: string | null; ffmpeg: string | null; deno: string | null }>;
  fetchMetadata: (url: string) => Promise<any>;
  startDownload: (url: string, resolution: string) => Promise<string>;
  cancelDownload: (id: string) => Promise<boolean>;
  getSettings: () => Promise<any>;
  setSetting: (key: string, value: unknown) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  openFolder: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
  onDownloadProgress: (callback: (data: any) => void) => () => void;
  onBinaryDownloadStatus: (callback: (data: any) => void) => () => void;
  resizeWindow: (width: number, height: number) => Promise<void>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  checkBinaries: () => ipcRenderer.invoke('check-binaries'),
  fetchMetadata: (url: string) => ipcRenderer.invoke('fetch-metadata', url),
  startDownload: (url: string, resolution: string) => ipcRenderer.invoke('start-download', url, resolution),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  showInFolder: (path: string) => ipcRenderer.invoke('show-in-folder', path),
  onDownloadProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  onBinaryDownloadStatus: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('binary-download-status', handler);
    return () => ipcRenderer.removeListener('binary-download-status', handler);
  },
  resizeWindow: (width: number, height: number) => ipcRenderer.invoke('resize-window', width, height),
} satisfies ElectronAPI);
