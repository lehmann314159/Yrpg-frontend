'use client';

import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const directions = [
  { dir: 'west', icon: <ArrowLeft className="h-4 w-4" />, label: 'W' },
  { dir: 'north', icon: <ArrowUp className="h-4 w-4" />, label: 'N' },
  { dir: 'south', icon: <ArrowDown className="h-4 w-4" />, label: 'S' },
  { dir: 'east', icon: <ArrowRight className="h-4 w-4" />, label: 'E' },
] as const;

interface ExitButtonsProps {
  exits: string[];
  onExitClick: (direction: string) => void;
  disabled?: boolean;
}

export function ExitButtons({ exits, onExitClick, disabled }: ExitButtonsProps) {
  if (exits.length === 0) return null;

  return (
    <div className="flex gap-1">
      {directions.map(({ dir, icon, label }) => {
        const available = exits.includes(dir);

        return (
          <button
            key={dir}
            onClick={() => onExitClick(dir)}
            disabled={disabled || !available}
            className={cn(
              'w-10 h-10 rounded border flex items-center justify-center transition-colors',
              available
                ? 'border-stone-600 bg-stone-800 text-stone-300 hover:bg-stone-700 hover:border-stone-400 hover:text-stone-100'
                : 'border-stone-700/50 bg-stone-900/50 text-stone-700 cursor-not-allowed',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            title={available ? `Go ${dir}` : `No exit ${dir}`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}