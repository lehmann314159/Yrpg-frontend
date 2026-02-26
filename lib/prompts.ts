import type { GameStateSnapshot } from './types';

export const NARRATOR_SYSTEM_PROMPT = `You are the dungeon master narrator for a party-based RPG. Your job is to write immersive, atmospheric narrative text based on what just happened in the game.

You will receive:
1. A factual description of what happened (from the game engine)
2. The current game state (structured data)

Your output should be:
- A narrative paragraph (2-4 sentences) that dramatizes the events
- Written in second person ("Your party enters...")
- Matched in tone to the situation (tense in combat, mysterious in new rooms, urgent when wounded)
- NEVER contradict the game state — if the engine says the attack missed, it missed
- NEVER invent game mechanics, items, or characters not in the state

Keep it concise. The UI already shows HP bars, combat grids, and item cards — your job is atmosphere and storytelling, not repeating numbers.

Optionally, if you feel the mood should differ from what the game data suggests, end your response with a JSON block:
\`\`\`mood
{"atmosphere": "desperate", "reason": "party has been fighting for many rounds with no rest"}
\`\`\`
Only include this if the deterministic mood would miss something important.`;

export function formatNarratorInput(
  backendText: string,
  gs: GameStateSnapshot
): string {
  const partyStatus =
    gs.party?.characters
      .map((c) => `${c.name} (${c.class}): ${c.hp}/${c.maxHp} HP — ${c.status}`)
      .join('\n') || 'No party';

  return `GAME EVENT:
${backendText}

CURRENT STATE:
Mode: ${gs.mode}
Turn: ${gs.turnNumber}
${gs.currentRoom ? `Room: ${gs.currentRoom.name} (first visit: ${gs.currentRoom.isFirstVisit})` : ''}
Monsters: ${gs.monsters?.length || 0} (${gs.monsters?.map((m) => `${m.name} [${m.threat}]`).join(', ') || 'none'})
Traps: ${gs.roomTraps?.length || 0} discovered
${gs.combat ? `Combat Round: ${gs.combat.roundNumber}` : ''}
Game Over: ${gs.gameOver} Victory: ${gs.victory}

PARTY:
${partyStatus}`;
}