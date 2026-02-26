'use client';

import type { Mood } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

interface NarrativePanelProps {
  text: string;
  mood: Mood;
  isStreaming?: boolean;
}

const moodBg: Record<Mood['atmosphere'], string> = {
  calm: 'bg-stone-800/50 border-stone-700',
  tense: 'bg-amber-950/20 border-amber-800/50',
  dangerous: 'bg-red-950/20 border-red-800/50',
  desperate: 'bg-red-950/30 border-red-700/50',
  mysterious: 'bg-indigo-950/20 border-indigo-800/50',
  triumphant: 'bg-emerald-950/20 border-emerald-800/50',
};

export function NarrativePanel({ text, mood, isStreaming }: NarrativePanelProps) {
  if (!text) return null;

  // Strip mood override block from display
  const displayText = text.replace(/```mood\s*\n[\s\S]*?\n```/, '').trim();
  if (!displayText) return null;

  return (
    <div className={cn('rounded-lg border p-4 mb-4 transition-colors duration-500', moodBg[mood.atmosphere])}>
      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
        <p className="text-sm text-stone-200 leading-relaxed italic">
          {displayText}
          {isStreaming && <span className="animate-pulse text-stone-400">|</span>}
        </p>
      </div>
    </div>
  );
}