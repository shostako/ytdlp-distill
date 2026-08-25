import { create } from 'zustand';
import type { YtdlpUpdateInfo } from '../../shared/types';
import { resolveLocale, type Language, type Locale } from '../../shared/i18n';

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
  language: Language;
  systemLocale: string;
  /** language と systemLocale から導出した実際の表示言語 */
  locale: Locale;
  ytdlpUpdate: YtdlpUpdateStatus;
  setLanguage: (language: Language) => void;
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

/** <html lang> を同期する（日本語フォントのフォールバックは lang で切り替える） */
function applyLocale(locale: Locale): Locale {
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  return locale;
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
  language: 'system',
  systemLocale: '',
  locale: 'en',
  ytdlpUpdate: IDLE_UPDATE,

  setLanguage: (language) => set((s) => ({ language, locale: applyLocale(resolveLocale(language, s.systemLocale)) })),

  setDownloadPath: (path) => set({ downloadPath: path }),
  setDefaultResolution: (res) => set({ defaultResolution: res }),
  setHasBinaries: (has) => set({ hasBinaries: has }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setYtdlpUpdate: (patch) => set((s) => ({ ytdlpUpdate: { ...s.ytdlpUpdate, ...patch } })),

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      const systemLocale = await window.electronAPI.getSystemLocale().catch(() => '');
      const bins = await window.electronAPI.checkBinariesExist();
      const language: Language = settings.language || 'system';
      set({
        downloadPath: settings.downloadPath || '',
        defaultResolution: settings.defaultResolution || '1080p',
        hasBinaries: !!(bins.ytdlp && bins.ffmpeg),
        language,
        systemLocale,
        locale: applyLocale(resolveLocale(language, systemLocale)),
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
    // 'checking' 中も弾く。遅れて返った check の結果が 'updating' を上書きして進捗バナーを消すのを防ぐ
    if (state === 'checking' || state === 'updating') return;
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
