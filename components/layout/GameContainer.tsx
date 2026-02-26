'use client';

import type { GameStateSnapshot, Mood } from '@/lib/types';
import type { PendingAction } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { CombatGrid } from '@/components/game/CombatGrid';
import { MonsterCard } from '@/components/game/MonsterCard';
import { ItemCard } from '@/components/game/ItemCard';
import { TrapWarning } from '@/components/game/TrapWarning';
import { CombatLog } from '@/components/game/CombatLog';
import { Notification } from '@/components/game/Notification';
import { SpellPanel } from '@/components/game/SpellPanel';
import { ExitButtons } from '@/components/game/ExitButtons';
import { NewGameDialog } from '@/components/game/NewGameDialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trophy, Skull } from 'lucide-react';

interface GameContainerProps {
  gameState: GameStateSnapshot | null;
  mood: Mood;
  combatLog: string[];
  pendingAction?: PendingAction | null;
  selectedCharacterId?: string | null;
  loading?: boolean;
  onTargetSelect?: (targetId: string) => void;
  onCellClick?: (x: number, y: number) => void;
  onExitClick?: (direction: string) => void;
  onStartGame?: (characters: { name: string; class: 'fighter' | 'magic_user' | 'thief' }[]) => void;
}

export function GameContainer({
  gameState,
  mood,
  combatLog,
  pendingAction,
  selectedCharacterId,
  loading,
  onTargetSelect,
  onCellClick,
  onExitClick,
  onStartGame,
}: GameContainerProps) {
  if (!gameState) {
    if (onStartGame) {
      return <NewGameDialog onStartGame={onStartGame} loading={loading} />;
    }
    return (
      <div className="flex-1 flex items-center justify-center text-stone-500">
        <div className="text-center">
          <h2 className="text-xl font-bold text-stone-300 mb-2">Welcome to YRPG</h2>
          <p className="text-sm">Start a new game to begin your adventure.</p>
        </div>
      </div>
    );
  }

  // Game over screens
  if (gameState.gameOver) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          {gameState.victory ? (
            <>
              <Trophy className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-emerald-300">Victory!</h2>
              <p className="text-sm text-emerald-400 mt-2">Your party has escaped the dungeon.</p>
            </>
          ) : (
            <>
              <Skull className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-300">Total Party Kill</h2>
              <p className="text-sm text-red-400 mt-2">Your party has perished in the dungeon.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const gs = {
    ...gameState,
    monsters: gameState.monsters || [],
    roomItems: gameState.roomItems || [],
    roomTraps: gameState.roomTraps || [],
  };

  // Targeting helpers
  const isTargetingEnemy = pendingAction?.targeting === 'enemy';
  const isTargetingItem = pendingAction?.targeting === 'item';
  const isTargetingTrap = pendingAction?.targeting === 'trap';
  const isTargetingAlly = pendingAction?.targeting === 'ally';

  return (
    <div className={cn('flex-1 overflow-y-auto p-4 space-y-4', mood.palette)}>
      {/* Notification */}
      <Notification event={gs.lastEvent} />

      {/* Room header */}
      {gs.currentRoom && (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-stone-400" />
          <h2 className="text-lg font-bold text-stone-100">{gs.currentRoom.name}</h2>
          {gs.currentRoom.isFirstVisit && (
            <Badge variant="warning" className="text-[10px]">NEW</Badge>
          )}
          {gs.currentRoom.isEntrance && (
            <Badge variant="secondary" className="text-[10px]">ENTRANCE</Badge>
          )}
          {gs.currentRoom.isExit && (
            <Badge variant="success" className="text-[10px]">EXIT</Badge>
          )}
        </div>
      )}

      {/* Room description */}
      {gs.currentRoom && (
        <p className="text-sm text-stone-400">{gs.currentRoom.description}</p>
      )}

      {/* Exits — compass buttons instead of text */}
      {gs.currentRoom && gs.currentRoom.exits.length > 0 && onExitClick && (
        <ExitButtons
          exits={gs.currentRoom.exits}
          onExitClick={onExitClick}
          disabled={loading || gs.mode === 'combat'}
        />
      )}

      {/* Traps */}
      {gs.roomTraps.filter((t) => !t.isDisarmed).length > 0 && (
        <div className="space-y-2">
          {gs.roomTraps
            .filter((t) => !t.isDisarmed)
            .map((trap) => (
              <TrapWarning
                key={trap.id}
                trap={trap}
                isTargetable={isTargetingTrap}
                onClick={isTargetingTrap && onTargetSelect ? () => onTargetSelect(trap.id) : undefined}
              />
            ))}
        </div>
      )}

      {/* Combat grid */}
      {gs.mode === 'combat' && gs.combat && (
        <CombatGrid
          combat={gs.combat}
          party={gs.party}
          mood={mood}
          pendingAction={pendingAction}
          selectedCharacterId={selectedCharacterId}
          onCellClick={onCellClick}
          onCombatantClick={
            (isTargetingEnemy || isTargetingAlly) && onTargetSelect
              ? (id) => onTargetSelect(id)
              : undefined
          }
        />
      )}

      {/* Monsters (exploration mode) */}
      {gs.mode === 'exploration' && gs.monsters.filter((m) => !m.isDefeated).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Enemies
          </h3>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {gs.monsters
              .filter((m) => !m.isDefeated)
              .map((monster) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  isTargetable={isTargetingEnemy}
                  onClick={isTargetingEnemy && onTargetSelect ? () => onTargetSelect(monster.id) : undefined}
                />
              ))}
          </div>
        </div>
      )}

      {/* Room items */}
      {gs.roomItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Items
          </h3>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {gs.roomItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isTargetable={isTargetingItem}
                onClick={isTargetingItem && onTargetSelect ? () => onTargetSelect(item.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Spell panel for magic users */}
      {gs.party?.characters
        .filter((c) => c.class === 'magic_user' && c.isAlive)
        .map((c) => (
          <SpellPanel key={c.id} character={c} inCombat={gs.mode === 'combat'} />
        ))}

      {/* Combat log */}
      <CombatLog entries={combatLog} />
    </div>
  );
}
