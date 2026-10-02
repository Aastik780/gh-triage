import { test } from 'node:test';
import assert from 'node:assert/strict';

import { coerceTriage, labelsFor, buildPrompt } from '../dist/triage.js';

test('coerceTriage keeps valid values', () => {
  const r = coerceTriage({ type: 'bug', priority: 'high', summary: 'crashes on start' });
  assert.deepEqual(r, { type: 'bug', priority: 'high', summary: 'crashes on start' });
});

test('coerceTriage falls back on garbage', () => {
  const r = coerceTriage({ type: 'banana', priority: 42 });
  assert.equal(r.type, 'chore');
  assert.equal(r.priority, 'medium');
  assert.equal(r.summary, 'No summary provided.');
});

test('coerceTriage is case-insensitive', () => {
  const r = coerceTriage({ type: ' Feature ', priority: 'LOW', summary: 'add dark mode' });
  assert.equal(r.type, 'feature');
  assert.equal(r.priority, 'low');
});

test('labelsFor maps type + priority', () => {
  const r = coerceTriage({ type: 'docs', priority: 'low', summary: 'typo' });
  assert.deepEqual(labelsFor(r), ['type: docs', 'priority: low']);
});

test('buildPrompt includes title and truncates body', () => {
  const p = buildPrompt({
    number: 7,
    title: 'Bot crashes',
    body: 'x'.repeat(5000),
    state: 'open',
    labels: [],
    comments: 0,
    createdAt: '',
  });
  assert.match(p, /Issue #7: Bot crashes/);
  assert.ok(p.length < 3000);
});
