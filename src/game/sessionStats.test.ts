import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LOCAL_SESSION_STATS,
  normalizeLocalSessionStats,
  recordLocalMatchResult,
} from './sessionStats';

test('recordLocalMatchResult accurately increments P1/P2 wins, losses, and total matches', () => {
  let stats = { ...DEFAULT_LOCAL_SESSION_STATS };

  stats = recordLocalMatchResult(stats, 1, 1000);
  assert.equal(stats.p1Wins, 1);
  assert.equal(stats.p1Losses, 0);
  assert.equal(stats.p2Wins, 0);
  assert.equal(stats.p2Losses, 1);
  assert.equal(stats.matchesPlayed, 1);
  assert.equal(stats.lastUpdatedAt, 1000);

  stats = recordLocalMatchResult(stats, 2, 2000);
  stats = recordLocalMatchResult(stats, 2, 3000);
  assert.equal(stats.p1Wins, 1);
  assert.equal(stats.p1Losses, 2);
  assert.equal(stats.p2Wins, 2);
  assert.equal(stats.p2Losses, 1);
  assert.equal(stats.matchesPlayed, 3);
  assert.equal(stats.lastUpdatedAt, 3000);
});

test('normalizeLocalSessionStats sanitizes invalid or corrupted storage payloads', () => {
  assert.deepEqual(normalizeLocalSessionStats(null), DEFAULT_LOCAL_SESSION_STATS);
  assert.deepEqual(
    normalizeLocalSessionStats({
      p1Wins: 4,
      p1Losses: -3,
      p2Wins: 'bad',
      p2Losses: 4.9,
      matchesPlayed: 8,
    }),
    {
      p1Wins: 4,
      p1Losses: 0,
      p2Wins: 0,
      p2Losses: 4,
      matchesPlayed: 8,
      lastUpdatedAt: null,
    }
  );
});
