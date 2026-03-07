'use server';

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { callMcpTool } from '@/lib/mcp-client';
import { deriveMood } from '@/lib/mood';
import { summarizeForUI } from '@/lib/ui-context';
import { layoutTools } from '@/lib/ui-tools';
import { LAYOUT_SYSTEM_PROMPT } from '@/lib/ui-prompts';
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
