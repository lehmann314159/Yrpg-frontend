'use client';

import type { CharacterView, ItemView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Backpack, ArrowUpFromLine, X } from 'lucide-react';

interface ItemPickerProps {
  character: CharacterView;
  mode: 'use' | 'equip';
  inCombat: boolean;
  onPickItem: (itemId: string) => void;
  onClose: () => void;
}

function itemDetail(item: ItemView): string {
  if (item.healing) return `+${item.healing} HP`;
  if (item.damage) return `${item.damage} dmg${item.range === 'ranged' ? ' (ranged)' : ''}`;
  if (item.armor) return `+${item.armor} AC`;
  return item.description;
}

export function ItemPicker({ character, mode, onPickItem, onClose }: ItemPickerProps) {
  const items = character.inventory.filter((item) => {
    if (mode === 'use') return item.type === 'consumable' || item.type === 'scroll';
    if (mode === 'equip') return (item.type === 'weapon' || item.type === 'armor') && !item.isEquipped;
    return false;
  });

  const Icon = mode === 'use' ? Backpack : ArrowUpFromLine;
  const title = mode === 'use' ? 'Use Item' : 'Equip';

  return (
    <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300">
            {character.name}&apos;s {title}
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
        {items.length === 0 && (
          <p className="text-xs text-stone-500">No items available.</p>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onPickItem(item.id)}
            className={cn(
              'w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded transition-colors',
              'text-amber-200 hover:bg-amber-900/40 cursor-pointer',
            )}
          >
            <span className="font-medium">{item.name}</span>
            <span className="text-[10px] text-stone-400">{itemDetail(item)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
