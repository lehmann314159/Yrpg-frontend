# Frontend Plan: Deterministic UI + AI Narrative Layer

## Architecture Overview

The frontend uses a two-layer rendering approach:
1. **Deterministic UI** renders instantly from `gameState` data — combat grid, HP bars, items, map
2. **AI Narrative Layer** streams in parallel from a local LLM (Qwen3), providing dungeon master narration and mood refinements

The LLM does not control which components appear. It writes narrative text and can suggest mood overrides that enhance the deterministic base styling.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Next.js App                                              │  │
│  │  - Persistent sidebar (party stats, map, formation)       │  │
│  │  - Deterministic game components (instant render)         │  │
│  │  - AI narrative panel (streams in parallel)               │  │
│  │  - Command input                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. User command
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Server Action                                          │
│  - Calls Go backend for game logic                              │
│  - Renders deterministic UI immediately from gameState          │
│  - Calls local LLM in parallel for narrative + mood             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│  Go Backend (MCP)    │              │  Local LLM (Qwen3)   │
│  - 22 game tools     │              │  - Narrative text     │
│  - Returns gameState │              │  - Mood assessment    │
│  - Deterministic     │              │  - Atmosphere cues    │
│  - Source of truth   │              │  - Streams in parallel│
└──────────────────────┘              └──────────────────────┘
```

## Flow Example

1. **User types:** "go north"
2. **Server action** calls Go backend: `POST /mcp/call {name: "move", arguments: {direction: "north"}}`
3. **Go backend** returns `{content: [...], gameState: {...}}`
4. **Immediately:** Deterministic UI renders from `gameState` — new room, combat grid (if combat started), monsters, items, traps, updated party HP
5. **In parallel:** Server action sends `gameState` + backend `content` text to local Qwen3 LLM
6. **LLM streams back:** Narrative text ("The door creaks open to reveal a vast chamber...") and optional mood assessment
7. **Narrative panel updates** as tokens arrive, mood overrides refine component styling

The player sees the game state update instantly. The narrative flows in moments later.

## Rendering Layers

### Layer 1: Deterministic UI (instant, no AI)

Components render directly from `gameState` fields. Same state = same UI, every time.

```typescript
function renderFromGameState(gameState: GameStateSnapshot) {
  // These render immediately — no AI involved
  if (gameState.mode === 'combat') {
    render(<CombatGrid combat={gameState.combat} party={gameState.party} />);
  }
  if (gameState.currentRoom) {
    render(<RoomHeader room={gameState.currentRoom} />);
  }
  gameState.monsters.forEach(m => render(<MonsterCard {...m} />));
  gameState.roomItems.forEach(i => render(<ItemCard {...i} />));
  gameState.roomTraps.filter(t => !t.isDisarmed).forEach(t => render(<TrapWarning {...t} />));

  // Sidebar always updates
  render(<PartyPanel party={gameState.party} />);
  render(<DungeonMap grid={gameState.mapGrid} />);
}
```

### Layer 2: Deterministic Mood (instant, no AI)

Computed from `gameState` to set baseline styling. The AI can override this, but the game always has a reasonable default.

```typescript
interface Mood {
  atmosphere: 'calm' | 'tense' | 'dangerous' | 'desperate' | 'mysterious' | 'triumphant';
  urgency: 'normal' | 'elevated' | 'critical';
  palette: string;  // CSS class for background/accent theming
}

