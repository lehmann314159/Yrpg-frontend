'use client';

import { cn } from '@/lib/utils';
import { ScrollText } from 'lucide-react';

interface CombatLogProps {
  entries: string[];
}

export function CombatLog({ entries }: CombatLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <ScrollText className="h-3.5 w-3.5 text-stone-400" />
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          Combat Log
        </h3>
      </div>
      <div className="space-y-0.5 max-h-32 overflow-y-auto">
        {entries.map((entry, i) => (
          <p
            key={i}
            className={cn(
              'text-xs font-mono',
              i === entries.length - 1 ? 'text-stone-200' : 'text-stone-500',
            )}
          >
            {entry}
          </p>
        ))}
      </div>
    </div>
  );
}