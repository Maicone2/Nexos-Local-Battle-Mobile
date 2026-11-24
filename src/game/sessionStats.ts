export interface LocalSessionRecord {
  p1Wins: number;
  p1Losses: number;
  p2Wins: number;
  p2Losses: number;
  matchesPlayed: number;
  lastUpdatedAt: number | null;
}

export const LOCAL_SESSION_STORAGE_KEY = 'neon_clash_local_session_v1';

export const DEFAULT_LOCAL_SESSION_STATS: LocalSessionRecord = {
  p1Wins: 0,
  p1Losses: 0,
  p2Wins: 0,
  p2Losses: 0,
  matchesPlayed: 0,
  lastUpdatedAt: null,
};

function safeNonNegInt(val: unknown): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0
    ? Math.floor(val)
    : 0;
}

export function normalizeLocalSessionStats(raw: unknown): LocalSessionRecord {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LOCAL_SESSION_STATS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    p1Wins: safeNonNegInt(obj.p1Wins),
    p1Losses: safeNonNegInt(obj.p1Losses),
    p2Wins: safeNonNegInt(obj.p2Wins),
    p2Losses: safeNonNegInt(obj.p2Losses),
    matchesPlayed: safeNonNegInt(obj.matchesPlayed),
    lastUpdatedAt:
      typeof obj.lastUpdatedAt === 'number' && Number.isFinite(obj.lastUpdatedAt)
        ? obj.lastUpdatedAt
        : null,
  };
}

export function loadLocalSessionStats(): LocalSessionRecord {
  try {
    if (typeof sessionStorage === 'undefined') {
      return { ...DEFAULT_LOCAL_SESSION_STATS };
    }
    const raw = sessionStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOCAL_SESSION_STATS };
    return normalizeLocalSessionStats(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LOCAL_SESSION_STATS };
  }
}

export function saveLocalSessionStats(record: LocalSessionRecord): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
}

export function recordLocalMatchResult(
  prev: LocalSessionRecord,
  winnerSlot: 1 | 2,
  now = Date.now()
): LocalSessionRecord {
  return {
    p1Wins: prev.p1Wins + (winnerSlot === 1 ? 1 : 0),
    p1Losses: prev.p1Losses + (winnerSlot === 2 ? 1 : 0),
    p2Wins: prev.p2Wins + (winnerSlot === 2 ? 1 : 0),
    p2Losses: prev.p2Losses + (winnerSlot === 1 ? 1 : 0),
    matchesPlayed: prev.matchesPlayed + 1,
    lastUpdatedAt: now,
  };
}

export function resetLocalSessionStats(): LocalSessionRecord {
  const empty = { ...DEFAULT_LOCAL_SESSION_STATS };
  saveLocalSessionStats(empty);
  return empty;
}
