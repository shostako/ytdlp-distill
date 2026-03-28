import { create } from 'zustand';
import '../../shared/types'; // Window global declaration

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
      const bins = await window.electronAPI.checkBinariesExist();
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
