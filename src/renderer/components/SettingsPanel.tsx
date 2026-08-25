import React, { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import ResolutionPicker from './ResolutionPicker';
import { useT } from '../i18n';
import { LANGUAGES, type Language } from '../../shared/i18n';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    downloadPath, defaultResolution, setDownloadPath, setDefaultResolution,
    ytdlpUpdate, checkYtdlpUpdate, updateYtdlp,
    language, setLanguage,
  } = useSettingsStore();
  const { t, te } = useT();

  // 開いた時点で版が未取得なら確認する（起動時の自動更新が走っていれば既にある）
  useEffect(() => {
    if (isOpen && ytdlpUpdate.state === 'idle') {
      checkYtdlpUpdate();
    }
  }, [isOpen, ytdlpUpdate.state, checkYtdlpUpdate]);

  if (!isOpen) return null;

  const busy = ytdlpUpdate.state === 'checking' || ytdlpUpdate.state === 'updating';
  const unknownV = t('ytdlp.unknownVersion');
  const ytdlpStatusText = (() => {
    switch (ytdlpUpdate.state) {
      case 'checking': return t('ytdlp.checking');
      case 'updating': return t('ytdlp.updatingTo', { version: ytdlpUpdate.latest ?? 'latest' }) + (typeof ytdlpUpdate.percent === 'number' ? ` (${ytdlpUpdate.percent}%)` : '');
      case 'updated': return t('ytdlp.updatedTo', { version: ytdlpUpdate.current });
      case 'up-to-date': return t('ytdlp.latest', { version: ytdlpUpdate.current ?? unknownV });
      case 'unknown': return t('ytdlp.couldNotCheck', { version: ytdlpUpdate.current ?? unknownV });
      case 'outdated': return t('ytdlp.available', { current: ytdlpUpdate.current ?? unknownV, latest: ytdlpUpdate.latest });
      case 'error': return t('ytdlp.error', { error: te(ytdlpUpdate.error) });
      default: return ytdlpUpdate.current ?? unknownV;
    }
  })();

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    await window.electronAPI.setSetting('language', lang);
  };
  const ytdlpStatusColor = (() => {
    switch (ytdlpUpdate.state) {
      case 'checking':
      case 'updating': return 'text-[#4a9eff]';
      case 'updated':
      case 'up-to-date': return 'text-[#30d158]';
      case 'outdated': return 'text-[#eab308]';
      case 'unknown': return 'text-[#8e8e93]';
      case 'error': return 'text-[#ff453a]';
      default: return 'text-[#8e8e93]';
    }
  })();

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      setDownloadPath(folder);
      await window.electronAPI.setSetting('downloadPath', folder);
    }
  };

  const handleResolutionChange = async (res: string) => {
    setDefaultResolution(res);
    await window.electronAPI.setSetting('defaultResolution', res);
  };

  const handleOpenFolder = () => {
    if (downloadPath) {
      window.electronAPI.openFolder(downloadPath);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#12121a] border border-[#1c1c2e] rounded-xl p-5 w-[380px] max-w-[90vw] shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#f5f5f7]">{t('settings.title')}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-[#1c1c2e] transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Download Path */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#8e8e93] mb-1.5 uppercase tracking-wider">
            {t('settings.downloadLocation')}
          </label>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-[#8e8e93] truncate cursor-pointer hover:border-[#3a3a4e] transition-colors duration-200"
              onClick={handleOpenFolder}
              title={downloadPath || t('settings.notSet')}
            >
              {downloadPath || t('settings.notSet')}
            </div>
            <button
              onClick={handleSelectFolder}
              className="flex-shrink-0 px-3 py-2 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg text-xs text-[#8e8e93] hover:text-[#f5f5f7] hover:border-[#3a3a4e] transition-all duration-200"
            >
              {t('settings.browse')}
            </button>
          </div>
        </div>

        {/* Default Resolution */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-[#8e8e93] mb-1.5 uppercase tracking-wider">
            {t('settings.defaultResolution')}
          </label>
          <ResolutionPicker
            value={defaultResolution}
            onChange={handleResolutionChange}
          />
        </div>

        {/* Language */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-[#8e8e93] mb-1.5 uppercase tracking-wider">
            {t('settings.language')}
          </label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50 focus:border-[#2563eb]/50 transition-all duration-200 cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: '32px',
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{t(`lang.${lang}` as const)}</option>
            ))}
          </select>
        </div>

        {/* yt-dlp version / update */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-[#8e8e93] mb-1.5 uppercase tracking-wider">
            {t('settings.ytdlp')}
          </label>
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs font-mono truncate ${ytdlpStatusColor}`}
              title={ytdlpUpdate.error ? te(ytdlpUpdate.error) : ytdlpStatusText}
            >
              {ytdlpStatusText}
            </div>
            <button
              onClick={() => (ytdlpUpdate.state === 'outdated' ? updateYtdlp() : checkYtdlpUpdate())}
              disabled={busy}
              className="flex-shrink-0 px-3 py-2 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg text-xs text-[#8e8e93] hover:text-[#f5f5f7] hover:border-[#3a3a4e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ytdlpUpdate.state === 'outdated' ? t('ytdlp.update') : t('ytdlp.check')}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#555568]">
            {t('ytdlp.hint')}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg text-sm text-[#f5f5f7] hover:bg-[#2a2a3e] transition-all duration-200"
        >
          {t('settings.close')}
        </button>
      </div>
    </div>
  );
}
