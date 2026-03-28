import React from 'react';
import { useDownloadStore, DownloadItem, DownloadStatus } from '../stores/download-store';

/** Status color mapping */
function statusColor(status: DownloadStatus): string {
  switch (status) {
    case 'downloading':
      return '#3b82f6'; // blue
    case 'postprocess':
      return '#eab308'; // yellow
    case 'complete':
      return '#22c55e'; // green
    case 'error':
      return '#ef4444'; // red
    case 'duplicate':
      return '#6b7280'; // gray
    case 'cancelled':
      return '#6b7280'; // gray
    default:
      return '#8e8e93';
  }
}

/** Human-readable status label */
function statusLabel(status: DownloadStatus): string {
  switch (status) {
    case 'downloading':
      return 'Downloading';
    case 'postprocess':
      return 'Processing';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    case 'duplicate':
      return 'Already downloaded';
    case 'cancelled':
      return 'Cancelled';
    case 'pending':
      return 'Pending';
    case 'fetching':
      return 'Fetching...';
    default:
      return status;
  }
}

function isFinished(status: DownloadStatus): boolean {
  return ['complete', 'error', 'duplicate', 'cancelled'].includes(status);
}

function DownloadItemRow({ item }: { item: DownloadItem }) {
  const { updateDownload } = useDownloadStore();
  const color = statusColor(item.status);
  const finished = isFinished(item.status);
  const percentNum = item.percent ? parseFloat(item.percent.replace('%', '')) : 0;

  const handleCancel = async () => {
    try {
      await window.electronAPI.cancelDownload(item.id);
      updateDownload(item.id, { status: 'cancelled' });
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const handleShowInFolder = () => {
    if (item.filename) {
      window.electronAPI.showInFolder(item.filename);
    }
  };

  return (
    <div className="bg-[#12121a] border border-[#1c1c2e] rounded-lg p-3 animate-fade-in">
      {/* Title + action row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm text-[#f5f5f7] truncate flex-1" title={item.title}>
          {item.title || 'Untitled'}
        </span>
        {!finished && (
          <button
            onClick={handleCancel}
            title="Cancel download"
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#8e8e93] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {item.status === 'complete' && item.filename && (
          <button
            onClick={handleShowInFolder}
            title="Show in folder"
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#8e8e93] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar (only for downloading/postprocess) */}
      {(item.status === 'downloading' || item.status === 'postprocess') && (
        <div className="w-full h-1.5 bg-[#1c1c2e] rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out progress-shimmer"
            style={{
              width: item.status === 'postprocess' ? '100%' : `${Math.min(percentNum, 100)}%`,
              backgroundImage:
                item.status === 'postprocess'
                  ? 'linear-gradient(90deg, #eab308, #f59e0b, #eab308)'
                  : 'linear-gradient(90deg, #ff3b30, #ff6b5b, #ff3b30)',
            }}
          />
        </div>
      )}

      {/* Status + details row */}
      <div className="flex items-center justify-between text-xs">
        <span style={{ color }}>
          {statusLabel(item.status)}
          {item.status === 'downloading' && item.percent && (
            <span className="ml-1 text-[#8e8e93]">{item.percent}</span>
          )}
        </span>
        <span className="text-[#555568]">
          {item.status === 'downloading' && (
            <>
              {item.speed && <span>{item.speed}</span>}
              {item.eta && item.eta !== 'Unknown' && (
                <span className="ml-2">ETA {item.eta}</span>
              )}
            </>
          )}
          {item.status === 'error' && item.error && (
            <span className="text-[#ef4444]/70 truncate max-w-[200px]" title={item.error}>
              {item.error.slice(0, 50)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function DownloadList() {
  const { downloads, clearCompleted } = useDownloadStore();

  if (downloads.length === 0) {
    return null;
  }

  const hasFinished = downloads.some((dl) => isFinished(dl.status));

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-[#8e8e93] uppercase tracking-wider">
          Downloads
        </h2>
        {hasFinished && (
          <button
            onClick={clearCompleted}
            className="text-xs text-[#8e8e93] hover:text-[#f5f5f7] transition-colors duration-200"
          >
            Clear completed
          </button>
        )}
      </div>

      {/* Download items */}
      <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[300px]">
        {downloads.map((dl) => (
          <DownloadItemRow key={dl.id} item={dl} />
        ))}
      </div>
    </div>
  );
}
