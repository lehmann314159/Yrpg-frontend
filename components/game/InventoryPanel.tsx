'use client';

import type { CharacterView, ItemView } from '@/lib/types';
import { ItemCard } from './ItemCard';
import { Package } from 'lucide-react';

interface InventoryPanelProps {
  character: CharacterView;
  items: ItemView[];
}

export function InventoryPanel({ character, items }: InventoryPanelProps) {
  if (items.length === 0) {
    return (
      <div className="text-xs text-stone-500 flex items-center gap-1.5 p-2">
        <Package className="h-3.5 w-3.5" />
        <span>{character.name}&apos;s inventory is empty</span>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-stone-400 mb-2 flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5" />
        {character.name}&apos;s Inventory
      </h4>
      <div className="space-y-1.5">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}