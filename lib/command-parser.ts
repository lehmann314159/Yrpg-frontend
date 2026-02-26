// Parses natural-language-ish player commands into MCP tool calls.
// This is a simple keyword-based parser; a more sophisticated NLP approach could be added later.

interface ParsedCommand {
  name: string;
  arguments: Record<string, unknown>;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim().toLowerCase();
  const words = trimmed.split(/\s+/);
  const first = words[0];

  // Movement
  if (first === 'go' || first === 'move' || first === 'walk') {
    const dir = words[1];
    if (['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'].includes(dir)) {
      const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west' };
      return { name: 'move', arguments: { direction: dirMap[dir] || dir } };
    }
  }

  // Bare direction
  if (['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'].includes(first)) {
    const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west' };
    return { name: 'move', arguments: { direction: dirMap[first] || first } };
  }

  // Look
  if (first === 'look' || first === 'examine' || first === 'l') {
    return { name: 'look', arguments: {} };
  }

  // Map
  if (first === 'map' || first === 'm') {
    return { name: 'map', arguments: {} };
  }

  // Stats
  if (first === 'stats' || first === 'status' || first === 'party') {
    return { name: 'stats', arguments: {} };
  }

  // Inventory
  if (first === 'inventory' || first === 'inv' || first === 'i') {
    return { name: 'inventory', arguments: {} };
  }

  // Rest
  if (first === 'rest' || first === 'sleep' || first === 'camp') {
    return { name: 'rest', arguments: {} };
  }

  // Combat status
  if (first === 'combat' && words[1] === 'status') {
    return { name: 'combat_status', arguments: {} };
  }

  // End turn
  if (first === 'end' && words[1] === 'turn') {
    return { name: 'end_turn', arguments: { character_id: words[2] || '' } };
  }

  // Defend
  if (first === 'defend') {
    return { name: 'combat_defend', arguments: { character_id: words[1] || '' } };
  }

  // Save / Load
  if (first === 'save') {
    return { name: 'save_game', arguments: {} };
  }
  if (first === 'load') {
    return { name: 'load_game', arguments: { session_id: words[1] || '' } };
  }

  // For commands with IDs (attack, take, equip, etc.), pass through as raw MCP
  // The UI will also provide clickable actions that bypass this parser

  // Fallback: try to use the first word as the tool name, rest as arguments
  return {
    name: first,
    arguments: words.length > 1 ? { raw: words.slice(1).join(' ') } : {},
  };
}