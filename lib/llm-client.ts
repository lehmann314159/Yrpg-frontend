import type { GameStateSnapshot } from './types';
import { NARRATOR_SYSTEM_PROMPT, formatNarratorInput } from './prompts';

const LLM_URL =
  process.env.LLM_URL || 'http://localhost:8000/v1/chat/completions';

export async function* streamNarrative(
  backendText: string,
  gameState: GameStateSnapshot
): AsyncGenerator<string> {
  let response: Response;
  try {
    response = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3',
        stream: true,
        messages: [
          { role: 'system', content: NARRATOR_SYSTEM_PROMPT },
          {
            role: 'user',
            content: formatNarratorInput(backendText, gameState),
          },
        ],
      }),
    });
  } catch {
    // LLM unavailable — graceful degradation
    return;
  }

  if (!response.ok || !response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });

    // Parse SSE lines
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {
        // Skip malformed chunks
      }
    }
  }
}

export function parseMoodOverride(
  narrative: string
): { atmosphere: string; reason?: string } | null {
  const match = narrative.match(/```mood\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}