'use server';

import { callMcpTool } from '@/lib/mcp-client';
import { deriveMood } from '@/lib/mood';
import type { GameStateSnapshot, Mood, McpResponse } from '@/lib/types';

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