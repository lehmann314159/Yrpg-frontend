'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { GameContainer } from '@/components/layout/GameContainer';
import { NarrativePanel } from '@/components/game/NarrativePanel';
import { SceneImage } from '@/components/game/SceneImage';
import { ActionBar } from '@/components/game/ActionBar';
import { SpellPicker } from '@/components/game/SpellPicker';
import { ItemPicker } from '@/components/game/ItemPicker';
import { ExitButtons } from '@/components/game/ExitButtons';
import { deriveMood } from '@/lib/mood';
import { parseCommand } from '@/lib/command-parser';
import { sendCommand, generateUI } from './actions';
import { getAvailableActions, getAutoSelectedCharacter, spellInfo } from '@/lib/actions';
import type { GameStateSnapshot, MapCell, Mood } from '@/lib/types';
import type { ActionDefinition, PendingAction } from '@/lib/actions';
import type { UIGenerationResult } from '@/lib/ui-types';
import { accumulateRoom, buildMapGrid, type AccumulatedRoom } from '@/lib/map-accumulator';
import { cn } from '@/lib/utils';
import { moodThemes } from '@/lib/mood';
import { Send, Loader2 } from 'lucide-react';

export default function GamePage() {
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [mood, setMood] = useState<Mood>(deriveMood(null));
  const [narrative, setNarrative] = useState('');
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [scenePrompt, setScenePrompt] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uiResult, setUiResult] = useState<UIGenerationResult | null>(null);

  // Generation counter to discard stale generateUI results
  const uiGenerationRef = useRef(0);

  // Image cache: room ID → base64 data URL
  const imageCacheRef = useRef<Map<string, string>>(new Map());

  // Map accumulator state
  const accumulatedRoomsRef = useRef<Map<string, AccumulatedRoom>>(new Map());
  const [mapGrid, setMapGrid] = useState<MapCell[][]>([]);

  // Action/targeting state
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState<'use' | 'equip' | 'drop' | 'give' | null>(null);

  // Auto-select character when gameState changes
  useEffect(() => {
    const autoId = getAutoSelectedCharacter(gameState);
    if (!autoId) return;

    // In combat, always follow the active turn
    if (gameState?.mode === 'combat') {
      setSelectedCharacterId(autoId);
      return;
    }

    // In exploration, only auto-select if nothing is selected or current selection is dead
    setSelectedCharacterId((prev) => {
      if (!prev) return autoId;
      const current = gameState?.party?.characters.find((c) => c.id === prev);
      if (!current?.isAlive) return autoId;
      return prev;
    });
  }, [gameState]);

  // Cancel targeting and accumulate map when gameState changes
  useEffect(() => {
    setPendingAction(null);
    setShowSpellPicker(false);
    setShowItemPicker(null);

    // Accumulate room data for the dungeon map
    if (gameState?.currentRoom) {
      // Reset on new game (turn 1 or unvisited entrance means fresh dungeon)
      const coordKey = `${gameState.currentRoom.x},${gameState.currentRoom.y}`;
      if (gameState.turnNumber === 1 || (!accumulatedRoomsRef.current.has(coordKey) && accumulatedRoomsRef.current.size > 0 && gameState.currentRoom.isEntrance)) {
        accumulatedRoomsRef.current = new Map();
        imageCacheRef.current = new Map();
        setCombatLog([]);
      }
      accumulateRoom(accumulatedRoomsRef.current, gameState.currentRoom);
      setMapGrid(buildMapGrid(accumulatedRoomsRef.current, gameState.currentRoom));
    }
  }, [gameState]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Core action executor — shared by click actions and text input
  const executeAction = useCallback(
    async (toolName: string, args: Record<string, unknown>) => {
      setError(null);
      setLoading(true);

      try {
        const result = await sendCommand(toolName, args);

        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        if (result.gameState) {
          setGameState(result.gameState);
          setMood(result.mood);

          if (result.backendText) {
            setCombatLog((prev) => [...prev.slice(-19), result.backendText]);
          }

          // Phase 1: show backend text immediately
          // const generation = ++uiGenerationRef.current;
          setNarrative(result.backendText);
          setUiResult(null);

          // Phase 2: AI-driven UI generation — DISABLED for fast iteration
          // if (result.gameState.mode !== 'combat') {
          //   const roomId = result.gameState.currentRoom?.id;
          //   if (roomId && imageCacheRef.current.has(roomId)) {
          //     setSceneImage(imageCacheRef.current.get(roomId)!);
          //   } else {
          //     setIsImageLoading(true);
          //   }
          //   generateUI(result.backendText, result.gameState, result.mood)
          //     .then((ui) => {
          //       if (uiGenerationRef.current !== generation) return;
          //       setUiResult(ui);
          //       if (ui.imageUrl) {
          //         if (roomId) imageCacheRef.current.set(roomId, ui.imageUrl);
          //         setSceneImage(ui.imageUrl);
          //         setScenePrompt(ui.imagePrompt ?? null);
          //       }
          //       setIsImageLoading(false);
          //     })
          //     .catch(() => {
          //       if (uiGenerationRef.current !== generation) return;
          //       setIsImageLoading(false);
          //     });
          // }
        }
      } catch {
        setError('An unexpected error occurred.');
      }

      setLoading(false);
    },
    []
  );

  // Resolve raw text args to actual IDs using game state
  const resolveRawArgs = useCallback(
    (toolName: string, raw: string, gs: GameStateSnapshot): Record<string, unknown> | null => {
      const text = raw.toLowerCase().replace(/^the\s+/, '');
      const charId = selectedCharacterId;

      if (toolName === 'take') {
        const item = gs.roomItems?.find((i) => i.name.toLowerCase().includes(text));
        if (item && charId) return { character_id: charId, item_id: item.id };
      } else if (toolName === 'use_item' || toolName === 'combat_use_item') {
        const char = gs.party?.characters.find((c) => c.id === charId);
        const item = char?.inventory.find((i) =>
          (i.type === 'consumable' || i.type === 'scroll') && i.name.toLowerCase().includes(text)
        );
        if (item && charId) return { character_id: charId, item_id: item.id };
      }
      return null;
    },
    [selectedCharacterId]
  );

  // Text input handler
  const handleSubmit = useCallback(async () => {
    const command = input.trim();
    if (!command || loading) return;

    setInput('');
    const parsed = parseCommand(command);

    // If parseCommand returned raw args, try to resolve them client-side
    if ('raw' in parsed.arguments && gameState) {
      const resolved = resolveRawArgs(parsed.name, parsed.arguments.raw as string, gameState);
      if (resolved) {
        await executeAction(parsed.name, resolved);
        return;
      }

      setError("Couldn't understand that command. Try using the action buttons.");
      return;
    }

    await executeAction(parsed.name, parsed.arguments);
  }, [input, loading, executeAction, gameState, resolveRawArgs]);

  // Action bar click handler
  const handleActionClick = useCallback(
    (action: ActionDefinition) => {
      if (loading) return;

      // Build base args
      const args: Record<string, unknown> = { ...action.extraArgs };
      if (action.needsCharacterId && selectedCharacterId) {
        args.character_id = selectedCharacterId;
      }

      if (action.targeting === 'none') {
        // Execute immediately
        executeAction(action.toolName, args);
      } else if (action.targeting === 'spell_then_target') {
        // Show spell picker
        setShowSpellPicker(true);
      } else if (action.targeting === 'item_then_use') {
        setShowItemPicker('use');
      } else if (action.targeting === 'item_then_equip') {
        setShowItemPicker('equip');
      } else if (action.targeting === 'item_then_drop') {
        setShowItemPicker('drop');
      } else if (action.targeting === 'item_then_ally') {
        setShowItemPicker('give');
      } else {
        // Enter targeting mode
        setPendingAction({
          toolName: action.toolName,
          args,
          targeting: action.targeting,
          prompt: action.targetPrompt || 'Select a target...',
          isCoordinateTarget: action.targeting === 'grid_cell',
          targetArgName: action.targetArgName,
        });
      }
    },
    [loading, selectedCharacterId, executeAction]
  );

  // Spell picker handler
  const handleSpellPick = useCallback(
    (spellId: string) => {
      setShowSpellPicker(false);
      const info = spellInfo[spellId];

      const inCombat = gameState?.mode === 'combat';
      const toolName = inCombat ? 'combat_cast_spell' : 'cast_spell';
      const args: Record<string, unknown> = {
        character_id: selectedCharacterId,
        spell_id: spellId,
      };

      if (!info) {
        // Unknown spell — let the backend handle targeting
        executeAction(toolName, args);
      } else if (info.targetType === 'self') {
        // Self-targeted spells execute immediately
        executeAction(toolName, args);
      } else {
        // Need a target
        const targeting: 'ally' | 'enemy' = info.targetType === 'ally' ? 'ally' : 'enemy';
        setPendingAction({
          toolName,
          args,
          targeting,
          prompt: `Select ${targeting === 'ally' ? 'an ally' : 'an enemy'} for ${info.name}`,
        });
      }
    },
    [selectedCharacterId, executeAction, gameState?.mode]
  );

  // Item picker handler
  const handleItemPick = useCallback(
    (itemId: string) => {
      setShowItemPicker(null);
      const inCombat = gameState?.mode === 'combat';

      if (showItemPicker === 'use') {
        const toolName = inCombat ? 'combat_use_item' : 'use_item';
        const selectedChar = gameState?.party?.characters.find((c) => c.id === selectedCharacterId);
        const item = selectedChar?.inventory.find((i) => i.id === itemId);

        if (item?.type === 'scroll') {
          const isHeal = item.healing != null && item.healing > 0;
          const isDamage = item.damage != null && item.damage > 0;
          if (!isHeal && !isDamage) {
            // Self-buff scroll (e.g. Shield) — no target needed
            executeAction(toolName, { character_id: selectedCharacterId, item_id: itemId });
          } else {
            const targeting: 'ally' | 'enemy' = isHeal ? 'ally' : 'enemy';
            setPendingAction({
              toolName,
              args: { character_id: selectedCharacterId, item_id: itemId },
              targeting,
              prompt: `Select ${targeting === 'ally' ? 'an ally' : 'an enemy'} for ${item.name}`,
            });
          }
        } else {
          executeAction(toolName, { character_id: selectedCharacterId, item_id: itemId });
        }
      } else if (showItemPicker === 'equip') {
        executeAction('equip', { character_id: selectedCharacterId, item_id: itemId });
      } else if (showItemPicker === 'drop') {
        executeAction('drop_item', { character_id: selectedCharacterId, item_id: itemId });
      } else if (showItemPicker === 'give') {
        setPendingAction({
          toolName: 'give_item',
          args: { character_id: selectedCharacterId, item_id: itemId },
          targeting: 'ally',
          prompt: 'Select an ally to give the item to',
          targetArgName: 'target_character_id',
        });
      }
    },
    [showItemPicker, selectedCharacterId, executeAction, gameState?.mode, gameState?.party?.characters]
  );

  // Target selection handler (entity ID)
  const handleTargetSelect = useCallback(
    (targetId: string) => {
      if (!pendingAction) return;
      const argName = pendingAction.targetArgName || 'target_id';
      const args = { ...pendingAction.args, [argName]: targetId };
      setPendingAction(null);
      executeAction(pendingAction.toolName, args);
    },
    [pendingAction, executeAction]
  );

  // Grid cell click handler (coordinates)
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (!pendingAction || !pendingAction.isCoordinateTarget) return;
      const args = { ...pendingAction.args, x, y };
      setPendingAction(null);
      executeAction(pendingAction.toolName, args);
    },
    [pendingAction, executeAction]
  );

  // Cancel targeting
  const handleCancelTargeting = useCallback(() => {
    setPendingAction(null);
    setShowSpellPicker(false);
    setShowItemPicker(null);
  }, []);

  // Character selection
  const handleCharacterClick = useCallback(
    (charId: string) => {
      const char = gameState?.party?.characters.find((c) => c.id === charId);
      if (!char?.isAlive) return;

      // If ally targeting is active, select the target instead of switching characters
      if (pendingAction?.targeting === 'ally') {
        handleTargetSelect(charId);
        return;
      }

      // In combat, only allow selecting the current turn character
      if (gameState?.mode === 'combat' && gameState.combat?.isActive) {
        const current = gameState.combat.combatants[gameState.combat.currentTurnIdx];
        if (current?.id !== charId) return;
      }

      setSelectedCharacterId(charId);
      // Cancel any pending action when switching characters
      setPendingAction(null);
      setShowSpellPicker(false);
      setShowItemPicker(null);
    },
    [gameState, pendingAction, handleTargetSelect]
  );

  // Exit click — also handles direction targeting (scout_ahead, sneak)
  const handleExitClick = useCallback(
    (direction: string) => {
      if (loading) return;
      if (pendingAction?.targeting === 'direction') {
        const argName = pendingAction.targetArgName || 'direction';
        const args = { ...pendingAction.args, [argName]: direction };
        setPendingAction(null);
        executeAction(pendingAction.toolName, args);
      } else {
        executeAction('move', { direction });
      }
    },
    [loading, pendingAction, executeAction]
  );

  // Formation reorder
  const handleReorder = useCallback(
    (formation: string[]) => {
      executeAction('set_formation', { formation });
    },
    [executeAction]
  );

  // Start game
  const handleStartGame = useCallback(
    (characters: { name: string; class: string }[]) => {
      if (loading) return;
      executeAction('new_game', { characters });
    },
    [loading, executeAction]
  );

  // Compute available actions
  const availableActions = getAvailableActions(gameState, selectedCharacterId);

  // Determine if it's a monster's turn (hide action bar)
  const isMonsterTurn =
    gameState?.mode === 'combat' &&
    gameState?.combat?.isActive &&
    !gameState.combat.combatants[gameState.combat.currentTurnIdx]?.isPlayerChar;

  // Get selected character for spell picker
  const selectedChar = gameState?.party?.characters.find((c) => c.id === selectedCharacterId);

  return (
    <div className={cn('flex h-screen', moodThemes[mood.atmosphere])}>
      <Sidebar
        gameState={gameState}
        mapGrid={mapGrid}
        selectedCharacterId={selectedCharacterId}
        onCharacterClick={handleCharacterClick}
        onReorder={handleReorder}
        formationDisabled={loading || gameState?.mode === 'combat'}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Scene image (exploration only) + Narrative panel */}
        <div className="p-4 pb-0 space-y-3">
          {gameState?.mode !== 'combat' && (
            <SceneImage imageUrl={sceneImage} isLoading={isImageLoading} prompt={scenePrompt} />
          )}
          <NarrativePanel text={narrative} mood={mood} />
        </div>

        {/* Game content */}
        <GameContainer
          gameState={gameState}
          mood={mood}
          combatLog={combatLog}
          pendingAction={pendingAction}
          selectedCharacterId={selectedCharacterId}
          loading={loading}
          uiResult={uiResult}
          sceneImage={sceneImage}
          scenePrompt={scenePrompt}
          isImageLoading={isImageLoading}
          onTargetSelect={handleTargetSelect}
          onCellClick={handleCellClick}
          onStartGame={handleStartGame}
        />

        {/* Spell picker overlay */}
        {showSpellPicker && selectedChar && (
          <div className="px-4 pb-2">
            <SpellPicker
              character={selectedChar}
              inCombat={gameState?.mode === 'combat'}
              onPickSpell={handleSpellPick}
              onClose={handleCancelTargeting}
            />
          </div>
        )}

        {/* Item picker overlay */}
        {showItemPicker && selectedChar && (
          <div className="px-4 pb-2">
            <ItemPicker
              character={selectedChar}
              mode={showItemPicker}
              onPickItem={handleItemPick}
              onClose={handleCancelTargeting}
            />
          </div>
        )}

        {/* Exit buttons + Action bar */}
        {gameState && !gameState.gameOver && !isMonsterTurn && (
          <div className="px-4 pb-2 flex items-center gap-3">
            {gameState.currentRoom && gameState.currentRoom.exits.length > 0 && (
              <ExitButtons
                exits={gameState.currentRoom.exits}
                onExitClick={handleExitClick}
                disabled={loading || gameState.mode === 'combat'}
              />
            )}
            <div className="flex-1 min-w-0">
              <ActionBar
                actions={availableActions}
                pendingAction={pendingAction}
                onActionClick={handleActionClick}
                onCancelTargeting={handleCancelTargeting}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded border border-red-800 bg-red-950/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Command input */}
        <div className="border-t border-stone-700 p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={
                gameState
                  ? gameState.mode === 'combat'
                    ? 'Combat command (attack, defend, cast, move...)'
                    : 'What do you want to do? (go north, look, rest...)'
                  : 'Or type a command here...'
              }
              disabled={loading}
              className={cn(
                'flex-1 px-4 py-2 rounded border bg-stone-800 text-stone-100 placeholder-stone-500',
                'border-stone-600 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400',
                'disabled:opacity-50',
              )}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className={cn(
                'px-3 py-2 rounded border border-stone-600 bg-stone-700 text-stone-200',
                'hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors',
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
