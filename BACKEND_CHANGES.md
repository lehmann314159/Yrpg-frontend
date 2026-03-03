# Backend Changes Summary

Recent backend changes that require frontend updates.

---

## Fighter Abilities — Charge, Cleave, Protect

Fighters now have three unique combat abilities: aggressive opener (charge), crowd control (cleave), and party defender (protect).

### New Tools
- **`combat_charge`** — Fighter rushes toward an enemy with double movement range (4 cells) and attacks with +2 bonus damage. Requires a fresh turn (no prior move or action). Combines move + attack into one action.
  - Args: `character_id`, `target_id`
  - Fighter-only. Returns error if target is out of double movement range.
- **`combat_protect`** — Fighter guards an adjacent ally. Monster attacks targeting that ally are redirected to the fighter for 1 round.
  - Args: `character_id` (fighter), `target_id` (ally to protect)
  - Fighter-only. Must be adjacent to ally. Consumes action.

### Passive Ability: Cleave
When a fighter kills an enemy with a **melee** attack (via `combat_attack` or `combat_charge`), they automatically get one free attack on an adjacent enemy near the killed target's position. No chain-cleaving — only one cleave per kill.

### GameState Changes
`CombatantView` now includes:
- `protectedBy: string` — ID of the fighter protecting this combatant (empty string if not protected). Cleared at the start of each new round.

### Attack Result Changes
When a monster attacks a protected target, the damage is redirected to the protector. The text output will be prefixed with "{Fighter} intercepts!" so the frontend can display the redirect.

### Protection Mechanics
- Protection lasts **1 round** (cleared when a new round starts in `AdvanceTurn`)
- Protector must still be **alive** and **adjacent** to the ally when the attack happens for redirect to trigger
- If protector dies from a redirected attack, subsequent attacks on the protected ally are no longer redirected

### Updated TypeScript Interface

```typescript
// Updated CombatantView
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
  movementRange: number;
  attackRange: number;
  knownSpells?: string[];
  protectedBy?: string;            // NEW — fighter ID protecting this combatant
}
```

### Frontend TODO
- [ ] Add charge button/action for fighter characters during combat (enabled when `!hasMoved && !hasActed`)
- [ ] Show charge range indicator on grid (double movement range = 4 cells from fighter)
- [ ] Add protect button/action for fighter characters (enabled when `!hasActed`, target must be adjacent ally)
- [ ] Display protection status on combatant cards (e.g. shield icon when `protectedBy` is set)
- [ ] Draw a visual link between protector and protected ally on the combat grid
- [ ] Show "Cleave!" in combat log when fighter gets a bonus attack after a kill
- [ ] Show "{Fighter} intercepts!" in combat log when a protected ally's damage is redirected
