'use client';

import type { TrapView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface TrapWarningProps {
  trap: TrapView;
  isTargetable?: boolean;
  onClick?: () => void;
}

function dcColor(dc: number): string {
  if (dc <= 10) return 'text-amber-400 border-amber-700 bg-amber-950/30';
  if (dc <= 14) return 'text-orange-400 border-orange-700 bg-orange-950/30';
  return 'text-red-400 border-red-700 bg-red-950/30';
}

export function TrapWarning({ trap, isTargetable, onClick }: TrapWarningProps) {
  if (trap.isDisarmed) return null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border p-3 flex items-start gap-2',
        dcColor(trap.difficulty),
        isTargetable && 'ring-2 ring-amber-400 animate-pulse cursor-pointer hover:bg-amber-900/20',
      )}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">Trap Detected!</p>
        <p className="text-xs mt-0.5 opacity-80">{trap.description}</p>
        <p className="text-[10px] mt-1 opacity-60">
          Difficulty DC {trap.difficulty} — Use a thief to disarm
        </p>
      </div>
    </div>
  );
}