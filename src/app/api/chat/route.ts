import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt, history } = await req.json();

    const llamaUrl = process.env.CUSTOM_AI_SERVICE_URL;
    const apiKey = process.env.CUSTOM_AI_API_KEY;

    if (!llamaUrl) {
      console.error('Environment variable CUSTOM_AI_SERVICE_URL is missing.');
      return new Response(JSON.stringify({ error: 'CUSTOM_AI_SERVICE_URL is not defined in environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Attempting to fetch from AI service: ${llamaUrl}`);

    // 构建上下文历史
    const fullPrompt = history
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n') + `\nUser: ${prompt}\nAssistant:`;

    let response: Response;
    try {
      response = await fetch(llamaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || ''}`
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1024,
          stream: true,
        }),
      });
    } catch (fetchError: any) {
      console.error('Fetch operation failed:', fetchError);
      return new Response(JSON.stringify({ 
        error: `Fetch failed to reach ${llamaUrl}. Technical reason: ${fetchError.message || 'Unknown network error'}` 
      }), {
        status: 502, // Bad Gateway
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      console.error(`AI service returned ${response.status}: ${errorText}`);
      return new Response(JSON.stringify({ error: `AI service returned error ${response.status}: ${errorText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (!dataStr || dataStr === '[DONE]') continue;
                
                try {
                  const data = JSON.parse(dataStr);
                  const content = data.content || (data.choices && data.choices[0]?.delta?.content);
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch (e) {
                  // Ignore parse errors for individual chunks
                }
              } else if (line.trim() && !line.startsWith(':')) {
                try {
                  const data = JSON.parse(line);
                  if (data.content) {
                    controller.enqueue(new TextEncoder().encode(data.content));
                  }
                } catch (e) {
                  // Handle cases where chunks are just raw text (optional)
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Internal API Route Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
