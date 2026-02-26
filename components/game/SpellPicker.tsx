'use client';

import type { CharacterView } from '@/lib/types';
import { spellInfo } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { Wand2, X } from 'lucide-react';

interface SpellPickerProps {
  character: CharacterView;
  inCombat: boolean;
  onPickSpell: (spellId: string) => void;
  onClose: () => void;
}

export function SpellPicker({ character, inCombat, onPickSpell, onClose }: SpellPickerProps) {
  const availableSpells = character.knownSpells.filter((id) => {
    const info = spellInfo[id];
    if (!info) return false;
    if (info.combatOnly && !inCombat) return false;
    return true;
  });

  return (
    <div className="rounded-lg border border-indigo-800 bg-indigo-950/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300">
            {character.name}&apos;s Spells ({character.spellSlots} slots)
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-stone-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        {availableSpells.length === 0 && (
          <p className="text-xs text-stone-500">No spells available right now.</p>
        )}
        {availableSpells.map((spellId) => {
          const info = spellInfo[spellId];
          if (!info) return null;
          const noSlots = character.spellSlots <= 0;

          return (
            <button
              key={spellId}
              onClick={() => !noSlots && onPickSpell(spellId)}
              disabled={noSlots}
              className={cn(
                'w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded transition-colors',
                noSlots
                  ? 'text-stone-600 cursor-not-allowed'
                  : 'text-indigo-200 hover:bg-indigo-900/40 cursor-pointer',
              )}
            >
              <span className="font-medium">{info.name}</span>
              <span className={cn('text-[10px]', noSlots ? 'text-stone-700' : 'text-stone-400')}>
                {info.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
