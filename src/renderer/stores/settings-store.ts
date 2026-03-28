import { create } from 'zustand';

interface SettingsStore {
  downloadPath: string;
  defaultResolution: string;
  hasBinaries: boolean;
  isLoading: boolean;
  setDownloadPath: (path: string) => void;
  setDefaultResolution: (res: string) => void;
  setHasBinaries: (has: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  loadSettings: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: {
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
    };
  }
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  downloadPath: '',
  defaultResolution: '1080p',
  hasBinaries: false,
  isLoading: true,

  setDownloadPath: (path) => set({ downloadPath: path }),
  setDefaultResolution: (res) => set({ defaultResolution: res }),
  setHasBinaries: (has) => set({ hasBinaries: has }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      const bins = await window.electronAPI.checkBinaries();
      set({
        downloadPath: settings.downloadPath || '',
        defaultResolution: settings.defaultResolution || '1080p',
        hasBinaries: !!(bins.ytdlp && bins.ffmpeg),
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ isLoading: false });
    }
  },
}));
