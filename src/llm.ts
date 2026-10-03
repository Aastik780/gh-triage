import type { LlmFormat } from './args.js';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  format?: LlmFormat;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

async function chatOpenAI(cfg: LlmConfig, system: string, user: string, useResponseFormat: boolean): Promise<string> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (useResponseFormat) body.response_format = { type: 'json_object' };

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM returned an empty response');
  }
  return content;
}

async function chatAnthropic(cfg: LlmConfig, system: string, user: string): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 1024,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }

  const data = (await res.json()) as any;
  const content = Array.isArray(data?.content)
    ? data.content
        .map((block: any) => (block?.type === 'text' && typeof block.text === 'string' ? block.text : ''))
        .join('')
    : '';
  if (!content.trim()) {
    throw new Error('LLM returned an empty response');
  }
  return content;
}

async function chatOnce(cfg: LlmConfig, system: string, user: string, useResponseFormat: boolean): Promise<string> {
  const format = cfg.format ?? 'openai';

  if (format === 'anthropic') return chatAnthropic(cfg, system, user);

  if (format === 'auto') {
    try {
      return await chatOpenAI(cfg, system, user, useResponseFormat);
    } catch (err: any) {
      // No OpenAI dialect here — fall back to the Anthropic messages endpoint.
      if (err?.status === 404) return chatAnthropic(cfg, system, user);
      throw err;
    }
  }

  return chatOpenAI(cfg, system, user, useResponseFormat);
}

export async function chatJSON(cfg: LlmConfig, system: string, user: string): Promise<unknown> {
  let content: string;
  try {
    content = await chatOnce(cfg, system, user, true);
  } catch (err: any) {
    // Some OpenAI-compatible providers reject response_format — retry without it.
    if (err?.status === 400 || err?.status === 422) {
      content = await chatOnce(cfg, system, user, false);
    } else {
      throw err;
    }
  }

  try {
    return JSON.parse(extractJson(content));
  } catch {
    throw new Error(`could not parse LLM JSON: ${content.slice(0, 200)}`);
  }
}
