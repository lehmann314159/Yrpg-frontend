'use client';

import type { PartyView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';

interface FormationPanelProps {
  party: PartyView | null;
  onReorder?: (formation: string[]) => void;
  disabled?: boolean;
}

export function FormationPanel({ party, onReorder, disabled }: FormationPanelProps) {
  if (!party) return null;

  const charMap = new Map(party.characters.map((c) => [c.id, c]));
  const canReorder = onReorder && !disabled;

  const swap = (index: number, direction: -1 | 1) => {
    if (!onReorder) return;
    const next = [...party.formation];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1 mb-2">
        Formation
      </h3>
      <div className="flex flex-col gap-1">
        {party.formation.map((id, i) => {
          const c = charMap.get(id);
          if (!c) return null;
          const isFirst = i === 0;
          const isLast = i === party.formation.length - 1;
          return (
            <div key={id} className="flex flex-col items-center">
              <div className="flex items-center gap-1 w-full">
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded border flex-1 text-center',
                    isFirst && 'border-amber-700 text-amber-300 bg-amber-950/30',
                    !isFirst && 'border-stone-700 text-stone-300',
                    !c.isAlive && 'opacity-30 line-through',
                  )}
                  title={isFirst ? 'Point character (takes traps first)' : undefined}
                >
                  {c.name}
                </span>
                {canReorder && (
                  <span className="flex flex-col">
                    <button
                      onClick={() => swap(i, -1)}
                      disabled={isFirst}
                      className={cn(
                        'p-0 transition-colors',
                        isFirst ? 'text-stone-800 cursor-default' : 'text-stone-500 hover:text-stone-200',
                      )}
                      title="Move forward"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => swap(i, 1)}
                      disabled={isLast}
                      className={cn(
                        'p-0 transition-colors',
                        isLast ? 'text-stone-800 cursor-default' : 'text-stone-500 hover:text-stone-200',
                      )}
                      title="Move back"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              {!isLast && (
                <ArrowDown className="h-3 w-3 text-stone-600 my-0.5" />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-stone-600 mt-1 px-1">
        First in line takes traps on room entry
      </p>
    </div>
  );
}