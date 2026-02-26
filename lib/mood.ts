import type { GameStateSnapshot, Mood, MonsterView, PartyView } from './types';

function avgPartyHealth(party: PartyView | null): number {
  if (!party || party.characters.length === 0) return 1;
  const alive = party.characters.filter(c => c.isAlive);
  if (alive.length === 0) return 0;
  const totalPct = alive.reduce((sum, c) => sum + c.hp / c.maxHp, 0);
  return totalPct / alive.length;
}

function maxMonsterThreat(monsters: MonsterView[]): MonsterView['threat'] | null {
  const active = monsters.filter(m => !m.isDefeated);
  if (active.length === 0) return null;
  const order: MonsterView['threat'][] = ['trivial', 'normal', 'dangerous', 'deadly'];
  let max = 0;
  for (const m of active) {
    const idx = order.indexOf(m.threat);
    if (idx > max) max = idx;
  }
  return order[max];
}

export function deriveMood(gs: GameStateSnapshot | null): Mood {
  if (!gs) {
    return { atmosphere: 'mysterious', urgency: 'normal', palette: 'theme-mystery' };
  }

  const partyHealthPct = avgPartyHealth(gs.party);
  const maxThreat = maxMonsterThreat(gs.monsters || []);
  const inCombat = gs.mode === 'combat';
  const isFirstVisit = gs.currentRoom?.isFirstVisit ?? false;

  // Atmosphere
  let atmosphere: Mood['atmosphere'] = 'calm';
  if (gs.gameOver && gs.victory) atmosphere = 'triumphant';
  else if (gs.gameOver && !gs.victory) atmosphere = 'desperate';
  else if (inCombat && partyHealthPct < 0.3) atmosphere = 'desperate';
  else if (maxThreat === 'deadly') atmosphere = 'dangerous';
  else if (inCombat || maxThreat === 'dangerous') atmosphere = 'tense';
  else if (isFirstVisit) atmosphere = 'mysterious';

  // Urgency
  let urgency: Mood['urgency'] = 'normal';
  if (partyHealthPct < 0.3) urgency = 'critical';
  else if (partyHealthPct < 0.6 || maxThreat === 'dangerous') urgency = 'elevated';

  // Palette
  const palettes: Record<Mood['atmosphere'], string> = {
    calm: 'theme-calm',
    tense: 'theme-tense',
    dangerous: 'theme-danger',
    desperate: 'theme-desperate',
    mysterious: 'theme-mystery',
    triumphant: 'theme-victory',
  };

  return { atmosphere, urgency, palette: palettes[atmosphere] };
}

export const moodThemes: Record<Mood['atmosphere'], string> = {
  calm: 'bg-stone-900 text-stone-100',
  tense: 'bg-stone-900 text-stone-100 border-amber-700',
  dangerous: 'bg-stone-950 text-stone-100 border-red-700',
  desperate: 'bg-red-950 text-red-100 border-red-600',
  mysterious: 'bg-indigo-950 text-indigo-100 border-indigo-700',
  triumphant: 'bg-emerald-950 text-emerald-100 border-emerald-600',
};

export const urgencyAccents: Record<Mood['urgency'], string> = {
  normal: '',
  elevated: 'ring-1 ring-amber-500/50',
  critical: 'ring-2 ring-red-500 animate-pulse',
};