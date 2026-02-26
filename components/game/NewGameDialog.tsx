'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Minus, Swords, Wand2, Eye, Play, Zap } from 'lucide-react';

type CharClass = 'fighter' | 'magic_user' | 'thief';

interface CharRow {
  name: string;
  charClass: CharClass;
}

const classOptions: { value: CharClass; label: string; icon: React.ReactNode }[] = [
  { value: 'fighter', label: 'Fighter', icon: <Swords className="h-3.5 w-3.5" /> },
  { value: 'magic_user', label: 'Mage', icon: <Wand2 className="h-3.5 w-3.5" /> },
  { value: 'thief', label: 'Thief', icon: <Eye className="h-3.5 w-3.5" /> },
];

interface NewGameDialogProps {
  onStartGame: (characters: { name: string; class: CharClass }[]) => void;
  loading?: boolean;
}

export function NewGameDialog({ onStartGame, loading }: NewGameDialogProps) {
  const [rows, setRows] = useState<CharRow[]>([
    { name: '', charClass: 'fighter' },
  ]);

  const addRow = () => {
    if (rows.length >= 3) return;
    const defaults: CharClass[] = ['fighter', 'magic_user', 'thief'];
    setRows([...rows, { name: '', charClass: defaults[rows.length] || 'fighter' }]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<CharRow>) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = () => {
    const chars = rows.map((r, i) => ({
      name: r.name.trim() || `Hero ${i + 1}`,
      class: r.charClass,
    }));
    onStartGame(chars);
  };

  const applyPreset = (preset: 'classic' | 'solo') => {
    if (preset === 'classic') {
      onStartGame([
        { name: 'Roland', class: 'fighter' },
        { name: 'Elara', class: 'magic_user' },
        { name: 'Shade', class: 'thief' },
      ]);
    } else {
      onStartGame([{ name: 'Roland', class: 'fighter' }]);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-stone-100 mb-1">Welcome to YRPG</h2>
          <p className="text-sm text-stone-400">Create your party and begin the adventure.</p>
        </div>

        {/* Character rows */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                placeholder={`Character ${idx + 1}`}
                className={cn(
                  'flex-1 px-3 py-2 rounded border bg-stone-800 text-stone-100 placeholder-stone-500 text-sm',
                  'border-stone-600 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400',
                )}
              />
              <select
                value={row.charClass}
                onChange={(e) => updateRow(idx, { charClass: e.target.value as CharClass })}
                className={cn(
                  'px-3 py-2 rounded border bg-stone-800 text-stone-100 text-sm',
                  'border-stone-600 focus:border-stone-400 focus:outline-none',
                )}
              >
                {classOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(idx)}
                  className="p-2 rounded border border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-700 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add character */}
        {rows.length < 3 && (
          <button
            onClick={addRow}
            className={cn(
              'w-full px-3 py-2 rounded border border-dashed border-stone-600 text-stone-400 text-sm',
              'hover:border-stone-400 hover:text-stone-200 transition-colors',
              'flex items-center justify-center gap-1.5',
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Add Character ({rows.length}/3)
          </button>
        )}

        {/* Start button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={cn(
            'w-full px-4 py-3 rounded font-semibold text-sm',
            'bg-emerald-700 text-emerald-50 border border-emerald-600',
            'hover:bg-emerald-600 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2',
          )}
        >
          <Play className="h-4 w-4" /> Start Adventure
        </button>

        {/* Quick presets */}
        <div className="flex gap-2">
          <button
            onClick={() => applyPreset('classic')}
            disabled={loading}
            className={cn(
              'flex-1 px-3 py-2 rounded border border-stone-600 text-stone-300 text-xs',
              'hover:bg-stone-700 transition-colors disabled:opacity-50',
              'flex items-center justify-center gap-1.5',
            )}
          >
            <Swords className="h-3 w-3" /> Classic Party
          </button>
          <button
            onClick={() => applyPreset('solo')}
            disabled={loading}
            className={cn(
              'flex-1 px-3 py-2 rounded border border-stone-600 text-stone-300 text-xs',
              'hover:bg-stone-700 transition-colors disabled:opacity-50',
              'flex items-center justify-center gap-1.5',
            )}
          >
            <Zap className="h-3 w-3" /> Solo Fighter
          </button>
        </div>
      </div>
    </div>
  );
}
