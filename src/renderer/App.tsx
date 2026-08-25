import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from './stores/settings-store';
import { useDownloadStore } from './stores/download-store';
import UrlInput from './components/UrlInput';
import VideoCard, { VideoMetadata } from './components/VideoCard';
import ResolutionPicker from './components/ResolutionPicker';
import DownloadList from './components/DownloadList';
import SettingsPanel from './components/SettingsPanel';
import BinaryMissing from './components/BinaryMissing';
import { useT } from './i18n';

export default function App() {
  const {
    downloadPath,
    defaultResolution,
    hasBinaries,
    isLoading,
    loadSettings,
    ytdlpUpdate,
    setYtdlpUpdate,
    updateYtdlp,
    checkYtdlpUpdate,
  } = useSettingsStore();

  const { addDownload, updateDownload } = useDownloadStore();
  const { t, te } = useT();

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [resolution, setResolution] = useState(defaultResolution);
  const [isDownloading, setIsDownloading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync resolution when default changes
  useEffect(() => {
    setResolution(defaultResolution);
  }, [defaultResolution]);

  // Load settings and set up progress listener on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Set up download progress listener
  useEffect(() => {
    const unsubscribe = window.electronAPI.onDownloadProgress((data: any) => {
      updateDownload(data.id, {
        status: data.status,
        percent: data.percent,
        speed: data.speed,
        eta: data.eta,
        totalSize: data.totalSize,
        filename: data.filename,
        error: data.error,
      });
      // 403 = yt-dlpが古い典型パターン。最新版があるか確認してバナーで促す
      if (data.status === 'error' && typeof data.error === 'string' && /HTTP Error 403/i.test(data.error)) {
        checkYtdlpUpdate();
      }
    });

    return unsubscribe;
  }, [updateDownload, checkYtdlpUpdate]);

  // 起動時にyt-dlpを自動更新（YouTube側の変更で古い版が突然死ぬのを防ぐ）
  useEffect(() => {
    if (hasBinaries) {
      updateYtdlp(true);
    }
  }, [hasBinaries, updateYtdlp]);

  // yt-dlp更新中のDL進捗をバナーに反映
  useEffect(() => {
    const unsubscribe = window.electronAPI.onBinaryDownloadStatus((data) => {
      if (data.binary !== 'yt-dlp') return;
      if (data.status === 'downloading' && typeof data.percent === 'number') {
        setYtdlpUpdate({ percent: data.percent });
      } else if (data.status === 'verifying') {
        setYtdlpUpdate({ percent: 100 });
      }
    });
    return unsubscribe;
  }, [setYtdlpUpdate]);

  // 「更新完了」バナーは数秒で消す
  useEffect(() => {
    if (ytdlpUpdate.state !== 'updated') return;
    const timer = setTimeout(() => setYtdlpUpdate({ state: 'up-to-date' }), 6000);
    return () => clearTimeout(timer);
  }, [ytdlpUpdate.state, setYtdlpUpdate]);

  // リクエスト順序管理（古いリクエストの結果を破棄するため）
  const fetchIdRef = useRef(0);

  // Fetch metadata when a valid YouTube URL is detected
  const handleUrlDetected = useCallback(async (url: string) => {
    const thisId = ++fetchIdRef.current;

    setIsFetching(true);
    setFetchError(null);
    setMetadata(null);

    try {
      const meta = await window.electronAPI.fetchMetadata(url);
      // 古いリクエストの結果なら破棄
      if (thisId !== fetchIdRef.current) return;
      setMetadata(meta);
      window.electronAPI.resizeWindow(420, 360);
    } catch (err: any) {
      if (thisId !== fetchIdRef.current) return;
      setFetchError(err?.message ? te(err.message) : t('app.fetchFailed'));
      console.error('Metadata fetch error:', err);
    } finally {
      if (thisId === fetchIdRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  // Start download
  const handleDownload = useCallback(async () => {
    if (!metadata || isDownloading) return;

    setIsDownloading(true);

    try {
      const downloadId = await window.electronAPI.startDownload(
        metadata.url,
        resolution
      );

      addDownload({
        id: downloadId,
        url: metadata.url,
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        resolution,
        status: 'downloading',
        startedAt: Date.now(),
      });
      // DLリスト表示分ウィンドウを拡げる
      window.electronAPI.resizeWindow(420, 500);
    } catch (err: any) {
      console.error('Download start error:', err);
      // 同時DL上限などの main 側エラーをユーザーに見せる（従来は console のみ）
      setFetchError(te(err?.message) || String(err));
    } finally {
      setIsDownloading(false);
    }
  }, [metadata, resolution, isDownloading, addDownload]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#ff3b30]/30 border-t-[#ff3b30] rounded-full spinner" />
      </div>
    );
  }

  // Binary missing overlay
  if (!hasBinaries) {
    return <BinaryMissing />;
  }

  return (
    <div className="flex flex-col min-h-screen p-2 gap-2 select-none">
      {/* Header with settings gear */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#f5f5f7] tracking-tight">
          {t('app.brand')}
        </h1>
        <button
          onClick={() => setSettingsOpen(true)}
          title={t('app.settings')}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-[#1c1c2e] transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      {/* yt-dlp update banner */}
      {ytdlpUpdate.state === 'updating' && (
        <div className="text-xs text-[#4a9eff] bg-[#4a9eff]/10 border border-[#4a9eff]/20 rounded-lg px-3 py-2 animate-fade-in flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-[#4a9eff]/30 border-t-[#4a9eff] rounded-full spinner flex-shrink-0" />
          <span className="truncate">
            {t('banner.updating', { from: ytdlpUpdate.current ?? '?', to: ytdlpUpdate.latest ?? 'latest' })}
            {typeof ytdlpUpdate.percent === 'number' ? ` (${ytdlpUpdate.percent}%)` : ''}
          </span>
        </div>
      )}
      {ytdlpUpdate.state === 'updated' && (
        <div className="text-xs text-[#30d158] bg-[#30d158]/10 border border-[#30d158]/20 rounded-lg px-3 py-2 animate-fade-in">
          {t('banner.updated', { version: ytdlpUpdate.current })}
        </div>
      )}
      {ytdlpUpdate.state === 'outdated' && (
        <div className="text-xs text-[#eab308] bg-[#eab308]/10 border border-[#eab308]/20 rounded-lg px-3 py-2 animate-fade-in flex items-center justify-between gap-2">
          <span className="truncate">{t('banner.outdated', { latest: ytdlpUpdate.latest, current: ytdlpUpdate.current ?? t('ytdlp.unknownVersion') })}</span>
          <button
            onClick={() => updateYtdlp()}
            className="flex-shrink-0 px-2 py-0.5 rounded bg-[#eab308]/20 hover:bg-[#eab308]/30 text-[#eab308] transition-colors duration-200"
          >
            {t('banner.update')}
          </button>
        </div>
      )}
      {ytdlpUpdate.state === 'error' && (
        <div className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-3 py-2 animate-fade-in flex items-center justify-between gap-2">
          <span className="truncate" title={te(ytdlpUpdate.error)}>{t('banner.updateFailed', { error: te(ytdlpUpdate.error) })}</span>
          <button
            onClick={() => setYtdlpUpdate({ state: 'idle', error: undefined })}
            className="flex-shrink-0 text-[#ef4444]/70 hover:text-[#ef4444]"
            title={t('banner.dismiss')}
          >
            ×
          </button>
        </div>
      )}

      {/* URL Input */}
      <UrlInput
        onUrlDetected={handleUrlDetected}
        isFetching={isFetching}
        disabled={false}
      />

      {/* Fetch error */}
      {fetchError && (
        <div className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-3 py-2 animate-fade-in">
          {fetchError}
        </div>
      )}

      {/* Video Card */}
      {metadata && <VideoCard metadata={metadata} />}

      {/* Controls row: Resolution + Save location + Download button */}
      {metadata && (
        <div className="flex items-center gap-2 animate-fade-in">
          <ResolutionPicker
            value={resolution}
            onChange={setResolution}
            disabled={isDownloading}
          />

          {/* Save location display */}
          <div
            className="flex-1 min-w-0 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-[#555568] truncate cursor-pointer hover:border-[#3a3a4e] transition-colors duration-200"
            onClick={() => downloadPath && window.electronAPI.openFolder(downloadPath)}
            title={downloadPath || t('settings.notSet')}
          >
            {downloadPath
              ? downloadPath.split(/[/\\]/).slice(-2).join('/')
              : t('app.noSaveLocation')}
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading || !metadata}
            className="flex-shrink-0 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            {t('app.download')}
          </button>
        </div>
      )}

      {/* Download List */}
      <div className="flex-1 min-h-0 overflow-hidden mt-1">
        <DownloadList />
      </div>

      {/* Settings Modal */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
