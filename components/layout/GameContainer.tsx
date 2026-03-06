'use client';

import type { GameStateSnapshot, Mood } from '@/lib/types';
import type { PendingAction } from '@/lib/actions';
import type { UIComponent, UIGenerationResult } from '@/lib/ui-types';
import { cn } from '@/lib/utils';
import { CombatGrid } from '@/components/game/CombatGrid';
import { MonsterCard } from '@/components/game/MonsterCard';
import { ItemCard } from '@/components/game/ItemCard';
import { TrapWarning } from '@/components/game/TrapWarning';
import { CombatLog } from '@/components/game/CombatLog';
import { Notification } from '@/components/game/Notification';
import { SpellPanel } from '@/components/game/SpellPanel';
import { NewGameDialog } from '@/components/game/NewGameDialog';
import { SceneImage } from '@/components/game/SceneImage';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trophy, Skull, Swords, Sparkles, Heart, AlertTriangle, Shield } from 'lucide-react';

// Helper to find a specific component type from UI result
function findUIComponent<T extends UIComponent['type']>(
  uiResult: UIGenerationResult | null | undefined,
  type: T,
): Extract<UIComponent, { type: T }> | null {
  if (!uiResult) return null;
  const comp = uiResult.components.find((c) => c.type === type);
  return comp as Extract<UIComponent, { type: T }> | null;
}

// Layout style CSS classes
const layoutStyles = {
  standard: 'space-y-4',
  combat_focus: 'space-y-2',
  cinematic: 'space-y-6 py-2',
  dense: 'space-y-2',
} as const;

// Notification urgency styles
const urgencyStyles = {
  info: 'border-blue-700 bg-blue-950/40 text-blue-200',
  warning: 'border-amber-700 bg-amber-950/40 text-amber-200',
  danger: 'border-red-700 bg-red-950/40 text-red-200',
  success: 'border-emerald-700 bg-emerald-950/40 text-emerald-200',
} as const;

const urgencyIcons = {
  info: Sparkles,
  warning: AlertTriangle,
  danger: Skull,
  success: Trophy,
} as const;

interface GameContainerProps {
  gameState: GameStateSnapshot | null;
  mood: Mood;
  combatLog: string[];
  pendingAction?: PendingAction | null;
  selectedCharacterId?: string | null;
  loading?: boolean;
  uiResult?: UIGenerationResult | null;
  sceneImage?: string | null;
  scenePrompt?: string | null;
  isImageLoading?: boolean;
  onTargetSelect?: (targetId: string) => void;
  onCellClick?: (x: number, y: number) => void;
  onStartGame?: (characters: { name: string; class: 'fighter' | 'magic_user' | 'thief' }[]) => void;
}

