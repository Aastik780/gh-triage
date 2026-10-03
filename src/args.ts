export type LlmFormat = 'openai' | 'anthropic' | 'auto';

export interface Args {
  repo: string | null;
  limit: number;
  state: 'open' | 'closed' | 'all';
  dryRun: boolean;
  comment: boolean;
  model: string | null;
  baseUrl: string | null;
  llmFormat: LlmFormat | null;
  help: boolean;
  version: boolean;
}

export const HELP_TEXT = `gh-triage — AI-powered GitHub issue triage

Usage:
  gh-triage [owner/repo] [options]

Options:
  --limit <n>       Max issues to triage per run (default: 10)
  --state <s>       open | closed | all (default: open)
  --dry-run         Classify and print, but change nothing on GitHub
  --comment         Also post the AI summary as an issue comment
  --model <name>    LLM model id (default: $LLM_MODEL or gpt-4o-mini)
  --base-url <url>  OpenAI-compatible API base URL (default: $LLM_BASE_URL or https://api.openai.com/v1)
  --llm-format <f>  LLM dialect: openai | anthropic | auto (default: $LLM_FORMAT or openai)
  -h, --help        Show this help
  -v, --version     Show version

Environment:
  GITHUB_TOKEN      Required. Token with repo scope (or Issues: write).
  GITHUB_REPOSITORY Used as the repo when no positional arg is given (CI friendly).
  LLM_API_KEY       Required. API key for the LLM endpoint.
  LLM_BASE_URL      Optional. Defaults to https://api.openai.com/v1
  LLM_MODEL         Optional. Defaults to gpt-4o-mini
  LLM_FORMAT        Optional. openai | anthropic | auto (anthropic posts to {base}/messages)

Examples:
  gh-triage Aastik780/Discord-music-bot --dry-run
  gh-triage --limit 5 --comment
`;

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    repo: null,
    limit: 10,
    state: 'open',
    dryRun: false,
    comment: false,
    model: null,
    baseUrl: null,
    llmFormat: null,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '-h' || a === '--help') {
      args.help = true;
    } else if (a === '-v' || a === '--version') {
      args.version = true;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--comment') {
      args.comment = true;
    } else if (a === '--limit') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isInteger(n) || n < 1 || n > 100) {
        throw new Error('--limit expects an integer between 1 and 100');
      }
      args.limit = n;
    } else if (a === '--state') {
      const v = argv[++i];
      if (v !== 'open' && v !== 'closed' && v !== 'all') {
        throw new Error('--state expects one of: open, closed, all');
      }
      args.state = v;
    } else if (a === '--model') {
      const v = argv[++i];
      if (!v) throw new Error('--model expects a value');
      args.model = v;
    } else if (a === '--base-url') {
      const v = argv[++i];
      if (!v) throw new Error('--base-url expects a value');
      args.baseUrl = v;
    } else if (a === '--llm-format') {
      const v = argv[++i];
      if (v !== 'openai' && v !== 'anthropic' && v !== 'auto') {
        throw new Error('--llm-format expects one of: openai, anthropic, auto');
      }
      args.llmFormat = v;
    } else if (a.startsWith('-')) {
      throw new Error(`unknown option: ${a}`);
    } else if (!args.repo) {
      if (!/^[^/\s]+\/[^/\s]+$/.test(a)) {
        throw new Error(`invalid repo "${a}" — expected owner/name`);
      }
      args.repo = a;
    } else {
      throw new Error(`unexpected argument: ${a}`);
    }
  }

  return args;
}
