'use client';

import type { MonsterView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skull, Crosshair } from 'lucide-react';

const threatStyles: Record<MonsterView['threat'], { border: string; badge: string }> = {
  trivial: { border: 'border-stone-600', badge: 'bg-stone-700 text-stone-300' },
  normal: { border: 'border-amber-700', badge: 'bg-amber-900 text-amber-200' },
  dangerous: { border: 'border-orange-600', badge: 'bg-orange-900 text-orange-200' },
  deadly: { border: 'border-red-600', badge: 'bg-red-900 text-red-200' },
};

interface MonsterCardProps {
  monster: MonsterView;
  isTargetable?: boolean;
  onClick?: () => void;
}

export function MonsterCard({ monster, isTargetable, onClick }: MonsterCardProps) {
  const m = monster;
  const styles = threatStyles[m.threat];

  if (m.isDefeated) return null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border p-3 transition-colors',
        styles.border,
        m.threat === 'deadly' && !isTargetable && 'animate-pulse',
        isTargetable && 'ring-2 ring-red-400 animate-pulse cursor-pointer hover:bg-red-900/20',
        !isTargetable && onClick && 'cursor-pointer hover:bg-stone-700/30',
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {m.threat === 'deadly' && <Skull className="h-3.5 w-3.5 text-red-400" />}
          <span className={cn('font-semibold text-sm', m.threat === 'deadly' && 'text-red-300')}>
            {m.name}
          </span>
          {m.isRanged && <Crosshair className="h-3 w-3 text-stone-400" />}
        </div>
        <Badge className={cn('text-[10px] px-1.5 py-0', styles.badge)}>
          {m.threat}
        </Badge>
      </div>

      <Progress
        value={m.hp}
        max={m.maxHp}
        indicatorClassName="bg-red-600"
        className="mb-1"
      />
      <div className="flex justify-between text-[10px] text-stone-400">
        <span>HP {m.hp}/{m.maxHp}</span>
        <span>DMG {m.damage}</span>
      </div>

      <p className="text-[11px] text-stone-500 mt-1">{m.description}</p>
    </div>
  );
}