function deriveMood(gs: GameStateSnapshot): Mood {
  const partyHealthPct = avgPartyHealth(gs.party);
  const maxThreat = maxMonsterThreat(gs.monsters);
  const inCombat = gs.mode === 'combat';
  const isFirstVisit = gs.currentRoom?.isFirstVisit;
  const lowRound = inCombat && gs.combat.roundNumber <= 1;

  // Atmosphere
  let atmosphere: Mood['atmosphere'] = 'calm';
  if (gs.gameOver && gs.victory) atmosphere = 'triumphant';
  else if (inCombat && partyHealthPct < 0.3) atmosphere = 'desperate';
  else if (maxThreat === 'deadly') atmosphere = 'dangerous';
  else if (inCombat || maxThreat === 'dangerous') atmosphere = 'tense';
  else if (isFirstVisit) atmosphere = 'mysterious';

  // Urgency
  let urgency: Mood['urgency'] = 'normal';
  if (partyHealthPct < 0.3) urgency = 'critical';
  else if (partyHealthPct < 0.6 || maxThreat === 'dangerous') urgency = 'elevated';

  // Palette
  const palettes = {
    calm: 'theme-calm',
    tense: 'theme-tense',
    dangerous: 'theme-danger',
    desperate: 'theme-desperate',
    mysterious: 'theme-mystery',
    triumphant: 'theme-victory',
  };

  return { atmosphere, urgency, palette: palettes[atmosphere] };
}
```

### Layer 3: AI Narrative + Mood Override (streams in parallel)

The LLM receives the game state and backend content text, then returns:
- **Narrative text** — dungeon master flavor for the narrative panel
- **Optional mood override** — if the AI detects nuance the deterministic rules miss

```typescript
interface LLMResponse {
  narrative: string;          // DM narration text
  moodOverride?: {            // optional — only if AI disagrees with deterministic mood
    atmosphere?: Mood['atmosphere'];
    reason?: string;          // e.g. "party has fought 5 rooms without rest"
  };
}
```

If the LLM provides a `moodOverride`, it replaces the deterministic mood. If it doesn't (or if the LLM is slow/down), the deterministic mood stands. The game always looks correct.

## Project Structure

```
yrpg-frontend/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Main game page
│   ├── actions.tsx             # Server actions (backend + LLM calls)
│   └── globals.css             # Tailwind styles + theme palettes
├── components/
│   ├── ui/                     # Shadcn/ui base components
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── progress.tsx
│   │   └── badge.tsx
│   ├── game/                   # Game-specific UI components
│   │   ├── DungeonMap.tsx      # Grid map with room statuses
│   │   ├── PartyPanel.tsx      # All character HP bars and status
│   │   ├── CharacterCard.tsx   # Single character stats detail
│   │   ├── CombatGrid.tsx      # 6x6 tactical combat grid
│   │   ├── CombatantCard.tsx   # Combatant info in combat
│   │   ├── MonsterCard.tsx     # Enemy display with threat styling
│   │   ├── ItemCard.tsx        # Item display with rarity styling
│   │   ├── TrapWarning.tsx     # Trap alert with disarm option
│   │   ├── SpellPanel.tsx      # Magic user spell slots and known spells
│   │   ├── InventoryPanel.tsx  # Character inventory with equip actions
│   │   ├── FormationPanel.tsx  # Marching order with drag reorder
│   │   ├── NarrativePanel.tsx  # AI-generated dungeon master text
│   │   ├── CombatLog.tsx       # Recent combat events
│   │   └── Notification.tsx    # Transient alerts (crits, deaths, etc.)
│   └── layout/
│       ├── Sidebar.tsx         # Persistent sidebar (party + map)
│       └── GameContainer.tsx   # Main content area with mood theming
├── lib/
│   ├── mcp-client.ts           # Fetch wrapper for Go backend
│   ├── llm-client.ts           # Client for local Qwen3 inference
│   ├── mood.ts                 # deriveMood() and theme utilities
│   ├── types.ts                # TypeScript types matching API.md
│   └── prompts.ts              # LLM system prompt and formatting
├── .env.local
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Key Files

### 1. `app/actions.tsx` - Server Actions

Orchestrates the two parallel paths: instant UI + streamed narrative.

```tsx
'use server';

import { callMcpTool } from '@/lib/mcp-client';
import { streamNarrative } from '@/lib/llm-client';
import { deriveMood } from '@/lib/mood';

export async function sendMessage(userMessage: string) {
  // 1. Call Go backend (blocking — this is the source of truth)
  const { content, gameState, isError } = await callMcpTool(
    parseToolName(userMessage),
    parseArguments(userMessage)
  );

  if (isError) {
    return { gameState: null, error: content[0].text };
  }

  // 2. Compute deterministic mood (instant)
  const mood = deriveMood(gameState);

  // 3. Start LLM narrative stream (non-blocking, parallel)
  const narrativeStream = streamNarrative(content[0].text, gameState);

  return {
    gameState,
    mood,
    backendText: content[0].text,  // fallback if LLM is slow
    narrativeStream,               // async iterator of tokens
  };
}
```

