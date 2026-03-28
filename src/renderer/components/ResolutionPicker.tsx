import React from 'react';

const RESOLUTIONS = [
  { label: '360p', value: '360p' },
  { label: '480p', value: '480p' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: '1440p', value: '1440p' },
  { label: '4K', value: '2160p' },
  { label: 'Best', value: 'best' },
  { label: 'MP3', value: 'mp3' },
];

interface ResolutionPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function ResolutionPicker({ value, onChange, disabled }: ResolutionPickerProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[#1c1c2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#ff3b30]/50 focus:border-[#ff3b30]/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '32px',
      }}
    >
      {RESOLUTIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

export { RESOLUTIONS };
