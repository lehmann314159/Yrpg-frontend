'use client';

import type { ItemView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield, FlaskConical, ScrollText, Key, Gem } from 'lucide-react';

const typeIcons: Record<ItemView['type'], React.ReactNode> = {
  weapon: <Sword className="h-3.5 w-3.5" />,
  armor: <Shield className="h-3.5 w-3.5" />,
  consumable: <FlaskConical className="h-3.5 w-3.5" />,
  scroll: <ScrollText className="h-3.5 w-3.5" />,
  key: <Key className="h-3.5 w-3.5" />,
  treasure: <Gem className="h-3.5 w-3.5" />,
};

const rarityStyles: Record<ItemView['rarity'], string> = {
  common: 'border-stone-600',
  uncommon: 'border-emerald-700',
  rare: 'border-blue-600 shadow-blue-900/30 shadow-md',
  legendary: 'border-purple-500 shadow-purple-900/40 shadow-lg animate-pulse',
};

const rarityText: Record<ItemView['rarity'], string> = {
  common: 'text-stone-400',
  uncommon: 'text-emerald-400',
  rare: 'text-blue-400',
  legendary: 'text-purple-400',
};

interface ItemCardProps {
  item: ItemView;
  isTargetable?: boolean;
  onClick?: () => void;
}

export function ItemCard({ item, isTargetable, onClick }: ItemCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border p-2.5 transition-colors',
        rarityStyles[item.rarity],
        isTargetable && 'ring-2 ring-emerald-400 animate-pulse cursor-pointer hover:bg-emerald-900/20',
        !isTargetable && onClick && 'cursor-pointer hover:bg-stone-700/30',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={rarityText[item.rarity]}>{typeIcons[item.type]}</span>
          <span className={cn('font-semibold text-sm', rarityText[item.rarity])}>{item.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {item.isEquipped && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0">
              EQUIPPED
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-3 text-[10px] text-stone-400">
        {item.damage != null && <span>DMG +{item.damage}</span>}
        {item.armor != null && <span>AC +{item.armor}</span>}
        {item.healing != null && <span>HEAL {item.healing}</span>}
        {item.range && <span>{item.range}</span>}
      </div>

      {item.classRestriction && item.classRestriction.length > 0 && (
        <div className="flex gap-1 mt-1">
          {item.classRestriction.map((cls) => (
            <Badge key={cls} variant="outline" className="text-[9px] px-1 py-0">
              {cls}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-500 mt-1">{item.description}</p>
    </div>
  );
}