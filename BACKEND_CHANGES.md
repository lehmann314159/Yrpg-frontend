# Backend Changes Summary

Recent backend changes that require frontend updates. Grouped by feature.

---

## 1. Spell Slot System & Rest Mechanic

### New Tools
- **`cast_spell`** — Cast a non-combat spell (heal, resurrect) during exploration
- **`combat_cast_spell`** — Cast any known spell during combat
- **`rest`** — Rest in a cleared room to recover HP and spell slots. 30%+ ambush chance.

### GameState Changes
- `CharacterView` now includes:
  - `spellSlots: number` — current available spell slots (0 for non-magic_user)
  - `maxSpellSlots: number` — total spell slot capacity
  - `knownSpells: string[]` — spell IDs the character knows (empty for non-magic_user)

### Available Spells
| ID | Name | Combat Only | Effect |
|----|------|-------------|--------|
| `heal` | Heal | No | 2d6+4 HP to target |
| `resurrect` | Resurrect | No | Revive dead party member at 50% HP |
| `fireball` | Fireball | Yes | 3d6 damage + splash to adjacent enemies |
| `lightning` | Lightning Bolt | Yes | 4d6 single target damage |
| `shield` | Shield | Yes | +4 AC to all party for 3 rounds |
| `sleep` | Sleep | Yes | Target skips 2 turns (damage wakes) |

### Frontend TODO
- [ ] Display spell slots on magic user characters (e.g. filled/empty circles)
- [ ] Show known spells list with combat-only spells greyed out during exploration
- [ ] Add UI for casting spells (target selection for heals/resurrect)
- [ ] Add rest button/command when in a cleared room
- [ ] Handle ambush combat starting from rest (surprise round for monsters)

---

## 2. Per-Character Inventory

### GameState Changes
- `CharacterView` now includes:
  - `inventory: ItemView[]` — items in this character's personal inventory
  - `equippedWeapon: ItemView | null` — currently equipped weapon
  - `equippedArmor: ItemView | null` — currently equipped armor

### Frontend TODO
- [ ] Show per-character inventory in sidebar or character detail view
- [ ] Display equipped weapon/armor on character cards
- [ ] Support equip/unequip actions per character

---

## 3. CombatantView Enhancements

### GameState Changes
`CombatantView` (inside `CombatView.combatants[]`) now includes:
- `movementRange: number` — max cells this combatant can move per turn (Manhattan distance)
- `attackRange: number` — max attack distance (Chebyshev distance)
- `knownSpells?: string[]` — spell IDs for magic users (omitted for others)

### Movement/Attack Range Values
| Source | Movement | Attack |
|--------|----------|--------|
| Fighter | 2 | 1 (melee) or weapon range |
| Magic User | 2 | 1 (melee) or weapon range |
| Thief | 4 | 1 (melee) or weapon range |
| All monsters | 2 | 1 (melee) or monster's range |

### Frontend TODO
- [ ] Use `movementRange` to highlight reachable cells on combat grid during a character's turn
- [ ] Use `attackRange` to highlight targetable enemies
- [ ] Show spell casting option for combatants with `knownSpells`

---

## 4. Thief Scout Ahead & Signal Party

### New Tools
- **`scout_ahead`** (exploration) — Thief physically enters an adjacent room solo for a surprise round
  - Args: `character_id`, `direction` (north/south/east/west)
  - On sneak success: thief enters alone, hidden, with double movement (8 cells). Monsters are frozen.
  - On sneak failure: whole party rushes in, normal combat begins.
- **`signal_party`** (combat) — After surprise round, bring the rest of the party into combat
  - Args: `character_id` (must be the scouting thief)
  - Moves party to scout's room, re-rolls initiative, normal combat resumes.

### Modified Tool
- **`combat_retreat`** — New scout-phase behavior:
  - Not engaged: automatic success, thief returns to previous room, combat ends
  - Engaged: standard retreat roll. Failure auto-signals party to join.

### GameState Changes
`CombatView` now includes:
- `awaitingScoutDecision: boolean` — true when thief must choose `signal_party` or `combat_retreat`
- `isScoutPhase: boolean` — true during thief's surprise round (monsters frozen, double movement)

During scout phase, the thief's `movementRange` in `CombatantView` is doubled to 8.

### New Event Subtypes
| Type | New Subtypes |
|------|-------------|
| `stealth` | `scout_ahead_success`, `scout_ahead_fail` |

### Guard Clauses
During `awaitingScoutDecision`, all combat actions except `signal_party` and `combat_retreat` are rejected with an error message.

### Frontend TODO
- [ ] Add scout_ahead action (thief-only, exploration mode, when adjacent room has enemies)
- [ ] Show scout phase indicator when `isScoutPhase` is true (e.g. "Surprise Round" banner)
- [ ] Show decision prompt when `awaitingScoutDecision` is true (signal_party or retreat)
- [ ] Indicate frozen/inactive monsters during scout phase
- [ ] Highlight thief's doubled movement range (8 cells) on combat grid during scout phase
- [ ] Handle scout-phase retreat results (auto-success, auto-signal on failure)

---

## Updated TypeScript Interfaces

These reflect the current state of all types. See `API.md` for full details.

```typescript
// New fields on CombatView
interface CombatView {
  grid: string[][];
  combatants: CombatantView[];
  currentTurnIdx: number;
  roundNumber: number;
  isActive: boolean;
  awaitingScoutDecision: boolean;  // NEW
  isScoutPhase: boolean;           // NEW
}

// New fields on CombatantView
interface CombatantView {
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
  movementRange: number;           // NEW
  attackRange: number;             // NEW
  knownSpells?: string[];          // NEW (magic users only)
}

// New fields on CharacterView
interface CharacterView {
  id: string;
  name: string;
  class: "fighter" | "magic_user" | "thief";
  hp: number;
  maxHp: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  spellSlots: number;              // NEW
  maxSpellSlots: number;           // NEW
  knownSpells: string[];           // NEW
  isAlive: boolean;
  status: "Healthy" | "Wounded" | "Critical" | "Dead";
  inventory: ItemView[];           // NEW
  equippedWeapon: ItemView | null; // NEW
  equippedArmor: ItemView | null;  // NEW
}
```

---

## Full Tool Count

The backend now has **24 MCP tools** (up from the original 18):

| Category | Tools |
|----------|-------|
| Game Management | `new_game` |
| Exploration | `look`, `move`, `take`, `equip`, `use_item`, `open_chest`, `disarm_trap`, `sneak`, `scout_ahead`, `inventory`, `stats`, `map` |
| Persistence | `save_game`, `load_game` |
| Spells & Rest | `cast_spell`, `rest` |
| Combat | `combat_status`, `combat_move`, `combat_attack`, `combat_use_item`, `combat_defend`, `combat_hide`, `combat_cast_spell`, `combat_retreat`, `signal_party`, `end_turn` |