### 2. `lib/llm-client.ts` - Local LLM Communication

```typescript
const LLM_URL = process.env.LLM_URL || 'http://localhost:8000/v1/chat/completions';

export async function* streamNarrative(
  backendText: string,
  gameState: GameStateSnapshot
): AsyncGenerator<string> {
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3',
      stream: true,
      messages: [
        { role: 'system', content: NARRATOR_SYSTEM_PROMPT },
        { role: 'user', content: formatNarratorInput(backendText, gameState) },
      ],
    }),
  });

  // Stream tokens as they arrive
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Parse SSE chunks and yield content tokens
    for (const token of parseSSETokens(chunk)) {
      yield token;
    }
  }
}
```

### 3. `lib/mood.ts` - Deterministic Mood Engine

```typescript
import type { GameStateSnapshot, Mood } from './types';

export function deriveMood(gs: GameStateSnapshot): Mood {
  // ... (implementation shown in Rendering Layers section above)
}

// Mood-to-CSS mapping for GameContainer theming
export const moodThemes: Record<Mood['atmosphere'], string> = {
  calm:       'bg-stone-50 text-stone-900',
  tense:      'bg-amber-50 text-stone-900 border-amber-200',
  dangerous:  'bg-red-50 text-stone-900 border-red-300',
  desperate:  'bg-red-100 text-red-900 border-red-500',
  mysterious: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  triumphant: 'bg-emerald-50 text-emerald-900 border-emerald-300',
};

export const urgencyAccents: Record<Mood['urgency'], string> = {
  normal:   '',
  elevated: 'ring-1 ring-amber-300',
  critical: 'ring-2 ring-red-500 animate-pulse',
};
```

### 4. `lib/prompts.ts` - LLM System Prompt

```typescript
export const NARRATOR_SYSTEM_PROMPT = `
You are the dungeon master narrator for a party-based RPG. Your job is to write
immersive, atmospheric narrative text based on what just happened in the game.

You will receive:
1. A factual description of what happened (from the game engine)
2. The current game state (structured data)

Your output should be:
- A narrative paragraph (2-4 sentences) that dramatizes the events
- Written in second person ("Your party enters...")
- Matched in tone to the situation (tense in combat, mysterious in new rooms, urgent when wounded)
- NEVER contradict the game state — if the engine says the attack missed, it missed
- NEVER invent game mechanics, items, or characters not in the state

Keep it concise. The UI already shows HP bars, combat grids, and item cards —
your job is atmosphere and storytelling, not repeating numbers.

Optionally, if you feel the mood should differ from what the game data suggests,
end your response with a JSON block:
\`\`\`mood
{"atmosphere": "desperate", "reason": "party has been fighting for many rounds with no rest"}
\`\`\`
Only include this if the deterministic mood would miss something important.
`;

