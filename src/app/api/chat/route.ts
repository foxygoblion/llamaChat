
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt, history } = await req.json();

    const llamaUrl = process.env.CUSTOM_AI_SERVICE_URL;
    const apiKey = process.env.CUSTOM_AI_API_KEY;

    if (!llamaUrl) {
      throw new Error('CUSTOM_AI_SERVICE_URL is not defined in environment variables');
    }

    // 构建上下文历史。这里假设使用传统的 Text Completion 拼接方式。
    // 如果你的服务是 OpenAI 兼容的 /v1/chat/completions 接口，可能需要调整 Body 格式。
    const fullPrompt = history
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n') + `\nUser: ${prompt}\nAssistant:`;

    const response = await fetch(llamaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from custom AI service: ${response.statusText}`);
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
                  // 针对 llama.cpp 或 OpenAI 格式的流式输出解析
                  const content = data.content || (data.choices && data.choices[0]?.delta?.content);
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch (e) {
                  // 忽略部分数据块的解析错误
                }
              } else if (line.trim() && !line.startsWith(':')) {
                // 处理一些直接返回文本块的服务
                try {
                  // 有些简单的流只返回 JSON 字符串
                  const data = JSON.parse(line);
                  if (data.content) {
                    controller.enqueue(new TextEncoder().encode(data.content));
                  }
                } catch (e) {
                  // 如果不是 JSON，尝试直接作为文本（取决于具体服务实现）
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
