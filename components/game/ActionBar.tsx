'use client';

import type { ActionDefinition, TargetingMode, PendingAction } from '@/lib/actions';
import { cn } from '@/lib/utils';
import {
  Eye, Moon, PackagePlus, Package, Wrench, Wand2,
  Swords, Footprints, ShieldHalf, EyeOff, SkipForward, X,
  Radar, Users, LogOut,
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Eye: <Eye className="h-3.5 w-3.5" />,
  Moon: <Moon className="h-3.5 w-3.5" />,
  PackagePlus: <PackagePlus className="h-3.5 w-3.5" />,
  Package: <Package className="h-3.5 w-3.5" />,
  Wrench: <Wrench className="h-3.5 w-3.5" />,
  Wand2: <Wand2 className="h-3.5 w-3.5" />,
  Swords: <Swords className="h-3.5 w-3.5" />,
  Footprints: <Footprints className="h-3.5 w-3.5" />,
  ShieldHalf: <ShieldHalf className="h-3.5 w-3.5" />,
  EyeOff: <EyeOff className="h-3.5 w-3.5" />,
  SkipForward: <SkipForward className="h-3.5 w-3.5" />,
  Radar: <Radar className="h-3.5 w-3.5" />,
  Users: <Users className="h-3.5 w-3.5" />,
  LogOut: <LogOut className="h-3.5 w-3.5" />,
};

const targetingColors: Record<string, string> = {
  enemy: 'text-red-400 bg-red-950/40 border-red-800',
  ally: 'text-blue-400 bg-blue-950/40 border-blue-800',
  item: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
  trap: 'text-amber-400 bg-amber-950/40 border-amber-800',
  grid_cell: 'text-cyan-400 bg-cyan-950/40 border-cyan-800',
  direction: 'text-violet-400 bg-violet-950/40 border-violet-800',
};

interface ActionBarProps {
  actions: ActionDefinition[];
  pendingAction: PendingAction | null;
  onActionClick: (action: ActionDefinition) => void;
  onCancelTargeting: () => void;
  disabled?: boolean;
}

export function ActionBar({
  actions,
  pendingAction,
  onActionClick,
  onCancelTargeting,
  disabled,
}: ActionBarProps) {
  // Show targeting prompt if active
  if (pendingAction) {
    const colorClass = targetingColors[pendingAction.targeting] || 'text-stone-300 bg-stone-800 border-stone-700';
    return (
      <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border text-sm', colorClass)}>
        <span className="flex-1 font-medium">{pendingAction.prompt}</span>
        <button
          onClick={onCancelTargeting}
          className="flex items-center gap-1 px-2 py-1 rounded border border-stone-600 text-stone-300 hover:text-stone-100 hover:border-stone-400 transition-colors text-xs"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onActionClick(action)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors',
            'border-stone-600 bg-stone-800 text-stone-200',
            'hover:bg-stone-700 hover:border-stone-500',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {iconMap[action.icon]}
          {action.label}
        </button>
      ))}
    </div>
  );
}
