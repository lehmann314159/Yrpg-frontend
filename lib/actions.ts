import type { GameStateSnapshot, CombatantView } from './types';

// --- Types ---

export type TargetingMode =
  | 'none'
  | 'enemy'
  | 'ally'
  | 'item'
  | 'trap'
  | 'grid_cell'
  | 'spell_then_target';

export interface PendingAction {
  toolName: string;
  args: Record<string, unknown>;
  targeting: Exclude<TargetingMode, 'none' | 'spell_then_target'>;
  prompt: string;
  /** If true, target is {x, y} coordinates instead of entity ID */
  isCoordinateTarget?: boolean;
  /** Arg name for the target ID (default: 'target_id') */
  targetArgName?: string;
}

export interface ActionDefinition {
  id: string;
  label: string;
  icon: string; // lucide icon name
  toolName: string;
  targeting: TargetingMode;
  targetPrompt?: string;
  /** Extra static args merged into the command */
  extraArgs?: Record<string, unknown>;
  /** Whether this action needs the character_id arg */
  needsCharacterId?: boolean;
  /** Arg name for the target ID (default: 'target_id') */
  targetArgName?: string;
}

// --- Shared spell data (extracted from SpellPanel) ---

export interface SpellInfo {
  name: string;
  desc: string;
  combatOnly: boolean;
  targetType: 'ally' | 'enemy' | 'self';
}

export const spellInfo: Record<string, SpellInfo> = {
  heal: { name: 'Heal', desc: '2d6+4 HP to target', combatOnly: false, targetType: 'ally' },
  resurrect: { name: 'Resurrect', desc: 'Revive dead ally at 50% HP', combatOnly: false, targetType: 'ally' },
  fireball: { name: 'Fireball', desc: '3d6 damage + splash', combatOnly: true, targetType: 'enemy' },
  lightning: { name: 'Lightning Bolt', desc: '4d6 single target', combatOnly: true, targetType: 'enemy' },
  shield: { name: 'Shield', desc: '+4 AC party, 3 rounds', combatOnly: true, targetType: 'self' },
  sleep: { name: 'Sleep', desc: 'Skip 2 turns', combatOnly: true, targetType: 'enemy' },
};

// --- Action availability logic ---

function getCombatant(gs: GameStateSnapshot, charId: string): CombatantView | undefined {
  return gs.combat?.combatants.find((c) => c.id === charId);
}

function isCurrentTurn(gs: GameStateSnapshot, charId: string): boolean {
  if (!gs.combat?.isActive) return false;
  const current = gs.combat.combatants[gs.combat.currentTurnIdx];
  return current?.id === charId;
}

export function getAvailableActions(
  gs: GameStateSnapshot | null,
  selectedCharId: string | null,
): ActionDefinition[] {
  if (!gs || !selectedCharId) return [];

  const char = gs.party?.characters.find((c) => c.id === selectedCharId);
  if (!char || !char.isAlive) return [];

  const actions: ActionDefinition[] = [];

  if (gs.mode === 'exploration') {
    actions.push({
      id: 'look',
      label: 'Look',
      icon: 'Eye',
      toolName: 'look',
      targeting: 'none',
    });

    actions.push({
      id: 'rest',
      label: 'Rest',
      icon: 'Moon',
      toolName: 'rest',
      targeting: 'none',
    });

    // Take item
    if ((gs.roomItems || []).length > 0) {
      actions.push({
        id: 'take_item',
        label: 'Take Item',
        icon: 'PackagePlus',
        toolName: 'take',
        targeting: 'item',
        targetPrompt: 'Select an item to take',
        needsCharacterId: true,
        targetArgName: 'item_id',
      });
    }

    // Open chest (always available, backend errors if no chest)
    actions.push({
      id: 'open_chest',
      label: 'Open Chest',
      icon: 'Package',
      toolName: 'open_chest',
      targeting: 'none',
      needsCharacterId: true,
    });

    // Disarm trap (thief only)
    if (char.class === 'thief' && (gs.roomTraps || []).filter((t) => !t.isDisarmed).length > 0) {
      actions.push({
        id: 'disarm_trap',
        label: 'Disarm Trap',
        icon: 'Wrench',
        toolName: 'disarm_trap',
        targeting: 'trap',
        targetPrompt: 'Select a trap to disarm',
        needsCharacterId: true,
        targetArgName: 'trap_id',
      });
    }

    // Cast spell (magic user with spell slots)
    if (char.class === 'magic_user' && char.spellSlots > 0) {
      actions.push({
        id: 'cast_spell',
        label: 'Cast Spell',
        icon: 'Wand2',
        toolName: 'cast_spell',
        targeting: 'spell_then_target',
        needsCharacterId: true,
      });
    }

  } else if (gs.mode === 'combat' && gs.combat?.isActive) {
    // Combat actions — only available on current turn character
    if (!isCurrentTurn(gs, selectedCharId)) return [];

    const combatant = getCombatant(gs, selectedCharId);
    if (!combatant) return [];

    // Attack (if hasn't acted)
    if (!combatant.hasActed) {
      actions.push({
        id: 'attack',
        label: 'Attack',
        icon: 'Swords',
        toolName: 'combat_attack',
        targeting: 'enemy',
        targetPrompt: 'Select an enemy to attack',
        needsCharacterId: true,
      });
    }

    // Move (if hasn't moved)
    if (!combatant.hasMoved) {
      actions.push({
        id: 'combat_move',
        label: 'Move',
        icon: 'Footprints',
        toolName: 'combat_move',
        targeting: 'grid_cell',
        targetPrompt: 'Select a cell to move to',
        needsCharacterId: true,
      });
    }

    // Defend (if hasn't acted)
    if (!combatant.hasActed) {
      actions.push({
        id: 'defend',
        label: 'Defend',
        icon: 'ShieldHalf',
        toolName: 'combat_defend',
        targeting: 'none',
        needsCharacterId: true,
      });
    }

    // Cast spell (magic user, hasn't acted, has spell slots)
    if (char.class === 'magic_user' && !combatant.hasActed && char.spellSlots > 0) {
      actions.push({
        id: 'cast_spell',
        label: 'Cast Spell',
        icon: 'Wand2',
        toolName: 'cast_spell',
        targeting: 'spell_then_target',
        needsCharacterId: true,
      });
    }

    // Hide (thief, hasn't acted)
    if (char.class === 'thief' && !combatant.hasActed && !combatant.isHidden) {
      actions.push({
        id: 'hide',
        label: 'Hide',
        icon: 'EyeOff',
        toolName: 'combat_hide',
        targeting: 'none',
        needsCharacterId: true,
      });
    }

    // End turn
    actions.push({
      id: 'end_turn',
      label: 'End Turn',
      icon: 'SkipForward',
      toolName: 'end_turn',
      targeting: 'none',
      needsCharacterId: true,
    });
  }

  return actions;
}

/** Find the first alive character, preferring current turn combatant in combat */
export function getAutoSelectedCharacter(
  gs: GameStateSnapshot | null,
): string | null {
  if (!gs?.party) return null;

  // In combat, select current turn character if it's a player
  if (gs.mode === 'combat' && gs.combat?.isActive) {
    const current = gs.combat.combatants[gs.combat.currentTurnIdx];
    if (current?.isPlayerChar && current.isAlive) {
      return current.id;
    }
  }

  // Fallback: first alive character
  const alive = gs.party.characters.find((c) => c.isAlive);
  return alive?.id ?? null;
}
