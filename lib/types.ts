// Types matching the API.md game state snapshot

export interface GameStateSnapshot {
  mode: 'exploration' | 'combat';
  party?: PartyView;
  currentRoom?: RoomView;
  monsters?: MonsterView[];
  roomItems?: ItemView[];
  roomTraps?: TrapView[];
  combat?: CombatView;
  mapGrid?: MapCell[][];
  gameOver: boolean;
  victory: boolean;
  turnNumber: number;
  message?: string;
  lastEvent?: GameEvent;
}

export interface PartyView {
  characters: CharacterView[];
  formation: string[];
}

export interface CharacterView {
  id: string;
  name: string;
  class: 'fighter' | 'magic_user' | 'thief';
  hp: number;
  maxHp: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  spellSlots: number;
  maxSpellSlots: number;
  knownSpells?: string[];
  inventory: ItemView[];
  ac: number;
  isAlive: boolean;
  status: 'Healthy' | 'Wounded' | 'Critical' | 'Dead';
}

export interface RoomView {
  id: string;
  name: string;
  description: string;
  isEntrance: boolean;
  isExit: boolean;
  x: number;
  y: number;
  exits: string[];
  isFirstVisit: boolean;
}

export interface MonsterView {
  id: string;
  name: string;
  description: string;
  hp: number;
  maxHp: number;
  damage: number;
  threat: 'trivial' | 'normal' | 'dangerous' | 'deadly';
  isDefeated: boolean;
  isRanged: boolean;
}

export interface ItemView {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'scroll' | 'key' | 'treasure';
  damage?: number;
  armor?: number;
  healing?: number;
  range?: 'melee' | 'ranged';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  classRestriction?: string[];
  isEquipped: boolean;
}

export interface TrapView {
  id: string;
  description: string;
  location: 'room' | 'chest';
  isTriggered: boolean;
  isDisarmed: boolean;
  isOpened: boolean;
  difficulty: number;
}

export interface CombatView {
  grid: string[][];
  combatants: CombatantView[];
  currentTurnIdx: number;
  roundNumber: number;
  isActive: boolean;
  awaitingScoutDecision: boolean;
  isScoutPhase: boolean;
}

export interface CombatantView {
  id: string;
  name: string;
  isPlayerChar: boolean;
  hp: number;
  maxHp: number;
  gridX: number;
  gridY: number;
  hasMoved: boolean;
  hasActed: boolean;
  isAlive: boolean;
  isHidden: boolean;
  movementRange: number;
  attackRange: number;
  knownSpells?: string[];
  protectedBy?: string;
}

export interface MapCell {
  x: number;
  y: number;
  roomId?: string;
  status: 'unknown' | 'visited' | 'current' | 'adjacent' | 'exit';
  hasPlayer: boolean;
  exits?: string[];
}

export interface GameEvent {
  session_id: string;
  turn_number: number;
  event_type: string;
  event_subtype: string;
  actor_id: string;
  actor_class: string;
  target_id: string;
  room_id: string;
  details: EventDetails;
}

export interface EventDetails {
  roll?: number;
  dc?: number;
  damage?: number;
  was_critical?: boolean;
  was_flanking?: boolean;
  weapon_used?: string;
  party_hp?: Record<string, number>;
  party_alive?: number;
  actor_pos?: { x: number; y: number };
  target_pos?: { x: number; y: number };
  item_name?: string;
  scroll_effect?: string;
  success?: boolean;
  trap_difficulty?: number;
  was_detected?: boolean;
  result_text?: string;
}

export interface Mood {
  atmosphere: 'calm' | 'tense' | 'dangerous' | 'desperate' | 'mysterious' | 'triumphant';
  urgency: 'normal' | 'elevated' | 'critical';
  palette: string;
}

export interface McpResponse {
  content: { type: string; text: string }[];
  gameState?: GameStateSnapshot;
  isError?: boolean;
}

export interface LLMResponse {
  narrative: string;
  moodOverride?: {
    atmosphere?: Mood['atmosphere'];
    reason?: string;
  };
}