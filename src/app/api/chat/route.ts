import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt, history } = await req.json();

    const llamaUrl = process.env.CUSTOM_AI_SERVICE_URL;
    const apiKey = process.env.CUSTOM_AI_API_KEY;

    if (!llamaUrl) {
      return new Response(
        JSON.stringify({ error: 'CUSTOM_AI_SERVICE_URL is not defined' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt from history + current turn
    // history = already-completed turns, NOT including the current user message
    const contextLines = (history ?? [])
      .map((msg: { role: string; content: string }) =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      )
      .join('\n');

    const fullPrompt = contextLines
      ? `${contextLines}\nUser: ${prompt}\nAssistant:`
      : `User: ${prompt}\nAssistant:`;

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      response = await fetch(llamaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          temperature: 0.2,
          model: 'qwen3-coder',
          top_p: 0.9,
          max_tokens: 2048,
          stream: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      const message =
        fetchError.name === 'AbortError'
          ? '连接超时（60秒）'
          : fetchError.message || 'Network error';
      return new Response(
        JSON.stringify({ error: `无法连接到 AI 服务: ${message}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: `AI 服务返回错误 ${response.status}: ${errorText}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream response back — emit only the raw text tokens.
    // The client simply appends every chunk it receives.
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        // Buffer for incomplete SSE lines that span multiple network chunks
        let buffer = '';

        const emitToken = (raw: string) => {
          const trimmed = raw.trim();
          if (!trimmed || trimmed === '[DONE]') return;

          // Strip "data: " prefix if present
          const jsonStr = trimmed.startsWith('data:')
            ? trimmed.slice(5).trim()
            : trimmed;

          if (!jsonStr || jsonStr === '[DONE]') return;

          try {
            const data = JSON.parse(jsonStr);
            // llama.cpp native: { content: "..." }
            // OpenAI-compat:    { choices: [{ delta: { content: "..." } }] }
            //                or { choices: [{ text: "..." }] }
            const token: string =
              data.content ??
              data.choices?.[0]?.delta?.content ??
              data.choices?.[0]?.text ??
              '';
            if (token) {
              controller.enqueue(new TextEncoder().encode(token));
            }
          } catch {
            // Not JSON — skip silently (keep-alive pings, etc.)
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split on newlines, keep the last incomplete line in buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              emitToken(line);
            }
          }

          // Flush anything left in buffer
          if (buffer.trim()) emitToken(buffer);
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
