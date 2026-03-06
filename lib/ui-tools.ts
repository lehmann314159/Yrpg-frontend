import { tool } from 'ai';
import { z } from 'zod';
import type { UIComponent, LayoutStyle, NarrativeMood, ComponentVariant } from './ui-types';

const layoutStyleSchema = z.enum(['standard', 'combat_focus', 'cinematic', 'dense']);
const variantSchema = z.enum(['standard', 'dramatic', 'compact', 'atmospheric', 'minimal']).optional();
const moodSchema = z.enum(['neutral', 'tense', 'triumphant', 'mysterious', 'dangerous', 'desperate']).optional();

export const uiTools = {
  ui_set_layout: tool({
    description: 'Set the main layout style. Must be called exactly once, before other tools.',
    inputSchema: z.object({
      style: layoutStyleSchema.describe('Layout style: standard (default), combat_focus (expanded grid), cinematic (large text, centered), dense (compact spacing)'),
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: { type: 'layout', style: input.style as LayoutStyle },
    }),
  }),

  ui_render_narrative: tool({
    description: 'Write a 2-4 sentence narrative in second person. Must be called exactly once.',
    inputSchema: z.object({
      text: z.string().describe('Narrative text (2-4 sentences, second person, atmospheric)'),
      mood: moodSchema.describe('Override mood if different from game state'),
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: { type: 'narrative', text: input.text, mood: (input.mood ?? 'neutral') as NarrativeMood },
    }),
  }),

  ui_render_notification: tool({
    description: 'Show an event banner (combat start, death, loot found, trap triggered, etc.)',
    inputSchema: z.object({
      type: z.string().describe('Notification type: combat_start, death, loot, trap, level_up, game_over, victory'),
      title: z.string().describe('Short title (2-5 words)'),
      message: z.string().describe('Brief message (1 sentence)'),
      urgency: z.enum(['info', 'warning', 'danger', 'success']).optional(),
      variant: variantSchema,
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: {
        type: 'notification',
        notificationType: input.type,
        title: input.title,
        message: input.message,
        urgency: input.urgency,
        variant: input.variant as ComponentVariant | undefined,
      },
    }),
  }),

  ui_render_combat_summary: tool({
    description: 'Show tactical info above the combat grid with round number, turn, and optional hint.',
    inputSchema: z.object({
      roundNumber: z.number().describe('Current combat round'),
      currentTurn: z.string().describe('Name of the character/monster whose turn it is'),
      phase: z.string().describe('Combat phase: initiative, action, scout, resolution'),
      tacticalHint: z.string().optional().describe('Brief tactical observation (1 sentence)'),
      variant: variantSchema,
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: {
        type: 'combat_summary',
        roundNumber: input.roundNumber,
        currentTurn: input.currentTurn,
        phase: input.phase,
        tacticalHint: input.tacticalHint,
        variant: input.variant as ComponentVariant | undefined,
      },
    }),
  }),

  ui_render_monster_emphasis: tool({
    description: 'Set visual emphasis for the monster section.',
    inputSchema: z.object({
      emphasis: z.enum(['normal', 'threatening', 'trivial']).describe('How threatening monsters appear'),
      variant: variantSchema,
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: {
        type: 'monster_emphasis',
        emphasis: input.emphasis as 'normal' | 'threatening' | 'trivial',
        variant: input.variant as ComponentVariant | undefined,
      },
    }),
  }),

  ui_render_loot_highlight: tool({
    description: 'Highlight newly found items with emphasis styling.',
    inputSchema: z.object({
      items: z.array(z.object({
        name: z.string(),
        rarity: z.string(),
        type: z.string(),
      })).describe('Items to highlight'),
      source: z.string().describe('Where items came from (chest, monster drop, room)'),
      variant: variantSchema,
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: {
        type: 'loot_highlight',
        items: input.items,
        source: input.source,
        variant: input.variant as ComponentVariant | undefined,
      },
    }),
  }),

  ui_render_party_callout: tool({
    description: 'Show inline party status summary (useful after rest, heal, or significant party change).',
    inputSchema: z.object({
      characters: z.array(z.object({
        name: z.string(),
        className: z.string(),
        hpPct: z.number(),
        status: z.string(),
      })).describe('Party member summaries'),
      highlight: z.string().optional().describe('Character name to highlight (e.g. the one who was healed)'),
      variant: variantSchema,
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: {
        type: 'party_callout',
        characters: input.characters,
        highlight: input.highlight,
        variant: input.variant as ComponentVariant | undefined,
      },
    }),
  }),

  ui_render_combat_result: tool({
    description: 'Show a combat action result banner with actor, target, and outcome.',
    inputSchema: z.object({
      actor: z.string().describe('Who performed the action'),
      target: z.string().describe('Who was targeted'),
      action: z.string().describe('What was done (attack, cast spell, charge, etc.)'),
      result: z.string().describe('Outcome: hit, miss, critical, kill, blocked'),
      damage: z.number().optional().describe('Damage dealt if applicable'),
      wasCritical: z.boolean().optional(),
      description: z.string().describe('Flavorful 1-sentence description of the action'),
      variant: variantSchema,
    }),
    execute: async (input): Promise<{ component: UIComponent }> => ({
      component: {
        type: 'combat_result',
        actor: input.actor,
        target: input.target,
        action: input.action,
        result: input.result,
        damage: input.damage,
        wasCritical: input.wasCritical,
        description: input.description,
        variant: input.variant as ComponentVariant | undefined,
      },
    }),
  }),

  ui_complete: tool({
    description: 'Signal that UI generation is complete. Must be called last.',
    inputSchema: z.object({}),
    execute: async (): Promise<{ component: UIComponent }> => ({
      component: { type: 'complete' },
    }),
  }),
};

export const layoutTools = Object.fromEntries(
  Object.entries(uiTools).filter(([key]) =>
    key !== 'ui_render_narrative' && key !== 'ui_complete'
  )
) as typeof uiTools;