export function formatNarratorInput(backendText: string, gs: GameStateSnapshot): string {
  const partyStatus = gs.party?.characters.map(c =>
    `${c.name} (${c.class}): ${c.hp}/${c.maxHp} HP — ${c.status}`
  ).join('\n') || 'No party';

  return `
GAME EVENT:
${backendText}

CURRENT STATE:
Mode: ${gs.mode}
Turn: ${gs.turnNumber}
${gs.currentRoom ? `Room: ${gs.currentRoom.name} (first visit: ${gs.currentRoom.isFirstVisit})` : ''}
Monsters: ${gs.monsters?.length || 0} (${gs.monsters?.map(m => `${m.name} [${m.threat}]`).join(', ') || 'none'})
Traps: ${gs.roomTraps?.length || 0} discovered
${gs.combat ? `Combat Round: ${gs.combat.roundNumber}` : ''}
Game Over: ${gs.gameOver} Victory: ${gs.victory}

PARTY:
${partyStatus}
`.trim();
}
```

### 5. `app/page.tsx` - Main UI

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { GameContainer } from '@/components/layout/GameContainer';
import { NarrativePanel } from '@/components/game/NarrativePanel';
import { deriveMood, moodThemes } from '@/lib/mood';
import { sendMessage } from './actions';

export default function GamePage() {
  const [gameState, setGameState] = useState(null);
  const [mood, setMood] = useState(deriveMood(null));
  const [narrative, setNarrative] = useState('');
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    const command = input;
    setInput('');

    const result = await sendMessage(command);

    if (result.error) {
      // Show error notification
      return;
    }

    // 1. Instant: update game state and deterministic mood
    setGameState(result.gameState);
    setMood(result.mood);

    // 2. Show backend text as immediate fallback narrative
    setNarrative(result.backendText);

    // 3. Stream AI narrative (replaces fallback as tokens arrive)
    let aiNarrative = '';
    for await (const token of result.narrativeStream) {
      aiNarrative += token;
      setNarrative(aiNarrative);
    }

    // 4. Check for mood override in AI response
    const moodOverride = parseMoodOverride(aiNarrative);
    if (moodOverride) {
      setMood(prev => ({ ...prev, ...moodOverride }));
    }
  };

  return (
    <div className={`flex h-screen ${moodThemes[mood.atmosphere]}`}>
      <Sidebar gameState={gameState} />

      <main className="flex-1 flex flex-col">
        {/* Narrative panel — AI-generated text */}
        <NarrativePanel text={narrative} mood={mood} />

        {/* Deterministic game content */}
        <GameContainer gameState={gameState} mood={mood} />

        {/* Command input */}
        <div className="border-t p-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="What do you want to do?"
            className="w-full px-4 py-2 rounded border"
          />
        </div>
      </main>
    </div>
  );
}
```

### 6. `lib/mcp-client.ts` - Backend Communication

```typescript
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function callMcpTool(name: string, args: Record<string, unknown>) {
  const response = await fetch(`${BACKEND_URL}/mcp/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, arguments: args }),
  });

  if (!response.ok) {
    throw new Error(`MCP call failed: ${response.statusText}`);
  }

  return response.json();
}
```

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  SIDEBAR         │  │  MAIN CONTENT                           │  │
│  │                  │  │                                          │  │
│  │  ┌──────────┐   │  │  ┌──────────────────────────────────┐   │  │
│  │  │ Dungeon  │   │  │  │  NARRATIVE PANEL                 │   │  │
│  │  │   Map    │   │  │  │  "The door creaks open to        │   │  │
│  │  └──────────┘   │  │  │  reveal a vast chamber. Your     │   │  │
│  │                  │  │  │  thief freezes — movement in     │   │  │
│  │  ── Party ──    │  │  │  the shadows ahead..."           │   │  │
│  │  [Fighter    ]  │  │  └──────────────────────────────────┘   │  │
│  │  HP ████░░ 28/30│  │                                          │  │
│  │                  │  │  [Room Header: Dusty Chamber]           │  │
│  │  [Magic User ]  │  │                                          │  │
│  │  HP ████████ 16 │  │  [Combat Grid] or [Room Items/Monsters] │  │
│  │  Slots: ●●○     │  │                                          │  │
│  │                  │  │  [Trap Warnings]                        │  │
│  │  [Thief      ]  │  │                                          │  │
│  │  HP ██████░ 20  │  │  [Combat Log / Notifications]           │  │
│  │  [HIDDEN]       │  │                                          │  │
│  │                  │  │                                          │  │
│  │  ── Formation ─ │  ├──────────────────────────────────────────┤  │
│  │  Fighter > Mage │  │  [Command Input                     ⏎]  │  │
│  │  > Thief        │  │                                          │  │
│  └─────────────────┘  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Components

### NarrativePanel.tsx

The AI-generated dungeon master text. Streams in real-time.

```tsx
// - Displays narrative text with a typing/streaming effect
// - Background tinted by mood.atmosphere
// - Fades in as tokens arrive
// - Shows backend text immediately as fallback, replaced by AI text
// - Scrolls to show latest narrative
```

### CombatGrid.tsx

The 6x6 tactical grid.

```tsx
interface CombatGridProps {
  combat: CombatView;
  party: PartyView;
  mood: Mood;
}

