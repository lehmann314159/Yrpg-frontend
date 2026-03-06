'use client';

import { cn } from '@/lib/utils';
import { Paintbrush, Loader2 } from 'lucide-react';

interface SceneImageProps {
  imageUrl: string | null;
  isLoading: boolean;
  prompt?: string | null;
}

export function SceneImage({ imageUrl, isLoading, prompt }: SceneImageProps) {
  if (!imageUrl && !isLoading) return null;

  return (
    <div className="w-[512px] max-w-full">
    <div className="relative aspect-square rounded-lg border border-stone-700 overflow-hidden bg-stone-900/50">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Scene"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Paintbrush className="h-8 w-8 text-stone-600" />
        </div>
      )}
      {isLoading && (
        <div className={cn(
          'absolute bottom-2 right-2 flex items-center gap-1.5',
          'px-2 py-1 rounded bg-stone-900/80 border border-stone-700',
        )}>
          <Loader2 className="h-3 w-3 text-stone-400 animate-spin" />
          <span className="text-xs text-stone-400">Painting...</span>
        </div>
      )}
    </div>
    {prompt && (
      <p className="mt-1 text-[10px] text-stone-500 leading-tight truncate" title={prompt}>
        {prompt}
      </p>
    )}
    </div>
  );
}
