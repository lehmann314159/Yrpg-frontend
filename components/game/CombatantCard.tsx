'use client';

import type { CombatantView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface CombatantCardProps {
  combatant: CombatantView;
  isCurrentTurn: boolean;
}

export function CombatantCard({ combatant, isCurrentTurn }: CombatantCardProps) {
  const c = combatant;
  if (!c.isAlive) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded border px-2 py-1.5 text-xs',
        c.isPlayerChar ? 'border-blue-800 bg-blue-950/30' : 'border-red-800 bg-red-950/30',
        isCurrentTurn && 'ring-1 ring-amber-500',
      )}
    >
      <span className={cn('font-bold', c.isPlayerChar ? 'text-blue-300' : 'text-red-300')}>
        {c.name}
      </span>
      <Progress
        value={c.hp}
        max={c.maxHp}
        indicatorClassName={c.isPlayerChar ? 'bg-blue-500' : 'bg-red-500'}
        className="w-16 h-1.5"
      />
      <span className="text-stone-400 font-mono">
        {c.hp}/{c.maxHp}
      </span>
      {c.isHidden && (
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          HIDDEN
        </Badge>
      )}
      {c.hasMoved && c.hasActed && (
        <span className="text-stone-500" title="Turn complete">
          \u2713
        </span>
      )}
    </div>
  );
}