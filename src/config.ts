import type { Args, LlmFormat } from './args.js';

export interface Config {
  repo: string;
  token: string;
  llmBaseUrl: string;
  llmApiKey: string;
  model: string;
  llmFormat: LlmFormat;
  limit: number;
  state: 'open' | 'closed' | 'all';
  dryRun: boolean;
  comment: boolean;
}

export function loadConfig(args: Args): Config {
  const repo = args.repo ?? process.env.GITHUB_REPOSITORY ?? null;
  if (!repo) {
    throw new Error('no repo given — pass owner/repo or set GITHUB_REPOSITORY');
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error('GITHUB_TOKEN is not set');
  }

  const llmApiKey = process.env.LLM_API_KEY?.trim();
  if (!llmApiKey) {
    throw new Error('LLM_API_KEY is not set');
  }

  const llmFormatRaw = (args.llmFormat ?? process.env.LLM_FORMAT ?? 'openai').toLowerCase().trim();
  if (llmFormatRaw !== 'openai' && llmFormatRaw !== 'anthropic' && llmFormatRaw !== 'auto') {
    throw new Error(`invalid LLM format "${llmFormatRaw}" — expected openai, anthropic or auto`);
  }

  return {
    repo,
    token,
    llmBaseUrl: (args.baseUrl ?? process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
    llmApiKey,
    model: args.model ?? process.env.LLM_MODEL ?? 'gpt-4o-mini',
    llmFormat: llmFormatRaw,
    limit: args.limit,
    state: args.state,
    dryRun: args.dryRun,
    comment: args.comment,
  };
}
