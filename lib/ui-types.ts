// Generative UI types — Phase 2 AI-driven layout and narrative

export type LayoutStyle = 'standard' | 'combat_focus' | 'cinematic' | 'dense';

export type ComponentVariant = 'standard' | 'dramatic' | 'compact' | 'atmospheric' | 'minimal';

export type NarrativeMood = 'neutral' | 'tense' | 'triumphant' | 'mysterious' | 'dangerous' | 'desperate';

// Discriminated union for UI components returned by AI tools
export type UIComponent =
  | { type: 'layout'; style: LayoutStyle }
  | { type: 'narrative'; text: string; mood: NarrativeMood }
  | { type: 'notification'; notificationType: string; title: string; message: string; urgency?: string; variant?: ComponentVariant }
  | { type: 'combat_summary'; roundNumber: number; currentTurn: string; phase: string; tacticalHint?: string; variant?: ComponentVariant }
  | { type: 'monster_emphasis'; emphasis: 'normal' | 'threatening' | 'trivial'; variant?: ComponentVariant }
  | { type: 'loot_highlight'; items: { name: string; rarity: string; type: string }[]; source: string; variant?: ComponentVariant }
  | { type: 'party_callout'; characters: { name: string; className: string; hpPct: number; status: string }[]; highlight?: string; variant?: ComponentVariant }
  | { type: 'combat_result'; actor: string; target: string; action: string; result: string; damage?: number; wasCritical?: boolean; description: string; variant?: ComponentVariant }
  | { type: 'complete' };

// Result returned from generateUI server action
export interface UIGenerationResult {
  components: UIComponent[];
  imageUrl?: string | null;
  imagePrompt?: string | null;
  error?: string;
}

// Summarized context sent to Claude (kept under ~500 tokens)
export interface UIContext {
  mode: 'exploration' | 'combat';
  action: string;
  room: { name: string; isNew: boolean; isExit: boolean; isEntrance: boolean; exitCount: number } | null;
  party: { size: number; alive: number; members: { name: string; class: string; hpPct: number; status: string }[] };
  combat: { round: number; currentTurn: string; isScoutPhase: boolean; awaitingScoutDecision: boolean; enemyCount: number; partyPositionSummary: string } | null;
  monsters: { name: string; threat: string; hpPct: number }[];
  items: { name: string; rarity: string; type: string }[];
  traps: { total: number; disarmed: number };
  lastEvent: { type: string; subtype: string; resultText: string; wasCritical: boolean; damage?: number } | null;
  mood: { atmosphere: string; urgency: string };
  gameOver: boolean;
  victory: boolean;
  turnNumber: number;
}
