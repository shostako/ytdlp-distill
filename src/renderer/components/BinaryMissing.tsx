import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';

interface BinaryStatus {
  binary: string;
  status: 'searching' | 'downloading' | 'verifying' | 'extracting' | 'complete' | 'error';
  percent?: number;
  error?: string;
}

export default function BinaryMissing() {
  const [isSetup, setIsSetup] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, BinaryStatus>>({});
  const [setupDone, setSetupDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { setHasBinaries } = useSettingsStore();

  // Listen for binary download status
  useEffect(() => {
    const unsubscribe = window.electronAPI.onBinaryDownloadStatus((data: BinaryStatus) => {
      setStatuses(prev => ({ ...prev, [data.binary]: data }));
    });
    return unsubscribe;
  }, []);

  // Check if all binaries are complete
  useEffect(() => {
    const all = Object.values(statuses);
    if (all.length >= 2) { // yt-dlp + ffmpeg minimum
      const ytdlpOk = statuses['yt-dlp']?.status === 'complete';
      const ffmpegOk = statuses['ffmpeg']?.status === 'complete';
      if (ytdlpOk && ffmpegOk) {
        setSetupDone(true);
        setTimeout(() => setHasBinaries(true), 1000);
      }
      const anyError = all.some(s => s.status === 'error');
      if (anyError) setHasError(true);
    }
  }, [statuses, setHasBinaries]);

  const handleSetup = async () => {
    setIsSetup(true);
    setHasError(false);
    setStatuses({});
    try {
      const bins = await window.electronAPI.checkBinaries();
      if (bins.ytdlp && bins.ffmpeg) {
        setHasBinaries(true);
      }
    } catch (err) {
      console.error('Setup failed:', err);
      setHasError(true);
    }
  };

  const getStatusText = (name: string): string => {
    const s = statuses[name];
    if (!s) return 'Waiting...';
    switch (s.status) {
      case 'searching': return 'Searching...';
      case 'downloading': return s.percent ? `Downloading ${s.percent}%` : 'Downloading...';
      case 'verifying': return 'Verifying SHA256...';
      case 'extracting': return 'Extracting...';
      case 'complete': return 'Verified & Ready';
      case 'error': return `Error: ${s.error || 'Unknown'}`;
      default: return 'Waiting...';
    }
  };

  const getStatusColor = (name: string): string => {
    const s = statuses[name];
    if (!s) return 'text-[#555568]';
    switch (s.status) {
      case 'searching': return 'text-[#8e8e93]';
      case 'downloading':
      case 'verifying':
      case 'extracting': return 'text-[#4a9eff]';
      case 'complete': return 'text-[#30d158]';
      case 'error': return 'text-[#ff453a]';
      default: return 'text-[#555568]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]">
      <div className="bg-[#12121a] border border-[#1c1c2e] rounded-xl p-6 w-[380px] max-w-[90vw] text-center animate-fade-in">
        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-[#4a9eff]/10 flex items-center justify-center">
            {setupDone ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-[#f5f5f7] mb-2">
          {setupDone ? 'Setup Complete' : isSetup ? 'Setting Up...' : 'First-Time Setup'}
        </h2>

        <p className="text-sm text-[#8e8e93] mb-5">
          {setupDone
            ? 'All tools are ready. Starting the app...'
            : isSetup
              ? 'Downloading required tools. This only happens once.'
              : 'This app needs to download a few tools to work. This only takes a minute.'}
        </p>

        {/* Progress display during setup */}
        {isSetup && (
          <div className="text-left bg-[#1c1c2e] rounded-lg p-4 mb-5 space-y-3">
            {['yt-dlp', 'ffmpeg', 'deno'].map(name => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#c4c4cc]">{name}</span>
                <span className={`text-xs font-mono ${getStatusColor(name)}`}>
                  {getStatusText(name)}
                </span>
              </div>
            ))}
            {/* Progress bar for active download */}
            {Object.values(statuses).some(s => s.status === 'downloading' && s.percent) && (
              <div className="w-full bg-[#2a2a3e] rounded-full h-1.5 mt-2">
                <div
                  className="bg-[#4a9eff] h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Object.values(statuses).find(s => s.status === 'downloading')?.percent || 0}%`
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error retry */}
        {hasError && !setupDone && (
          <p className="text-xs text-[#ff453a] mb-3">
            Some downloads failed. Check your internet connection and try again.
          </p>
        )}

        {/* Action button */}
        {!setupDone && (
          <button
            onClick={handleSetup}
            disabled={isSetup && !hasError}
            className="w-full py-2.5 bg-[#ff3b30] hover:bg-[#e6352b] text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSetup && !hasError ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                Setting up...
              </>
            ) : hasError ? (
              'Retry'
            ) : (
              'Set Up Now'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
