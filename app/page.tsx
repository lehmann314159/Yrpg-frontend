'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { GameContainer } from '@/components/layout/GameContainer';
import { NarrativePanel } from '@/components/game/NarrativePanel';
import { ActionBar } from '@/components/game/ActionBar';
import { SpellPicker } from '@/components/game/SpellPicker';
import { ItemPicker } from '@/components/game/ItemPicker';
import { deriveMood } from '@/lib/mood';
import { parseCommand } from '@/lib/command-parser';
import { parseMoodOverride } from '@/lib/llm-client';
import { sendCommand } from './actions';
import { getAvailableActions, getAutoSelectedCharacter, spellInfo } from '@/lib/actions';
import type { GameStateSnapshot, MapCell, Mood } from '@/lib/types';
import type { ActionDefinition, PendingAction, TargetingMode } from '@/lib/actions';
import { accumulateRoom, buildMapGrid, type AccumulatedRoom } from '@/lib/map-accumulator';
import { cn } from '@/lib/utils';
import { moodThemes } from '@/lib/mood';
import { Send, Loader2 } from 'lucide-react';

export default function GamePage() {
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [mood, setMood] = useState<Mood>(deriveMood(null));
  const [narrative, setNarrative] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const narrativeAbortRef = useRef<AbortController | null>(null);

  // Map accumulator state
  const accumulatedRoomsRef = useRef<Map<string, AccumulatedRoom>>(new Map());
  const [mapGrid, setMapGrid] = useState<MapCell[][]>([]);

  // Action/targeting state
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState<'use' | 'equip' | null>(null);

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
      // Reset on new game (turn 1 or unknown room means fresh dungeon)
      if (gameState.turnNumber === 1 || !accumulatedRoomsRef.current.has(gameState.currentRoom.id) && accumulatedRoomsRef.current.size > 0 && gameState.currentRoom.isEntrance) {
        accumulatedRoomsRef.current = new Map();
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

  // Stream narrative from LLM (client-side)
  const streamNarrative = useCallback(
    async (backendText: string, gs: GameStateSnapshot) => {
      // Cancel any in-flight narrative stream
      narrativeAbortRef.current?.abort();
      const abort = new AbortController();
      narrativeAbortRef.current = abort;

      setIsStreaming(true);
      setNarrative(backendText);

      try {
        const response = await fetch('/api/narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backendText, gameState: gs }),
          signal: abort.signal,
        });

        if (!response.ok || !response.body) {
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiNarrative = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          aiNarrative += chunk;
          if (!abort.signal.aborted) {
            setNarrative(aiNarrative);
          }
        }

        if (!abort.signal.aborted) {
          const override = parseMoodOverride(aiNarrative);
          if (override?.atmosphere) {
            setMood((prev) => ({
              ...prev,
              atmosphere: override.atmosphere as Mood['atmosphere'],
              palette: `theme-${override.atmosphere === 'dangerous' ? 'danger' : override.atmosphere === 'mysterious' ? 'mystery' : override.atmosphere === 'triumphant' ? 'victory' : override.atmosphere}`,
            }));
          }
        }
      } catch {
        // LLM unavailable or aborted — keep backend text
      }

      if (!abort.signal.aborted) {
        setIsStreaming(false);
      }
    },
    []
  );

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

          streamNarrative(result.backendText, result.gameState);
        }
      } catch {
        setError('An unexpected error occurred.');
      }

      setLoading(false);
    },
    [streamNarrative]
  );

  // Text input handler
  const handleSubmit = useCallback(async () => {
    const command = input.trim();
    if (!command || loading) return;

    setInput('');
    const parsed = parseCommand(command);
    await executeAction(parsed.name, parsed.arguments);
  }, [input, loading, executeAction]);

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
          const targeting: 'ally' | 'enemy' = item.healing != null && item.healing > 0 ? 'ally' : 'enemy';
          setPendingAction({
            toolName,
            args: { character_id: selectedCharacterId, item_id: itemId },
            targeting,
            prompt: `Select ${targeting === 'ally' ? 'an ally' : 'an enemy'} for ${item.name}`,
          });
        } else {
          executeAction(toolName, { character_id: selectedCharacterId, item_id: itemId });
        }
      } else if (showItemPicker === 'equip') {
        executeAction('equip', { character_id: selectedCharacterId, item_id: itemId });
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
    [gameState]
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
        {/* Narrative panel */}
        <div className="p-4 pb-0">
          <NarrativePanel text={narrative} mood={mood} isStreaming={isStreaming} />
        </div>

        {/* Game content */}
        <GameContainer
          gameState={gameState}
          mood={mood}
          combatLog={combatLog}
          pendingAction={pendingAction}
          selectedCharacterId={selectedCharacterId}
          loading={loading}
          onTargetSelect={handleTargetSelect}
          onCellClick={handleCellClick}
          onExitClick={handleExitClick}
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
              inCombat={gameState?.mode === 'combat'}
              onPickItem={handleItemPick}
              onClose={handleCancelTargeting}
            />
          </div>
        )}

        {/* Action bar */}
        {gameState && !gameState.gameOver && !isMonsterTurn && (
          <div className="px-4 pb-2">
            <ActionBar
              actions={availableActions}
              pendingAction={pendingAction}
              onActionClick={handleActionClick}
              onCancelTargeting={handleCancelTargeting}
              disabled={loading}
            />
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