// Grid cells show:
// - Party members: class-colored background with initial [C]
// - Enemies: threat-colored border with initial {G}
// - Blocked: dark/hatched cell
// - Empty: transparent (tinted by mood)
// - Movement range: highlight on reachable cells for current turn character
// - Attack range: indicator (melee = adjacent, ranged = radius)

// Y=0 is the bottom (party spawn). Y=5 is the top (enemy spawn).
```

### PartyPanel.tsx

Always visible in sidebar. Renders deterministically from `gameState.party`.

```tsx
// Per character:
// - Name and class icon
// - HP bar (green > yellow > red by health %)
// - Status badge: "Healthy", "Wounded", "Critical", "Dead"
// - Spell slots (magic_user only): filled/empty circles ●●○
// - Equipment icons (weapon + armor)
// - [HIDDEN] badge in combat
// - Greyed out when dead
// - Urgency ring from mood.urgency when Critical
```

### MonsterCard.tsx

```tsx
// Threat-based styling (deterministic from monster.threat):
// - trivial: gray border, subdued
// - normal: yellow border
// - dangerous: orange border, bold name
// - deadly: red border, pulse animation, skull icon
//
// Shows: name, HP bar, damage, ranged indicator, description
```

### TrapWarning.tsx

```tsx
// Prominent warning banner:
// - Trap description
// - Difficulty (DC) indicator with color (low=yellow, high=red)
// - "Disarm" hint (suggests thief)
```

### SpellPanel.tsx

```tsx
// Magic user spell management:
// - Spell slot indicator: ●●○
// - Known spells with descriptions
// - Combat-only spells greyed out during exploration
```

### ItemCard.tsx

```tsx
// Rarity-based styling (deterministic from item.rarity):
// - common: plain border
// - uncommon: green border
// - rare: blue border, subtle glow
// - legendary: purple border, animated glow
//
// Shows: name, type icon, stats (damage/armor/healing/range)
// Class restriction badges
// [EQUIPPED] indicator
```

## LLM System Prompt

See `lib/prompts.ts` above for the full prompt. Key points:

- The LLM is the dungeon master **narrator**, not the game engine
- It dramatizes events but never contradicts the `gameState`
- It writes in second person, 2-4 sentences
- It can suggest mood overrides but doesn't control component rendering
- The backend `content` text is the ground truth; the LLM expands on it

## Game State Structure

Every MCP tool response includes a `gameState` object. See [API.md](./API.md) for full documentation.

### Key Fields for Deterministic Rendering

```typescript
interface GameStateSnapshot {
  mode: "exploration" | "combat";    // → show combat grid or room view

  party: {
    characters: CharacterView[];     // → PartyPanel, HP bars
    formation: string[];             // → FormationPanel
  };

  currentRoom: {
    name: string;                    // → RoomHeader
    exits: string[];                 // → exit indicators
    isFirstVisit: boolean;           // → discovery styling
    isExit: boolean;                 // → victory indicator
  };

  monsters: MonsterView[];           // → MonsterCards (threat styling)
  roomItems: ItemView[];             // → ItemCards (rarity styling)
  roomTraps: TrapView[];             // → TrapWarnings

  combat: {
    grid: string[][];                // → CombatGrid cells
    combatants: CombatantView[];     // → positions, HP, turn state
    currentTurnIdx: number;          // → "whose turn" indicator
    roundNumber: number;             // → round counter
  };

  mapGrid: MapCell[][];              // → DungeonMap

