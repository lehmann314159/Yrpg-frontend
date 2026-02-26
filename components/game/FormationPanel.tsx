'use client';

import type { PartyView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface FormationPanelProps {
  party: PartyView | null;
}

export function FormationPanel({ party }: FormationPanelProps) {
  if (!party) return null;

  const charMap = new Map(party.characters.map((c) => [c.id, c]));

  return (
    <div>
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1 mb-2">
        Formation
      </h3>
      <div className="flex items-center gap-1 flex-wrap">
        {party.formation.map((id, i) => {
          const c = charMap.get(id);
          if (!c) return null;
          return (
            <div key={id} className="flex items-center gap-1">
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded border',
                  i === 0 && 'border-amber-700 text-amber-300 bg-amber-950/30',
                  i > 0 && 'border-stone-700 text-stone-300',
                  !c.isAlive && 'opacity-30 line-through',
                )}
                title={i === 0 ? 'Point character (takes traps first)' : undefined}
              >
                {c.name}
              </span>
              {i < party.formation.length - 1 && (
                <ArrowRight className="h-3 w-3 text-stone-600" />
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