'use client';

import type { PartyView, CombatView } from '@/lib/types';
import { CharacterCard } from './CharacterCard';

interface PartyPanelProps {
  party: PartyView | null;
  combat?: CombatView | null;
  selectedCharacterId?: string | null;
  onCharacterClick?: (characterId: string) => void;
  onReorder?: (formation: string[]) => void;
  reorderDisabled?: boolean;
}

export function PartyPanel({ party, combat, selectedCharacterId, onCharacterClick, onReorder, reorderDisabled }: PartyPanelProps) {
  if (!party) return null;

  // Determine whose turn it is
  const currentTurnId = combat?.isActive
    ? combat.combatants[combat.currentTurnIdx]?.id
    : null;

  const canReorder = onReorder && !reorderDisabled;
  const charMap = new Map(party.characters.map((c) => [c.id, c]));

  // Render in formation order
  const orderedChars = party.formation
    .map((id) => charMap.get(id))
    .filter(Boolean) as typeof party.characters;

  const swap = (index: number, direction: -1 | 1) => {
    if (!onReorder) return;
    const next = [...party.formation];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1">
        Party
      </h3>
      {orderedChars.map((c, i) => (
        <CharacterCard
          key={c.id}
          character={c}
          compact
          isCurrentTurn={currentTurnId === c.id}
          isSelected={selectedCharacterId === c.id}
          isFirst={i === 0}
          isLast={i === orderedChars.length - 1}
          onMoveUp={canReorder ? () => swap(i, -1) : undefined}
          onMoveDown={canReorder ? () => swap(i, 1) : undefined}
          onClick={onCharacterClick ? () => onCharacterClick(c.id) : undefined}
        />
      ))}
      <p className="text-[10px] text-stone-600 px-1">
        First in line takes traps on room entry
      </p>
    </div>
  );
}
