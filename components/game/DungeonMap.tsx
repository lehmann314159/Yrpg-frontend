'use client';

import type { MapCell } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DungeonMapProps {
  grid: MapCell[][];
}

const statusStyles: Record<MapCell['status'], string> = {
  unknown: 'bg-stone-900/50 border-stone-800/40',
  visited: 'bg-stone-700 border-stone-600',
  current: 'bg-amber-700 border-amber-500',
  adjacent: 'bg-stone-800 border-stone-500 border-dashed',
  exit: 'bg-emerald-900 border-emerald-600',
};

// Direction → exit name mapping
const exitDirections: Record<string, [number, number]> = {
  north: [0, 1],
  south: [0, -1],
  east: [1, 0],
  west: [-1, 0],
};

export function DungeonMap({ grid }: DungeonMapProps) {
  if (!grid || grid.length === 0) return null;

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (cols === 0) return null;

  console.log('[DungeonMap] grid dimensions:', rows, 'x', cols, 'statuses:', grid.flat().map(c => c.status));

  const maxY = rows - 1;

  // Build CSS grid template: interleaved room (1.75rem) + corridor (0.25rem) tracks
  // For N rooms: N room tracks + (N-1) corridor tracks
  const colTemplate = Array.from({ length: cols }, (_, i) =>
    i < cols - 1 ? '1.75rem 0.25rem' : '1.75rem'
  ).join(' ');
  const rowTemplate = Array.from({ length: rows }, (_, i) =>
    i < rows - 1 ? '1.75rem 0.25rem' : '1.75rem'
  ).join(' ');

  // Collect corridor segments
  const corridors: { key: string; gridColumn: number; gridRow: number; horizontal: boolean }[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y]?.[x];
      if (!cell?.exits) continue;
      // Only render corridors if this cell is not unknown (or neighbor is not unknown)
      for (const exit of cell.exits) {
        const dir = exitDirections[exit];
        if (!dir) continue;
        const [dx, dy] = dir;
        const nx = x + dx;
        const ny = y + dy;
        // Only add each corridor once: east and north from each cell
        if (exit === 'east' && nx < cols) {
          const cssCol = x * 2 + 2; // corridor column (1-indexed)
          const cssRow = (maxY - y) * 2 + 1;
          corridors.push({ key: `h-${x}-${y}`, gridColumn: cssCol, gridRow: cssRow, horizontal: true });
        } else if (exit === 'north' && ny < rows) {
          const cssCol = x * 2 + 1;
          const cssRow = (maxY - y) * 2; // one row above (north = +Y, but CSS row decreases upward)
          corridors.push({ key: `v-${x}-${y}`, gridColumn: cssCol, gridRow: cssRow, horizontal: false });
        }
      }
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1 mb-2">
        Dungeon Map v2
      </h3>
      <div
        className="inline-grid"
        style={{
          gridTemplateColumns: colTemplate,
          gridTemplateRows: rowTemplate,
        }}
      >
        {/* Room cells */}
        {Array.from({ length: rows }, (_, rowIdx) => {
          const y = maxY - rowIdx;
          return Array.from({ length: cols }, (_, colIdx) => {
            const x = colIdx;
            const cell = grid[y]?.[x];
            const cssCol = x * 2 + 1;
            const cssRow = rowIdx * 2 + 1;

            if (!cell) {
              return (
                <div
                  key={`r-${x}-${y}`}
                  style={{ gridColumn: cssCol, gridRow: cssRow }}
                  className="w-7 h-7"
                />
              );
            }

            return (
              <div
                key={`r-${x}-${y}`}
                style={{ gridColumn: cssCol, gridRow: cssRow }}
                className={cn(
                  'w-7 h-7 rounded-sm border flex items-center justify-center text-[8px]',
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

        {/* Corridor segments */}
        {corridors.map((c) => (
          <div
            key={c.key}
            style={{ gridColumn: c.gridColumn, gridRow: c.gridRow }}
            className={cn(
              'rounded-full bg-stone-600',
              c.horizontal ? 'w-full h-1 self-center' : 'h-full w-1 justify-self-center',
            )}
          />
        ))}
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
