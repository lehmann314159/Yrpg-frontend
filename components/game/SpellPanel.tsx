'use client';

import type { CharacterView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Wand2 } from 'lucide-react';

const spellInfo: Record<string, { name: string; desc: string; combatOnly: boolean }> = {
  heal: { name: 'Heal', desc: '2d6+4 HP to target', combatOnly: false },
  resurrect: { name: 'Resurrect', desc: 'Revive dead ally at 50% HP', combatOnly: false },
  fireball: { name: 'Fireball', desc: '3d6 damage + splash', combatOnly: true },
  lightning: { name: 'Lightning Bolt', desc: '4d6 single target', combatOnly: true },
  shield: { name: 'Shield', desc: '+4 AC party, 3 rounds', combatOnly: true },
  sleep: { name: 'Sleep', desc: 'Skip 2 turns', combatOnly: true },
};

interface SpellPanelProps {
  character: CharacterView;
  inCombat: boolean;
}

export function SpellPanel({ character, inCombat }: SpellPanelProps) {
  if (character.class !== 'magic_user' || !character.isAlive) return null;

  return (
    <div className="rounded-lg border border-indigo-800 bg-indigo-950/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300">{character.name}&apos;s Spells</span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: character.maxSpellSlots }).map((_, i) => (
            <span
              key={i}
              className={cn('text-sm', i < character.spellSlots ? 'text-indigo-400' : 'text-stone-600')}
            >
              {i < character.spellSlots ? '\u25CF' : '\u25CB'}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {character.knownSpells.map((spellId) => {
          const info = spellInfo[spellId];
          if (!info) return null;
          const disabled = info.combatOnly && !inCombat;

          return (
            <div
              key={spellId}
              className={cn(
                'flex items-center justify-between text-xs px-2 py-1 rounded',
                disabled ? 'text-stone-600' : 'text-indigo-200',
              )}
            >
              <span className="font-medium">{info.name}</span>
              <span className={cn('text-[10px]', disabled ? 'text-stone-700' : 'text-stone-400')}>
                {info.desc}
                {disabled && ' (combat only)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}