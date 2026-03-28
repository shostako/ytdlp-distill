import React from 'react';

export interface VideoMetadata {
  id: string;
  title: string;
  channel: string;
  duration: number;
  durationStr: string;
  thumbnail: string;
  url: string;
}

interface VideoCardProps {
  metadata: VideoMetadata;
}

export default function VideoCard({ metadata }: VideoCardProps) {
  return (
    <div className="flex gap-3 bg-[#12121a] border border-[#1c1c2e] rounded-lg p-3 animate-fade-in">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-[120px] h-[68px] rounded overflow-hidden bg-[#1c1c2e]">
        {metadata.thumbnail ? (
          <img
            src={metadata.thumbnail}
            alt={metadata.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#555568]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-[#f5f5f7] truncate" title={metadata.title}>
          {metadata.title}
        </h3>
        <p className="text-xs text-[#8e8e93] mt-0.5 truncate">
          {metadata.channel}
          {metadata.durationStr && (
            <>
              <span className="mx-1.5">·</span>
              {metadata.durationStr}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
