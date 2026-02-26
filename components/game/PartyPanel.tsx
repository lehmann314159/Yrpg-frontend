'use client';

import type { PartyView, CombatView } from '@/lib/types';
import { CharacterCard } from './CharacterCard';

interface PartyPanelProps {
  party: PartyView | null;
  combat?: CombatView | null;
  selectedCharacterId?: string | null;
  onCharacterClick?: (characterId: string) => void;
}

export function PartyPanel({ party, combat, selectedCharacterId, onCharacterClick }: PartyPanelProps) {
  if (!party) return null;

  // Determine whose turn it is
  const currentTurnId = combat?.isActive
    ? combat.combatants[combat.currentTurnIdx]?.id
    : null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1">
        Party
      </h3>
      {party.characters.map((c) => (
        <CharacterCard
          key={c.id}
          character={c}
          compact
          isCurrentTurn={currentTurnId === c.id}
          isSelected={selectedCharacterId === c.id}
          onClick={onCharacterClick ? () => onCharacterClick(c.id) : undefined}
        />
      ))}
    </div>
  );
}