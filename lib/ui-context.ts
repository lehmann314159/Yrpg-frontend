import type { GameStateSnapshot, Mood } from './types';
import type { UIContext } from './ui-types';

export function summarizeForUI(
  gs: GameStateSnapshot,
  action: string,
  mood: Mood,
): UIContext {
  const party = gs.party;
  const members = party?.characters.map((c) => ({
    name: c.name,
    class: c.class,
    hpPct: c.maxHp > 0 ? Math.round((c.hp / c.maxHp) * 100) : 0,
    status: c.status,
  })) ?? [];

  const aliveCount = party?.characters.filter((c) => c.isAlive).length ?? 0;

  // Combat context
  let combat: UIContext['combat'] = null;
  if (gs.combat && gs.mode === 'combat') {
    const currentCombatant = gs.combat.combatants[gs.combat.currentTurnIdx];
    const playerChars = gs.combat.combatants.filter((c) => c.isPlayerChar && c.isAlive);
    const positionSummary = playerChars
      .map((c) => `${c.name} at (${c.gridX},${c.gridY})`)
      .join(', ');

    combat = {
      round: gs.combat.roundNumber,
      currentTurn: currentCombatant?.name ?? 'unknown',
      isScoutPhase: gs.combat.isScoutPhase,
      awaitingScoutDecision: gs.combat.awaitingScoutDecision,
      enemyCount: gs.combat.combatants.filter((c) => !c.isPlayerChar && c.isAlive).length,
      partyPositionSummary: positionSummary,
    };
  }

  // Monsters
  const monsters = (gs.monsters ?? [])
    .filter((m) => !m.isDefeated)
    .map((m) => ({
      name: m.name,
      threat: m.threat,
      hpPct: m.maxHp > 0 ? Math.round((m.hp / m.maxHp) * 100) : 0,
    }));

  // Items
  const items = (gs.roomItems ?? []).map((i) => ({
    name: i.name,
    rarity: i.rarity,
    type: i.type,
  }));

  // Traps
  const allTraps = gs.roomTraps ?? [];
  const traps = {
    total: allTraps.length,
    disarmed: allTraps.filter((t) => t.isDisarmed).length,
  };

  // Last event
  let lastEvent: UIContext['lastEvent'] = null;
  if (gs.lastEvent) {
    lastEvent = {
      type: gs.lastEvent.event_type,
      subtype: gs.lastEvent.event_subtype,
      resultText: gs.lastEvent.details.result_text ?? '',
      wasCritical: gs.lastEvent.details.was_critical ?? false,
      damage: gs.lastEvent.details.damage,
    };
  }

  // Room
  const room = gs.currentRoom
    ? {
        name: gs.currentRoom.name,
        isNew: gs.currentRoom.isFirstVisit,
        isExit: gs.currentRoom.isExit,
        isEntrance: gs.currentRoom.isEntrance,
        exitCount: gs.currentRoom.exits.length,
      }
    : null;

  return {
    mode: gs.mode,
    action,
    room,
    party: { size: members.length, alive: aliveCount, members },
    combat,
    monsters,
    items,
    traps,
    lastEvent,
    mood: { atmosphere: mood.atmosphere, urgency: mood.urgency },
    gameOver: gs.gameOver,
    victory: gs.victory,
    turnNumber: gs.turnNumber,
  };
}
