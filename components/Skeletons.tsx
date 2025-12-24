import React from 'react';

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="w-full aspect-video rounded-lg sm:rounded-xl bg-yt-gray animate-pulse" />
      <div className="flex flex-col gap-2">
        <div className="h-4 bg-yt-gray rounded animate-pulse w-5/6" />
        <div className="h-3 bg-yt-gray rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-6 sm:gap-y-8 sm:gap-x-4 px-2 sm:px-0">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}
