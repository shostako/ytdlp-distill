import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  checkBinaries: () => ipcRenderer.invoke('check-binaries'),
  checkBinariesExist: () => ipcRenderer.invoke('check-binaries-exist'),
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
