import { create } from 'zustand';

export type DownloadStatus = 'pending' | 'fetching' | 'downloading' | 'postprocess' | 'complete' | 'error' | 'duplicate' | 'cancelled';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  resolution: string;
  status: DownloadStatus;
  percent?: string;
  speed?: string;
  eta?: string;
  totalSize?: string;
  filename?: string;
  error?: string;
  startedAt: number;
}

interface DownloadStore {
  downloads: DownloadItem[];
  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  downloads: [],

  addDownload: (item) =>
    set((state) => ({ downloads: [item, ...state.downloads] })),

  updateDownload: (id, updates) =>
    set((state) => ({
      downloads: state.downloads.map((dl) =>
        dl.id === id ? { ...dl, ...updates } : dl
      ),
    })),

  removeDownload: (id) =>
    set((state) => ({
      downloads: state.downloads.filter((dl) => dl.id !== id),
    })),

  clearCompleted: () =>
    set((state) => ({
      downloads: state.downloads.filter(
        (dl) => !['complete', 'error', 'duplicate', 'cancelled'].includes(dl.status)
      ),
    })),
}));
