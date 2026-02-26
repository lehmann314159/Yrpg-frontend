'use client';

import type { CharacterView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Shield, Wand2, Eye, Sword, ShieldHalf } from 'lucide-react';

const classIcons: Record<CharacterView['class'], React.ReactNode> = {
  fighter: <Shield className="h-3.5 w-3.5" />,
  magic_user: <Wand2 className="h-3.5 w-3.5" />,
  thief: <Eye className="h-3.5 w-3.5" />,
};

const classLabels: Record<CharacterView['class'], string> = {
  fighter: 'Fighter',
  magic_user: 'Mage',
  thief: 'Thief',
};

const statusVariant: Record<CharacterView['status'], 'success' | 'warning' | 'destructive' | 'secondary'> = {
  Healthy: 'success',
  Wounded: 'warning',
  Critical: 'destructive',
  Dead: 'secondary',
};

function hpColor(hp: number, maxHp: number): string {
  const pct = hp / maxHp;
  if (pct > 0.75) return 'bg-emerald-500';
  if (pct > 0.4) return 'bg-amber-500';
  return 'bg-red-500';
}

interface CharacterCardProps {
  character: CharacterView;
  compact?: boolean;
  isCurrentTurn?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CharacterCard({ character, compact, isCurrentTurn, isSelected, onClick }: CharacterCardProps) {
  const c = character;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-stone-700 p-2.5 transition-colors',
        !c.isAlive && 'opacity-40',
        isSelected && 'ring-2 ring-blue-500 border-blue-600',
        isCurrentTurn && !isSelected && 'border-amber-500 bg-amber-950/20',
        onClick && 'cursor-pointer hover:border-stone-500',
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {classIcons[c.class]}
          <span className="font-semibold text-sm">{c.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={statusVariant[c.status]} className="text-[10px] px-1.5 py-0">
            {c.status}
          </Badge>
          <span className="text-xs text-stone-400">{classLabels[c.class]}</span>
        </div>
      </div>

      {/* HP Bar */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-stone-400 w-6">HP</span>
        <Progress value={c.hp} max={c.maxHp} indicatorClassName={hpColor(c.hp, c.maxHp)} className="flex-1" />
        <span className="text-xs text-stone-300 w-12 text-right font-mono">
          {c.hp}/{c.maxHp}
        </span>
      </div>

      {/* Spell slots for magic users */}
      {c.maxSpellSlots > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-stone-400 w-6">SP</span>
          <div className="flex gap-0.5">
            {Array.from({ length: c.maxSpellSlots }).map((_, i) => (
              <span key={i} className={cn('text-sm', i < c.spellSlots ? 'text-indigo-400' : 'text-stone-600')}>
                {i < c.spellSlots ? '\u25CF' : '\u25CB'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Equipped items */}
      {c.isAlive && (c.equippedWeapon || c.equippedArmor) && (
        <div className="flex gap-3 mt-1.5 text-[10px] text-stone-400">
          {c.equippedWeapon && (
            <span className="flex items-center gap-0.5">
              <Sword className="h-2.5 w-2.5" /> {c.equippedWeapon.name}
            </span>
          )}
          {c.equippedArmor && (
            <span className="flex items-center gap-0.5">
              <ShieldHalf className="h-2.5 w-2.5" /> {c.equippedArmor.name}
            </span>
          )}
        </div>
      )}

      {/* Stats (only if not compact) */}
      {!compact && c.isAlive && (
        <div className="flex gap-3 mt-1.5 text-[10px] text-stone-400">
          <span>STR {c.strength}</span>
          <span>DEX {c.dexterity}</span>
          <span>INT {c.intelligence}</span>
        </div>
      )}
    </div>
  );
}