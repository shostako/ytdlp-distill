import React from 'react';
import { useSettingsStore } from '../stores/settings-store';
import ResolutionPicker from './ResolutionPicker';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { downloadPath, defaultResolution, setDownloadPath, setDefaultResolution } =
    useSettingsStore();

  if (!isOpen) return null;

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
          <h2 className="text-base font-semibold text-[#f5f5f7]">Settings</h2>
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
            Download Location
          </label>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-[#8e8e93] truncate cursor-pointer hover:border-[#3a3a4e] transition-colors duration-200"
              onClick={handleOpenFolder}
              title={downloadPath || 'Not set'}
            >
              {downloadPath || 'Not set'}
            </div>
            <button
              onClick={handleSelectFolder}
              className="flex-shrink-0 px-3 py-2 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg text-xs text-[#8e8e93] hover:text-[#f5f5f7] hover:border-[#3a3a4e] transition-all duration-200"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Default Resolution */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-[#8e8e93] mb-1.5 uppercase tracking-wider">
            Default Resolution
          </label>
          <ResolutionPicker
            value={defaultResolution}
            onChange={handleResolutionChange}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg text-sm text-[#f5f5f7] hover:bg-[#2a2a3e] transition-all duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
