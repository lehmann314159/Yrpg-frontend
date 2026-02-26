'use client';

import type { CombatView, PartyView, Mood } from '@/lib/types';
import type { PendingAction } from '@/lib/actions';
import { cn } from '@/lib/utils';

interface CombatGridProps {
  combat: CombatView;
  party: PartyView | null;
  mood: Mood;
  pendingAction?: PendingAction | null;
  selectedCharacterId?: string | null;
  onCellClick?: (x: number, y: number) => void;
  onCombatantClick?: (id: string) => void;
}

export function CombatGrid({
  combat,
  party,
  mood,
  pendingAction,
  selectedCharacterId,
  onCellClick,
  onCombatantClick,
}: CombatGridProps) {
  if (!combat.isActive) return null;

  const currentCombatant = combat.combatants[combat.currentTurnIdx];
  const combatantMap = new Map(combat.combatants.map((c) => [c.id, c]));
  // Determine targeting mode
  const isMoveTargeting = pendingAction?.targeting === 'grid_cell';
  const isEnemyTargeting = pendingAction?.targeting === 'enemy';
  const isAllyTargeting = pendingAction?.targeting === 'ally';

  // For move targeting, compute which cells are in range
  const selectedCombatant = selectedCharacterId ? combatantMap.get(selectedCharacterId) : null;
  const moveRange = selectedCombatant?.movementRange ?? 2;
  const inMoveRange = (x: number, y: number): boolean => {
    if (!isMoveTargeting || !selectedCombatant) return false;
    const dist = Math.abs(x - selectedCombatant.gridX) + Math.abs(y - selectedCombatant.gridY);
    return dist > 0 && dist <= moveRange;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          Combat &mdash; Round {combat.roundNumber}
        </h3>
        <div className="flex items-center gap-2">
          {combat.isScoutPhase && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-950/40 px-2 py-0.5 rounded border border-violet-800">
              Surprise Round
            </span>
          )}
          {combat.awaitingScoutDecision && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800">
              Scout Decision
            </span>
          )}
          {currentCombatant && (
            <span className="text-xs text-amber-400">
              {currentCombatant.name}&apos;s turn
            </span>
          )}
        </div>
      </div>

      {/* 6x6 grid — rendered with Y=5 at top, Y=0 at bottom */}
      <div className="inline-grid grid-cols-6 gap-0.5 bg-stone-800 p-1 rounded-lg border border-stone-700">
        {Array.from({ length: 6 }).map((_, rowIdx) => {
          const y = 5 - rowIdx;
          return Array.from({ length: 6 }).map((_, x) => {
            const cellValue = combat.grid[y]?.[x] || '';
            const combatant = cellValue && cellValue !== 'blocked' ? combatantMap.get(cellValue) : null;
            const isBlocked = cellValue === 'blocked';
            const isCurrentTurn = combatant?.id === currentCombatant?.id;

            // Click logic
            const isEmpty = !isBlocked && !combatant;
            const isMoveValid = isMoveTargeting && isEmpty && inMoveRange(x, y);
            const isEnemyClickable = isEnemyTargeting && combatant && !combatant.isPlayerChar && combatant.isAlive;
            const isAllyClickable = isAllyTargeting && combatant && combatant.isPlayerChar && combatant.isAlive;
            const isClickable = isMoveValid || isEnemyClickable || isAllyClickable;

            const handleClick = () => {
              if (isMoveValid && onCellClick) {
                onCellClick(x, y);
              } else if ((isEnemyClickable || isAllyClickable) && combatant && onCombatantClick) {
                onCombatantClick(combatant.id);
              }
            };

            return (
              <div
                key={`${x}-${y}`}
                onClick={isClickable ? handleClick : undefined}
                className={cn(
                  'combat-cell w-12 h-12 flex items-center justify-center rounded text-xs font-bold transition-colors',
                  isBlocked && 'bg-stone-950 border border-stone-800',
                  isEmpty && !isMoveValid && 'bg-stone-900/50 border border-stone-800/50',
                  // Move range highlight
                  isMoveValid && 'bg-cyan-900/40 border border-cyan-700 cursor-pointer hover:bg-cyan-800/50',
                  // In move targeting but out of range
                  isMoveTargeting && isEmpty && !isMoveValid && 'opacity-40',
                  // Combatant cells
                  combatant?.isPlayerChar && !isAllyClickable && 'bg-blue-900/50 border border-blue-700',
                  combatant && !combatant.isPlayerChar && !isEnemyClickable && 'bg-red-900/50 border border-red-700',
                  // Targetable enemies
                  isEnemyClickable && 'bg-red-900/50 border border-red-700 ring-2 ring-red-400 cursor-pointer hover:bg-red-800/50',
                  // Targetable allies
                  isAllyClickable && 'bg-blue-900/50 border border-blue-700 ring-2 ring-blue-400 cursor-pointer hover:bg-blue-800/50',
                  isCurrentTurn && !isClickable && 'ring-2 ring-amber-500',
                  combatant && !combatant.isAlive && 'opacity-30',
                  // Frozen monsters during scout phase
                  combat.isScoutPhase && combatant && !combatant.isPlayerChar && combatant.isAlive && 'opacity-50 grayscale',
                  combatant?.isHidden && 'border-dashed',
                )}
                title={
                  combatant
                    ? `${combatant.name} (${combatant.hp}/${combatant.maxHp} HP)${combatant.isHidden ? ' [HIDDEN]' : ''}${combat.isScoutPhase && !combatant.isPlayerChar ? ' [FROZEN]' : ''}${isEnemyClickable ? ' — Click to target' : ''}${isAllyClickable ? ' — Click to target' : ''}`
                    : isBlocked
                    ? 'Blocked'
                    : isMoveValid
                    ? `Move to (${x}, ${y})`
                    : `(${x}, ${y})`
                }
              >
                {combatant && (
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        combatant.isPlayerChar ? 'text-blue-300' : 'text-red-300',
                        combatant.isHidden && 'italic text-stone-400',
                      )}
                    >
                      {combatant.isPlayerChar
                        ? `[${combatant.name.charAt(0)}]`
                        : `{${combatant.name.charAt(0)}}`}
                    </span>
                    <span className="text-[8px] text-stone-400">
                      {combatant.hp}/{combatant.maxHp}
                    </span>
                  </div>
                )}
                {isBlocked && <span className="text-stone-700 text-[10px]">///</span>}
              </div>
            );
          });
        })}
      </div>

      {/* Combatant legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-stone-400">
        {combat.combatants
          .filter((c) => c.isAlive)
          .map((c) => (
            <span key={c.id} className={c.isPlayerChar ? 'text-blue-400' : 'text-red-400'}>
              {c.isPlayerChar ? `[${c.name.charAt(0)}]` : `{${c.name.charAt(0)}}`} {c.name}
              {c.isHidden ? ' (hidden)' : ''}
              {combat.isScoutPhase && !c.isPlayerChar ? ' (frozen)' : ''}
              {c.hasMoved && c.hasActed ? ' \u2713' : ''}
            </span>
          ))}
      </div>
    </div>
  );
}
