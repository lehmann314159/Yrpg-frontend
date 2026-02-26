'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { GameEvent } from '@/lib/types';
import { Skull, Swords, Sparkles, AlertTriangle, Trophy } from 'lucide-react';

interface NotificationProps {
  event: GameEvent | null;
}

const eventIcons: Record<string, React.ReactNode> = {
  combat: <Swords className="h-4 w-4" />,
  spell: <Sparkles className="h-4 w-4" />,
  death: <Skull className="h-4 w-4" />,
  trap: <AlertTriangle className="h-4 w-4" />,
  victory: <Trophy className="h-4 w-4" />,
};

const eventColors: Record<string, string> = {
  combat: 'border-amber-600 bg-amber-950/40 text-amber-200',
  spell: 'border-indigo-600 bg-indigo-950/40 text-indigo-200',
  death: 'border-red-600 bg-red-950/40 text-red-200',
  trap: 'border-orange-600 bg-orange-950/40 text-orange-200',
  victory: 'border-emerald-600 bg-emerald-950/40 text-emerald-200',
  default: 'border-stone-600 bg-stone-800/40 text-stone-200',
};

export function Notification({ event }: NotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [event]);

  if (!event || !visible) return null;

  const resultText = event.details?.resultText;
  if (!resultText) return null;

  const icon = eventIcons[event.eventType] || null;
  const color = eventColors[event.eventType] || eventColors.default;

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-2 flex items-center gap-2 transition-all duration-300',
        color,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      )}
    >
      {icon}
      <span className="text-sm font-medium">{resultText}</span>
      {event.details?.wasCritical && (
        <span className="text-xs font-bold text-amber-400 uppercase">CRITICAL!</span>
      )}
    </div>
  );
}