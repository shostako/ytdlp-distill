import React, { useState, useRef, useCallback, useEffect } from 'react';

const YOUTUBE_URL_RE = /https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be|music\.youtube\.com)\//;

interface UrlInputProps {
  onUrlDetected: (url: string) => void;
  isFetching: boolean;
  disabled: boolean;
}

export default function UrlInput({ onUrlDetected, isFetching, disabled }: UrlInputProps) {
  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced validation + fetch trigger
  const scheduleCheck = useCallback(
    (url: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (YOUTUBE_URL_RE.test(url.trim())) {
          onUrlDetected(url.trim());
        }
      }, 500);
    },
    [onUrlDetected]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    scheduleCheck(newVal);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    // Will be set via onChange, but we can trigger immediately for paste
    if (YOUTUBE_URL_RE.test(pasted.trim())) {
      // Cancel any pending debounce since paste is immediate
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Let the onChange fire first to update the value, then trigger
      setTimeout(() => onUrlDetected(pasted.trim()), 0);
    }
  };

  const handleClipboardButton = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text);
      if (YOUTUBE_URL_RE.test(text.trim())) {
        onUrlDetected(text.trim());
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="Paste a YouTube URL"
          disabled={disabled}
          className="w-full bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg px-4 py-2.5 pr-10 text-sm text-[#f5f5f7] placeholder-[#555568] focus:outline-none focus:ring-2 focus:ring-[#ff3b30]/50 focus:border-[#ff3b30]/50 transition-all duration-200 disabled:opacity-50"
        />
        {isFetching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#ff3b30]/30 border-t-[#ff3b30] rounded-full spinner" />
          </div>
        )}
      </div>

      <button
        onClick={handleClipboardButton}
        disabled={disabled || isFetching}
        title="Paste from clipboard"
        className="flex-shrink-0 p-2.5 bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg text-[#8e8e93] hover:text-[#f5f5f7] hover:border-[#3a3a4e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Clipboard icon (SVG) */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="2" width="6" height="4" rx="1" />
          <path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
        </svg>
      </button>
    </div>
  );
}
