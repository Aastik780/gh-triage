import { chatJSON, type LlmConfig } from './llm.js';
import type { GhIssue, GhLabel } from './github.js';

export const ISSUE_TYPES = ['bug', 'feature', 'question', 'docs', 'chore'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface LabelDef extends GhLabel {}

export const TYPE_LABELS: Record<IssueType, LabelDef> = {
  bug: { name: 'type: bug', color: 'd73a4a', description: 'Something is not working' },
  feature: { name: 'type: feature', color: '0075ca', description: 'New feature or request' },
  question: { name: 'type: question', color: 'd876e3', description: 'Further information is requested' },
  docs: { name: 'type: docs', color: '1d76db', description: 'Documentation improvements' },
  chore: { name: 'type: chore', color: 'fbca04', description: 'Maintenance / housekeeping' },
};

export const PRIORITY_LABELS: Record<Priority, LabelDef> = {
  high: { name: 'priority: high', color: 'b60205', description: 'Needs attention soon' },
  medium: { name: 'priority: medium', color: 'e99695', description: 'Normal priority' },
  low: { name: 'priority: low', color: '0e8a16', description: 'Can wait' },
};

export interface TriageResult {
  type: IssueType;
  priority: Priority;
  summary: string;
}

const SYSTEM_PROMPT = `You are a senior maintainer triaging GitHub issues.
Classify the issue and respond ONLY with a JSON object of this shape:
{"type":"bug|feature|question|docs|chore","priority":"high|medium|low","summary":"one short sentence (<120 chars) describing the issue"}

Rules:
- type "bug": broken behaviour, crashes, errors, regressions.
- type "feature": new capability or enhancement request.
- type "question": user asking how something works, no defect implied.
- type "chore": build, CI, dependencies, refactors.
- priority "high": crash/data loss/security, or blocks release.
- priority "low": typos, cosmetic, nice-to-haves.
- summary must be factual and specific, no filler like "the user reports".`;

export function coerceTriage(raw: unknown): TriageResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const typeRaw = String(obj.type ?? '').toLowerCase().trim();
  const prioRaw = String(obj.priority ?? '').toLowerCase().trim();

  const type = (ISSUE_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as IssueType)
    : 'chore';
  const priority = (PRIORITIES as readonly string[]).includes(prioRaw)
    ? (prioRaw as Priority)
    : 'medium';

  const summary = String(obj.summary ?? '').trim().slice(0, 200) || 'No summary provided.';
  return { type, priority, summary };
}

export function buildPrompt(issue: GhIssue): string {
  const body = (issue.body ?? '').slice(0, 2000);
  return [
    `Issue #${issue.number}: ${issue.title}`,
    `Existing labels: ${issue.labels.length ? issue.labels.join(', ') : '(none)'}`,
    '',
    'Body:',
    body || '(no description)',
  ].join('\n');
}

export async function classifyIssue(llm: LlmConfig, issue: GhIssue): Promise<TriageResult> {
  const raw = await chatJSON(llm, SYSTEM_PROMPT, buildPrompt(issue));
  return coerceTriage(raw);
}

export function labelsFor(result: TriageResult): string[] {
  return [TYPE_LABELS[result.type].name, PRIORITY_LABELS[result.priority].name];
}
