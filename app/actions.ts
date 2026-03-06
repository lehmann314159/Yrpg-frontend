'use server';

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { callMcpTool } from '@/lib/mcp-client';
import { deriveMood } from '@/lib/mood';
import { summarizeForUI } from '@/lib/ui-context';
import { layoutTools } from '@/lib/ui-tools';
import { LAYOUT_SYSTEM_PROMPT, COMMAND_SYSTEM_PROMPT } from '@/lib/ui-prompts';
import { buildImagePrompt } from '@/lib/image-prompt';
import { generateSceneImage } from '@/lib/comfyui-client';
import type { UIComponent, UIGenerationResult } from '@/lib/ui-types';
import type { GameStateSnapshot, Mood, McpResponse } from '@/lib/types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const MODEL_STRUCTURED = process.env.OLLAMA_MODEL_STRUCTURED || 'qwen3:8b';

const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: OLLAMA_BASE_URL,
});

export interface ActionResult {
  gameState: GameStateSnapshot | null;
  mood: Mood;
  backendText: string;
  error?: string;
}

export async function sendCommand(
  toolName: string,
  args: Record<string, unknown>
): Promise<ActionResult> {
  let response: McpResponse;
  console.log('[sendCommand]', toolName, JSON.stringify(args));
  try {
    response = await callMcpTool(toolName, args);
  } catch {
    return {
      gameState: null,
      mood: deriveMood(null),
      backendText: '',
      error: 'Could not connect to the game backend. Is it running on localhost:8080?',
    };
  }

  console.log('[sendCommand] response isError:', response.isError, 'text:', response.content?.[0]?.text);
  if (response.isError) {
    return {
      gameState: null,
      mood: deriveMood(null),
      backendText: response.content?.[0]?.text || 'Unknown error',
      error: response.content?.[0]?.text || 'Unknown error',
    };
  }

  const gameState = response.gameState || null;
  const mood = deriveMood(gameState);
  const backendText = response.content?.[0]?.text || '';

  return { gameState, mood, backendText };
}

// --- AI Command Interpretation (Qwen3) ---

export async function interpretCommand(
  input: string,
  gameState: GameStateSnapshot,
): Promise<{ toolName: string; args: Record<string, unknown> } | null> {
  try {
    const { generateText } = await import('ai');

    // Build a context that includes IDs so the AI can reference them
    const characters = gameState.party?.characters.map((c) => ({
      id: c.id,
      name: c.name,
      class: c.class,
      isAlive: c.isAlive,
      inventory: c.inventory.map((i) => ({ id: i.id, name: i.name, type: i.type })),
    })) ?? [];
    const monsters = (gameState.monsters ?? []).filter((m) => !m.isDefeated).map((m) => ({
      id: m.id, name: m.name,
    }));
    const roomItems = (gameState.roomItems ?? []).map((i) => ({ id: i.id, name: i.name, type: i.type }));
    const traps = (gameState.roomTraps ?? []).filter((t) => !t.isDisarmed).map((t) => ({
      id: t.id, description: t.description,
    }));
    const exits = gameState.currentRoom?.exits ?? [];
    const commandContext = {
      mode: gameState.mode,
      characters, monsters, roomItems, traps, exits,
    };

    const result = await generateText({
      model: ollama.chatModel(MODEL_STRUCTURED),
      system: COMMAND_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Player command: "${input}"\n\nGame context:\n${JSON.stringify(commandContext)}` }],
      maxOutputTokens: 256,
    });

    const text = result.text.trim();
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.toolName || parsed.toolName === null) return null;

    const args: Record<string, unknown> = parsed.args ?? {};

    // Resolve display names to actual IDs for common args
    if (typeof args.character_id === 'string') {
      const match = characters.find((c) => c.name.toLowerCase() === (args.character_id as string).toLowerCase());
      if (match) args.character_id = match.id;
    }
    if (typeof args.target_id === 'string') {
      const allTargets = [...characters, ...monsters];
      const match = allTargets.find((t) => t.name.toLowerCase() === (args.target_id as string).toLowerCase());
      if (match) args.target_id = match.id;
    }
    if (typeof args.item_id === 'string') {
      // Search selected character's inventory, then room items
      const charId = args.character_id as string;
      const char = characters.find((c) => c.id === charId);
      const itemName = (args.item_id as string).toLowerCase();
      const invMatch = char?.inventory.find((i) => i.name.toLowerCase().includes(itemName));
      const roomMatch = roomItems.find((i) => i.name.toLowerCase().includes(itemName));
      if (invMatch) args.item_id = invMatch.id;
      else if (roomMatch) args.item_id = roomMatch.id;
    }
    if (typeof args.trap_id === 'string') {
      const match = traps.find((t) => t.description.toLowerCase().includes((args.trap_id as string).toLowerCase()));
      if (match) args.trap_id = match.id;
    }
    if (typeof args.target_character_id === 'string') {
      const match = characters.find((c) => c.name.toLowerCase() === (args.target_character_id as string).toLowerCase());
      if (match) args.target_character_id = match.id;
    }

    return { toolName: parsed.toolName, args };
  } catch (error) {
    console.error('AI command interpretation failed:', error);
    return null;
  }
}

// --- Layout Generation (Qwen3) ---

async function generateLayout(
  backendText: string,
  gameState: GameStateSnapshot,
  mood: Mood,
): Promise<UIComponent[]> {
  const { generateText } = await import('ai');

  const context = summarizeForUI(gameState, backendText, mood);
  const result = await generateText({
    model: ollama.chatModel(MODEL_STRUCTURED),
    system: LAYOUT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(context) }],
    tools: layoutTools,
    maxOutputTokens: 1024,
  });

  return extractComponents(result);
}

// --- Image Generation (ComfyUI / Stable Diffusion) ---

async function generateImage(
  backendText: string,
  gameState: GameStateSnapshot,
  mood: Mood,
): Promise<{ url: string | null; prompt: string }> {
  const context = summarizeForUI(gameState, backendText, mood);
  const { positive, negative } = buildImagePrompt(context);
  console.log('[generateImage] prompt:', positive);
  const url = await generateSceneImage(positive, negative);
  return { url, prompt: positive };
}

// --- Orchestrator ---

export async function generateUI(
  backendText: string,
  gameState: GameStateSnapshot,
  mood: Mood,
): Promise<UIGenerationResult> {
  try {
    const [layoutResult, imageResult] = await Promise.allSettled([
      generateLayout(backendText, gameState, mood),
      generateImage(backendText, gameState, mood),
    ]);

    const components: UIComponent[] = [];

    // Layout components from Qwen3
    if (layoutResult.status === 'fulfilled') {
      components.push(...layoutResult.value);
    } else {
      console.error('Layout generation failed:', layoutResult.reason);
    }

    // Image from ComfyUI
    let imageUrl: string | null = null;
    let imagePrompt: string | null = null;
    if (imageResult.status === 'fulfilled') {
      imageUrl = imageResult.value.url;
      imagePrompt = imageResult.value.prompt;
    } else {
      console.error('Image generation failed:', imageResult.reason);
    }

    return { components, imageUrl, imagePrompt };
  } catch (error) {
    console.error('Phase 2 UI generation failed:', error);
    return { components: [], error: String(error) };
  }
}

function extractComponents(result: { toolResults: Array<{ output: unknown }> }): UIComponent[] {
  const components: UIComponent[] = [];
  for (const toolResult of result.toolResults) {
    const output = toolResult.output as { component?: UIComponent } | undefined;
    if (output?.component) {
      components.push(output.component);
    }
  }
  return components;
}
