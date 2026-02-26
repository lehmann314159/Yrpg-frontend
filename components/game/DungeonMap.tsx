'use client';

import type { MapCell } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DungeonMapProps {
  grid: MapCell[][];
}

const statusStyles: Record<MapCell['status'], string> = {
  unknown: 'bg-stone-900 border-stone-800',
  visited: 'bg-stone-700 border-stone-600',
  current: 'bg-amber-700 border-amber-500',
  adjacent: 'bg-stone-800 border-stone-500 border-dashed',
  exit: 'bg-emerald-900 border-emerald-600',
};

export function DungeonMap({ grid }: DungeonMapProps) {
  if (!grid || grid.length === 0) return null;

  // Find bounds of non-unknown cells to avoid rendering a huge empty grid
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let hasAny = false;

  for (const row of grid) {
    for (const cell of row) {
      if (cell.status !== 'unknown') {
        hasAny = true;
        minX = Math.min(minX, cell.x);
        maxX = Math.max(maxX, cell.x);
        minY = Math.min(minY, cell.y);
        maxY = Math.max(maxY, cell.y);
      }
    }
  }

  if (!hasAny) return null;

  // Add 1 cell padding
  minX = Math.max(0, minX - 1);
  maxX = Math.min(grid[0]?.length - 1 || maxX, maxX + 1);
  minY = Math.max(0, minY - 1);
  maxY = Math.min(grid.length - 1, maxY + 1);

  const cols = maxX - minX + 1;

  return (
    <div>
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1 mb-2">
        Dungeon Map
      </h3>
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${cols}, 1.5rem)` }}
      >
        {/* Render top-to-bottom: maxY first */}
        {Array.from({ length: maxY - minY + 1 }).map((_, rowIdx) => {
          const y = maxY - rowIdx;
          return Array.from({ length: cols }).map((_, colIdx) => {
            const x = minX + colIdx;
            const cell = grid[y]?.[x];
            if (!cell) {
              return <div key={`${x}-${y}`} className="w-6 h-6" />;
            }

            return (
              <div
                key={`${x}-${y}`}
                className={cn(
                  'w-6 h-6 rounded-sm border flex items-center justify-center text-[8px]',
                  statusStyles[cell.status],
                  cell.hasPlayer && 'ring-1 ring-amber-400',
                )}
                title={`(${cell.x}, ${cell.y}) ${cell.status}${cell.roomId ? ` - ${cell.roomId}` : ''}`}
              >
                {cell.hasPlayer && <span className="text-amber-300 font-bold">@</span>}
                {cell.status === 'exit' && !cell.hasPlayer && (
                  <span className="text-emerald-400 font-bold">E</span>
                )}
              </div>
            );
          });
        })}
      </div>
      <div className="flex gap-3 mt-1.5 text-[9px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-amber-700 inline-block" /> Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-stone-700 inline-block" /> Visited
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-900 inline-block" /> Exit
        </span>
      </div>
    </div>
  );
}