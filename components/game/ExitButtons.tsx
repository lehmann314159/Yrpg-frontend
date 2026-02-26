'use client';

import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const directionConfig = {
  north: { icon: <ArrowUp className="h-4 w-4" />, label: 'N', row: 0, col: 1 },
  west: { icon: <ArrowLeft className="h-4 w-4" />, label: 'W', row: 1, col: 0 },
  east: { icon: <ArrowRight className="h-4 w-4" />, label: 'E', row: 1, col: 2 },
  south: { icon: <ArrowDown className="h-4 w-4" />, label: 'S', row: 2, col: 1 },
} as const;

interface ExitButtonsProps {
  exits: string[];
  onExitClick: (direction: string) => void;
  disabled?: boolean;
}

export function ExitButtons({ exits, onExitClick, disabled }: ExitButtonsProps) {
  if (exits.length === 0) return null;

  return (
    <div className="inline-grid grid-cols-3 gap-1" style={{ width: 'fit-content' }}>
      {Object.entries(directionConfig).map(([dir, config]) => {
        const available = exits.includes(dir);
        const gridArea = { gridRow: config.row + 1, gridColumn: config.col + 1 };

        if (!available) {
          return <div key={dir} style={gridArea} />;
        }

        return (
          <button
            key={dir}
            onClick={() => onExitClick(dir)}
            disabled={disabled}
            style={gridArea}
            className={cn(
              'w-10 h-10 rounded border flex items-center justify-center transition-colors',
              'border-stone-600 bg-stone-800 text-stone-300',
              'hover:bg-stone-700 hover:border-stone-400 hover:text-stone-100',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            title={`Go ${dir}`}
          >
            {config.icon}
          </button>
        );
      })}
    </div>
  );
}
