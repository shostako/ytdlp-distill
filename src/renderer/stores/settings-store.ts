import { create } from 'zustand';
import type { YtdlpUpdateInfo } from '../../shared/types';

/** 'unknown' = 最新版が取得できず比較していない（up-to-date と混同しない） */
export type YtdlpUpdateState = 'idle' | 'checking' | 'updating' | 'updated' | 'up-to-date' | 'outdated' | 'unknown' | 'error';

export interface YtdlpUpdateStatus extends YtdlpUpdateInfo {
  state: YtdlpUpdateState;
  percent?: number;
  error?: string;
}

interface SettingsStore {
  downloadPath: string;
  defaultResolution: string;
  hasBinaries: boolean;
  isLoading: boolean;
  ytdlpUpdate: YtdlpUpdateStatus;
  setDownloadPath: (path: string) => void;
  setDefaultResolution: (res: string) => void;
  setHasBinaries: (has: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setYtdlpUpdate: (patch: Partial<YtdlpUpdateStatus>) => void;
  loadSettings: () => Promise<void>;
  checkYtdlpUpdate: () => Promise<void>;
  /** 古ければ更新する。auto=true は起動時の無人実行（失敗しても静かに記録するだけ） */
  updateYtdlp: (auto?: boolean) => Promise<void>;
}

const IDLE_UPDATE: YtdlpUpdateStatus = { state: 'idle', current: null, latest: null, outdated: false };

/** 比較結果 → 表示状態。latest が無い = 比較できていないので 'unknown' */
function stateFromInfo(info: YtdlpUpdateInfo): YtdlpUpdateState {
  if (info.latest === null) return 'unknown';
  return info.outdated ? 'outdated' : 'up-to-date';
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  downloadPath: '',
  defaultResolution: '1080p',
  hasBinaries: false,
  isLoading: true,
  ytdlpUpdate: IDLE_UPDATE,

  setDownloadPath: (path) => set({ downloadPath: path }),
  setDefaultResolution: (res) => set({ defaultResolution: res }),
  setHasBinaries: (has) => set({ hasBinaries: has }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setYtdlpUpdate: (patch) => set((s) => ({ ytdlpUpdate: { ...s.ytdlpUpdate, ...patch } })),

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

  checkYtdlpUpdate: async () => {
    const { state } = get().ytdlpUpdate;
    if (state === 'checking' || state === 'updating') return;
    set((s) => ({ ytdlpUpdate: { ...s.ytdlpUpdate, state: 'checking', error: undefined } }));
    try {
      const info = await window.electronAPI.checkYtdlpUpdate();
      set({ ytdlpUpdate: { ...info, state: stateFromInfo(info) } });
    } catch (err: any) {
      set((s) => ({ ytdlpUpdate: { ...s.ytdlpUpdate, state: 'error', error: err?.message || String(err) } }));
    }
  },

  updateYtdlp: async (auto = false) => {
    const { state } = get().ytdlpUpdate;
    if (state === 'updating') return;
    set((s) => ({ ytdlpUpdate: { ...s.ytdlpUpdate, state: 'checking', error: undefined, percent: undefined } }));
    try {
      // まず比較だけして、更新が要る時だけ 'updating' に遷移（バナー表示はここから）
      const info = await window.electronAPI.checkYtdlpUpdate();
      if (!info.outdated) {
        set({ ytdlpUpdate: { ...info, state: stateFromInfo(info) } });
        return;
      }
      set({ ytdlpUpdate: { ...info, state: 'updating', percent: 0 } });
      const result = await window.electronAPI.updateYtdlp();
      set({ ytdlpUpdate: { ...result, state: result.updated ? 'updated' : stateFromInfo(result), percent: undefined } });
    } catch (err: any) {
      const message = err?.message || String(err);
      if (auto) console.warn('yt-dlp auto-update failed:', message);
      set((s) => ({ ytdlpUpdate: { ...s.ytdlpUpdate, state: 'error', error: message, percent: undefined } }));
    }
  },
}));
