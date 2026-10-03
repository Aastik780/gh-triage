#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseArgs, HELP_TEXT } from './args.js';
import { loadConfig } from './config.js';
import { GitHubClient } from './github.js';
import { classifyIssue, labelsFor, TYPE_LABELS, PRIORITY_LABELS } from './triage.js';

function version(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function fmt(issue: { number: number; title: string }, result: { type: string; priority: string; summary: string }): string {
  const prio = result.priority.padEnd(6);
  const type = result.type.padEnd(8);
  return `  #${String(issue.number).padEnd(5)} [${type}] [${prio}] ${issue.title}\n           ${result.summary}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }
  if (args.version) {
    console.log(version());
    return;
  }

  const cfg = loadConfig(args);
  const gh = new GitHubClient(cfg.token);
  const llm = { baseUrl: cfg.llmBaseUrl, apiKey: cfg.llmApiKey, model: cfg.model, format: cfg.llmFormat };

  console.log(
    `gh-triage ${version()} → ${cfg.repo} (state=${cfg.state}, limit=${cfg.limit}, model=${cfg.model}, llm=${cfg.llmFormat})${cfg.dryRun ? ', dry-run' : ''}`,
  );

  const issues = await gh.listIssues(cfg.repo, cfg.state, cfg.limit);
  if (issues.length === 0) {
    console.log('No issues found — nothing to triage.');
    return;
  }
  console.log(`Found ${issues.length} issue(s).\n`);

  // Ensure every label exists once, before touching any issue.
  if (!cfg.dryRun) {
    for (const def of [...Object.values(TYPE_LABELS), ...Object.values(PRIORITY_LABELS)]) {
      await gh.ensureLabel(cfg.repo, def);
    }
  }

  let ok = 0;
  let failed = 0;

  for (const issue of issues) {
    try {
      const result = await classifyIssue(llm, issue);

      if (!cfg.dryRun) {
        await gh.addLabels(cfg.repo, issue.number, labelsFor(result));
        if (cfg.comment) {
          await gh.postComment(
            cfg.repo,
            issue.number,
            `**Triage** — \`${result.type}\` · priority \`${result.priority}\`\n\n${result.summary}\n\n<sub>Posted by [gh-triage](https://github.com/Aastik780/gh-triage)</sub>`,
          );
        }
      }

      console.log(fmt(issue, result));
      ok++;
    } catch (err: any) {
      failed++;
      console.error(`  #${issue.number} FAILED: ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok} triaged${failed ? `, ${failed} failed` : ''}${cfg.dryRun ? ' (dry-run — nothing written)' : ''}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exitCode = 1;
});