  gameOver: boolean;                 // → game over screen
  victory: boolean;                  // → victory screen
  turnNumber: number;
  lastEvent: GameEvent | null;       // → event-specific notifications
}
```

### Deterministic Rendering Rules

| Condition | Component | Styling |
|-----------|-----------|---------|
| `mode === "combat"` | CombatGrid | Always show grid + combatants |
| `monsters.length > 0` | MonsterCard per monster | Threat-based border colors |
| `roomItems.length > 0` | ItemCard per item | Rarity-based glow |
| `roomTraps.length > 0` | TrapWarning per trap | DC-based urgency color |
| `party.characters[].status === "Critical"` | Notification | Urgency pulse |
| `combat.currentTurnIdx` points to player | Notification | "X's turn!" prompt |
| `currentRoom.isFirstVisit` | RoomHeader | Discovery badge |
| `gameOver && victory` | Victory overlay | Triumphant theme |
| `gameOver && !victory` | Defeat overlay | Dark theme |

## Environment Variables

```bash
# .env.local
BACKEND_URL=http://localhost:8080     # Go backend
LLM_URL=http://localhost:8000/v1      # Local Qwen3 (OpenAI-compatible API)
```

## Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0"
  }
}
```

Note: No Anthropic SDK or Vercel AI SDK needed — the LLM is accessed via a standard OpenAI-compatible HTTP API.

## Setup Steps

1. **Create Next.js project:**
   ```bash
   npx create-next-app@latest yrpg-frontend --typescript --tailwind --app
   cd yrpg-frontend
   ```

2. **Add shadcn/ui:**
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add card button input progress badge
   ```

3. **Create environment file:**
   ```bash
   echo "BACKEND_URL=http://localhost:8080" > .env.local
   echo "LLM_URL=http://localhost:8000/v1" >> .env.local
   ```

4. **Implement files** in order:
   - `lib/types.ts` (types from API.md)
   - `lib/mood.ts` (deterministic mood engine)
   - `lib/mcp-client.ts` (Go backend client)
   - `lib/llm-client.ts` (Qwen3 streaming client)
   - `lib/prompts.ts` (narrator system prompt)
   - `components/game/*.tsx` (UI components)
   - `components/layout/*.tsx` (sidebar, game container)
   - `app/actions.tsx` (server actions)
   - `app/page.tsx` (main page)

## Backend Requirements (Already Done)

- CORS middleware in `cmd/server/main.go`
- `GameStateSnapshot` types in `internal/game/views.go`
- `gameState` field in `ToolResult` responses
- All 22 handlers return game state

## Design Considerations

1. **Instant feedback.** The deterministic UI renders before the LLM produces any tokens. The player never waits for AI to see their action's result.

2. **Graceful degradation.** If the LLM is slow, down, or produces garbage, the game is fully playable. The backend `content` text serves as fallback narrative. The deterministic mood provides baseline styling.

3. **Sidebar persistence.** Party stats and dungeon map live in React state updated from `gameState` on each response. They don't re-render from the LLM.

4. **Combat grid interactivity.** The grid highlights valid move targets and attack range. The player types commands; the grid provides spatial awareness.

5. **Character targeting.** Many tools require a `character_id`. Clicking a character in the sidebar could copy their ID or pre-fill a command template.

6. **Narrative streaming.** The NarrativePanel shows tokens as they arrive with a typing effect. This gives the feel of a dungeon master speaking while the game state is already visible.

7. **Error handling.** Backend `isError: true` → error notification. Backend unreachable → connection error UI. LLM down → fallback to backend text, no narrative panel.

## Future: Setting/Theme System (Fast Follow)

A planned enhancement to let each game establish its own setting (dark fantasy, sci-fi, eldritch horror, etc.).

**Approach options:**
- **Narration-only:** Backend generates the same mechanical data; the LLM narrator prompt includes the theme and re-skins descriptions ("Goblin" → "Xenomorph Drone"). Zero backend changes.
- **Generation-based:** Add an optional `theme` parameter to `new_game`; the dungeon generator selects from themed monster/item template sets. Richer but requires backend work.

Either way, the theme would be:
1. Selected at game start (player choice or AI-suggested)
2. Stored in game state
3. Included in the LLM narrator system prompt for tonal consistency
4. Applied to component theming via a theme-to-palette mapping

The current architecture supports both approaches cleanly. The deterministic UI renders from the same structured `gameState` regardless of theme — only names, descriptions, and color palettes change.
