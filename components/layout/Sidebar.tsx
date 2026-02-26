'use client';

import type { GameStateSnapshot } from '@/lib/types';
import { PartyPanel } from '@/components/game/PartyPanel';
import { DungeonMap } from '@/components/game/DungeonMap';
import { FormationPanel } from '@/components/game/FormationPanel';
import { InventoryPanel } from '@/components/game/InventoryPanel';

interface SidebarProps {
  gameState: GameStateSnapshot | null;
  selectedCharacterId?: string | null;
  onCharacterClick?: (characterId: string) => void;
}

export function Sidebar({ gameState, selectedCharacterId, onCharacterClick }: SidebarProps) {
  const selectedChar = selectedCharacterId
    ? gameState?.party?.characters.find((c) => c.id === selectedCharacterId) ?? null
    : null;

  return (
    <aside className="w-64 shrink-0 border-r border-stone-700 bg-stone-900 flex flex-col overflow-y-auto">
      <div className="p-3 border-b border-stone-800">
        <h1 className="text-lg font-bold text-stone-100 tracking-tight">YRPG</h1>
        {gameState && (
          <span className="text-[10px] text-stone-500 uppercase">
            Turn {gameState.turnNumber} &mdash; {gameState.mode}
          </span>
        )}
      </div>

      <div className="flex-1 p-3 space-y-4">
        <DungeonMap grid={gameState?.mapGrid || []} />

        <PartyPanel
          party={gameState?.party || null}
          combat={gameState?.combat}
          selectedCharacterId={selectedCharacterId}
          onCharacterClick={onCharacterClick}
        />

        <FormationPanel party={gameState?.party || null} />

        {/* Inventory for selected character */}
        {selectedChar && (
          <InventoryPanel character={selectedChar} items={selectedChar.inventory || []} />
        )}
      </div>
    </aside>
  );
}