export function GameContainer({
  gameState,
  mood,
  combatLog,
  pendingAction,
  selectedCharacterId,
  loading,
  uiResult,
  sceneImage,
  scenePrompt,
  isImageLoading,
  onTargetSelect,
  onCellClick,
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

  // Extract AI-generated components
  const layoutComp = findUIComponent(uiResult, 'layout');
  const notificationComp = findUIComponent(uiResult, 'notification');
  const combatSummaryComp = findUIComponent(uiResult, 'combat_summary');
  const combatResultComp = findUIComponent(uiResult, 'combat_result');
  const monsterEmphasis = findUIComponent(uiResult, 'monster_emphasis');
  const lootHighlight = findUIComponent(uiResult, 'loot_highlight');
  const partyCallout = findUIComponent(uiResult, 'party_callout');

  const layoutStyle = layoutComp?.style ?? 'standard';

  return (
    <div className={cn('flex-1 overflow-y-auto p-4', layoutStyles[layoutStyle], mood.palette)}>
      {/* AI notification banner */}
      {notificationComp && (
        <div className={cn(
          'px-3 py-2 rounded border text-sm flex items-center gap-2',
          urgencyStyles[notificationComp.urgency as keyof typeof urgencyStyles] ?? urgencyStyles.info,
        )}>
          {(() => {
            const Icon = urgencyIcons[notificationComp.urgency as keyof typeof urgencyIcons] ?? Sparkles;
            return <Icon className="h-4 w-4 shrink-0" />;
          })()}
          <div>
            <span className="font-semibold">{notificationComp.title}</span>
            {' '}<span className="opacity-80">{notificationComp.message}</span>
          </div>
        </div>
      )}

      {/* Deterministic notification (fallback when no AI notification) */}
      {!notificationComp && <Notification event={gs.lastEvent ?? null} />}

      {/* Combat result banner */}
      {combatResultComp && (
        <div className={cn(
          'px-3 py-2 rounded border text-sm',
          combatResultComp.wasCritical
            ? 'border-amber-500 bg-amber-950/40 text-amber-200'
            : 'border-stone-600 bg-stone-800/60 text-stone-200',
        )}>
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 shrink-0" />
            <span className="font-semibold">
              {combatResultComp.actor} → {combatResultComp.target}
            </span>
            {combatResultComp.damage != null && (
              <Badge variant={combatResultComp.wasCritical ? 'warning' : 'secondary'} className="text-[10px]">
                {combatResultComp.damage} DMG{combatResultComp.wasCritical ? ' CRIT' : ''}
              </Badge>
            )}
            {combatResultComp.result === 'miss' && (
              <Badge variant="secondary" className="text-[10px]">MISS</Badge>
            )}
          </div>
          <p className="text-xs opacity-70 mt-1">{combatResultComp.description}</p>
        </div>
      )}

      {/* Room header */}
      {gs.currentRoom && (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-stone-400" />
          <h2 className={cn(
            'font-bold text-stone-100',
            layoutStyle === 'cinematic' ? 'text-xl' : 'text-lg',
          )}>{gs.currentRoom.name}</h2>
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
        <p className={cn(
          'text-stone-400',
          layoutStyle === 'cinematic' ? 'text-base' : 'text-sm',
        )}>{gs.currentRoom.description}</p>
      )}

      {/* Traps */}
      {gs.roomTraps.filter((t) => !t.isDisarmed && !t.isTriggered).length > 0 && (
        <div className="space-y-2">
          {gs.roomTraps
            .filter((t) => !t.isDisarmed && !t.isTriggered)
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

      {/* Combat tactical summary */}
      {combatSummaryComp && gs.mode === 'combat' && (
        <div className="px-3 py-2 rounded border border-stone-600 bg-stone-800/40 text-sm">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-stone-400 shrink-0" />
            <span className="text-stone-300">
              Round {combatSummaryComp.roundNumber} — <span className="font-semibold text-stone-100">{combatSummaryComp.currentTurn}</span>&apos;s turn
            </span>
            <Badge variant="secondary" className="text-[10px]">{combatSummaryComp.phase}</Badge>
          </div>
          {combatSummaryComp.tacticalHint && (
            <p className="text-xs text-stone-400 mt-1 italic">{combatSummaryComp.tacticalHint}</p>
          )}
        </div>
      )}

      {/* Combat: scene image + grid side by side */}
      {gs.mode === 'combat' && gs.combat && (
        <div className="flex items-start gap-4">
          <SceneImage imageUrl={sceneImage ?? null} isLoading={isImageLoading ?? false} prompt={scenePrompt} />
          <CombatGrid
            combat={gs.combat}
            party={gs.party || null}
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
        </div>
      )}

      {/* Monsters (exploration mode) */}
      {gs.mode === 'exploration' && gs.monsters.filter((m) => !m.isDefeated).length > 0 && (
        <div className={cn(
          'space-y-2',
          monsterEmphasis?.emphasis === 'threatening' && 'ring-1 ring-red-500/50 rounded p-2 bg-red-950/20',
          monsterEmphasis?.emphasis === 'trivial' && 'opacity-60',
        )}>
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

      {/* Loot highlight */}
      {lootHighlight && (
        <div className="px-3 py-2 rounded border border-amber-700/50 bg-amber-950/20 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="font-semibold text-amber-200">New Loot</span>
            <span className="text-xs text-amber-400/70">from {lootHighlight.source}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lootHighlight.items.map((item, i) => (
              <Badge key={i} variant={item.rarity === 'rare' || item.rarity === 'legendary' ? 'warning' : 'secondary'} className="text-[10px]">
                {item.name}
              </Badge>
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

      {/* Party callout */}
      {partyCallout && (
        <div className="px-3 py-2 rounded border border-stone-600 bg-stone-800/40 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-stone-200">Party Status</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {partyCallout.characters.map((c, i) => (
              <span key={i} className={cn(
                'text-xs',
                c.name === partyCallout.highlight ? 'text-emerald-300 font-semibold' : 'text-stone-400',
              )}>
                {c.name} ({c.className}) — {c.hpPct}% HP
              </span>
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
