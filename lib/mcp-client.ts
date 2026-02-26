import type { McpResponse } from './types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function callMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpResponse> {
  const response = await fetch(`${BACKEND_URL}/mcp/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, arguments: args }),
  });

  if (!response.ok) {
    return {
      content: [{ type: 'text', text: `Backend error: ${response.statusText}` }],
      isError: true,
    };
  }

  return response.json();
}