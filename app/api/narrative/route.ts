import { NextRequest, NextResponse } from 'next/server';
import { streamNarrative } from '@/lib/llm-client';
import type { GameStateSnapshot } from '@/lib/types';

export async function POST(request: NextRequest) {
  const { backendText, gameState } = (await request.json()) as {
    backendText: string;
    gameState: GameStateSnapshot;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamNarrative(backendText, gameState)) {
          controller.enqueue(encoder.encode(token));
        }
      } catch {
        // LLM error — end stream gracefully
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}