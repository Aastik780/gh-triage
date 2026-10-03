<div align="center">

# gh-triage

**AI-powered GitHub issue triage from your terminal.**

Auto-labels, prioritizes and summarizes issues — with any OpenAI-compatible LLM.

[![CI](https://github.com/Aastik780/gh-triage/actions/workflows/ci.yml/badge.svg)](https://github.com/Aastik780/gh-triage/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/Aastik780/gh-triage)](LICENSE)
[![Node](https://img.shields.io/node/v/gh-triage)](https://nodejs.org)

</div>

---

## Why

Issue triage is the boring part of maintaining a repo: label it, pick a priority, write a short summary — for every single issue. `gh-triage` does that in one command, so you review the result instead of doing the busywork.

```
$ gh-triage Aastik780/Discord-music-bot --dry-run

gh-triage 0.1.0 → Aastik780/Discord-music-bot (state=open, limit=10, model=gpt-4o-mini), dry-run
Found 3 issue(s).

  #12    [bug    ] [high  ] Music stops after first track
           Stream ends early before natural track end; queue advances prematurely.
  #13    [feature] [medium] Add support for Spotify playlists
           User wants Spotify playlist URLs to expand into the queue.
  #14    [docs   ] [low   ] README install steps are outdated
           Windows launcher instructions reference an old start script.

Done: 3 triaged (dry-run — nothing written).
```

## Install

```bash
git clone https://github.com/Aastik780/gh-triage.git
cd gh-triage
npm install
npm run build
npm link          # makes the `gh-triage` command available globally
```

Or run without installing: `node dist/cli.js --help`

## Setup

```bash
export GITHUB_TOKEN=ghp_xxx        # repo scope (read issues, write labels/comments)
export LLM_API_KEY=sk-xxx          # any OpenAI-compatible key
# optional:
export LLM_BASE_URL=http://127.0.0.1:31415/v1   # point at any OpenAI-compatible router
export LLM_MODEL=gpt-4o-mini
export LLM_FORMAT=anthropic                      # openai | anthropic | auto
```

Works with OpenAI, OpenRouter, Ollama, LM Studio, vLLM, or any endpoint that speaks `POST /chat/completions`. Anthropic-style endpoints (`POST /v1/messages`) are supported via `--llm-format anthropic` — or `auto` to fall back when the OpenAI dialect404s.

## Usage

```bash
gh-triage owner/repo                    # triage 10 open issues
gh-triage owner/repo --dry-run          # preview only, nothing written
gh-triage owner/repo --limit 25         # more issues per run
gh-triage owner/repo --comment          # also post the summary as a comment
gh-triage owner/repo --state all        # open | closed | all
gh-triage owner/repo --model gpt-4o     # override model
gh-triage owner/repo --llm-format auto  # openai | anthropic | auto
```

No `owner/repo` argument? It falls back to `$GITHUB_REPOSITORY` — perfect inside GitHub Actions.

## What it does

| Step | Detail |
| --- | --- |
| 1. Fetch | Latest open issues (PRs skipped), `--limit` capped |
| 2. Classify | LLM returns `{type, priority, summary}` as strict JSON |
| 3. Label | Creates labels if missing, then applies `type: *` + `priority: *` |
| 4. Summarize | Printed to your terminal — posted as a comment with `--comment` |

**Labels it manages**

- Types: `type: bug` · `type: feature` · `type: question` · `type: docs` · `type: chore`
- Priority: `priority: high` · `priority: medium` · `priority: low`

Existing labels are never removed — the AI only adds to them.

## Run it on a schedule

`.github/workflows/triage.yml`:

```yaml
name: Auto-triage
on:
  schedule:
    - cron: "0 */6 * * *"
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci && npm run build
      - run: node dist/cli.js --limit 20
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_BASE_URL: ${{ secrets.LLM_BASE_URL }}
          LLM_MODEL: gpt-4o-mini
```

## Development

```bash
npm run check   # typecheck
npm run build   # compile to dist/
npm test        # build + node:test unit tests
```

## Notes

- The LLM sees issue titles + bodies (first 2000 chars). Don't triage repos with secrets in issues.
- One failed issue doesn't stop the run — failures are reported and exit code is `1`.
- Rate limits: issues are processed sequentially; keep `--limit` sane.

## License

[MIT](LICENSE) © Aastik Gupta
