export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (cost?: number) => void;
  onError: (err: Error) => void;
}

export async function streamChat(
  url: string,
  body: object,
  token: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onDone();
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!response.ok) {
    // Surface backend detail (e.g. 402 Credits 余额不足) instead of bare status
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch { /* keep default */ }
    const err = new Error(detail) as Error & { status?: number };
    err.status = response.status;
    callbacks.onError(err);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        // Handle both formats:
        //   SSE:      data: {"chunk": "..."}
        //   NDJSON:   {"chunk": "..."}
        let data = line;
        if (data.startsWith('data: ')) {
          data = data.slice(6);
        }

        if (data === '[DONE]') {
          callbacks.onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          // Check for completion signal
          if (parsed.done) {
            callbacks.onDone(parsed.cost);
            return;
          }
          // Extract chunk text (backend uses "chunk" field)
          const chunk = parsed.chunk || parsed.text || parsed.content || parsed.delta || '';
          if (chunk) callbacks.onChunk(chunk);
        } catch {
          // Not JSON — use raw text
          if (data) callbacks.onChunk(data);
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onDone();
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  callbacks.onDone();
}
