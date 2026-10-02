import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs } from '../dist/args.js';

test('defaults', () => {
  const a = parseArgs([]);
  assert.equal(a.repo, null);
  assert.equal(a.limit, 10);
  assert.equal(a.state, 'open');
  assert.equal(a.dryRun, false);
  assert.equal(a.comment, false);
});

test('positional repo + flags', () => {
  const a = parseArgs(['Aastik780/gh-triage', '--limit', '5', '--dry-run', '--comment', '--state', 'all']);
  assert.equal(a.repo, 'Aastik780/gh-triage');
  assert.equal(a.limit, 5);
  assert.equal(a.dryRun, true);
  assert.equal(a.comment, true);
  assert.equal(a.state, 'all');
});

test('rejects invalid repo', () => {
  assert.throws(() => parseArgs(['not-a-repo']), /invalid repo/);
});

test('rejects bad limit', () => {
  assert.throws(() => parseArgs(['--limit', '0']), /between 1 and 100/);
  assert.throws(() => parseArgs(['--limit', 'abc']), /between 1 and 100/);
});

test('rejects unknown flag', () => {
  assert.throws(() => parseArgs(['--nope']), /unknown option/);
});
