import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultTournamentParticipants,
  createTournamentBracket,
  getCurrentTournamentMatch,
  getTournamentRoundLabel,
  recordTournamentMatchWinner,
  resizeTournamentParticipants,
  shuffleTournamentParticipants,
} from './tournament';

test('4-player tournament progresses through Semifinals and Final to crown champion', () => {
  const participants = createDefaultTournamentParticipants(4);
  assert.equal(participants.length, 4);

  let bracket = createTournamentBracket(participants, 'orbital_arena');
  assert.equal(bracket.rounds.length, 2);
  assert.equal(bracket.rounds[0].length, 2);
  assert.equal(bracket.rounds[1].length, 1);
  assert.equal(getTournamentRoundLabel(4, 0), 'MEIAS-FINAIS');
  assert.equal(getTournamentRoundLabel(4, 1), 'GRANDE FINAL');

  const sf1 = getCurrentTournamentMatch(bracket);
  assert.ok(sf1 && sf1.p1 && sf1.p2);
  assert.equal(sf1.p1.id, 't-p1');
  assert.equal(sf1.p2.id, 't-p2');

  // P1 wins SF1 2-0
  bracket = recordTournamentMatchWinner(bracket, 1, 2, 0);
  assert.equal(bracket.rounds[0][0].winnerId, 't-p1');
  assert.equal(bracket.rounds[1][0].p1?.id, 't-p1');
  assert.equal(bracket.currentRoundIndex, 0);
  assert.equal(bracket.currentMatchIndex, 1);

  // P4 wins SF2 2-1
  const sf2 = getCurrentTournamentMatch(bracket);
  assert.equal(sf2?.p1?.id, 't-p3');
  assert.equal(sf2?.p2?.id, 't-p4');
  bracket = recordTournamentMatchWinner(bracket, 2, 1, 2);
  assert.equal(bracket.rounds[1][0].p2?.id, 't-p4');
  assert.equal(bracket.currentRoundIndex, 1);
  assert.equal(bracket.currentMatchIndex, 0);

  // Final: t-p4 beats t-p1
  const finalMatch = getCurrentTournamentMatch(bracket);
  assert.equal(finalMatch?.p1?.id, 't-p1');
  assert.equal(finalMatch?.p2?.id, 't-p4');
  bracket = recordTournamentMatchWinner(bracket, 2, 0, 2);
  assert.equal(bracket.champion?.id, 't-p4');
  assert.equal(getCurrentTournamentMatch(bracket), null);
});

test('8-player tournament progresses across 3 rounds (7 matches) and preserves custom names', () => {
  const base = createDefaultTournamentParticipants(4);
  const eight = resizeTournamentParticipants(base, 8);
  eight[0].name = 'Ana';
  eight[7].name = 'Zeca';
  eight[7].isCpu = true;

  let bracket = createTournamentBracket(eight, 'cyber_temple');
  assert.equal(bracket.rounds.length, 3);
  assert.equal(bracket.rounds[0].length, 4);
  assert.equal(bracket.rounds[1].length, 2);
  assert.equal(bracket.rounds[2].length, 1);
  assert.equal(getTournamentRoundLabel(8, 0), 'QUARTOS DE FINAL');
  assert.equal(getTournamentRoundLabel(8, 1), 'MEIAS-FINAIS');
  assert.equal(getTournamentRoundLabel(8, 2), 'GRANDE FINAL');

  // Play all 7 matches: winner slot alternates
  const winners: (1 | 2)[] = [1, 2, 1, 2, 1, 2, 2];
  for (const w of winners) {
    assert.ok(getCurrentTournamentMatch(bracket));
    bracket = recordTournamentMatchWinner(bracket, w, w === 1 ? 2 : 0, w === 2 ? 2 : 1);
  }
  assert.ok(bracket.champion);
  assert.equal(bracket.champion.name, 'Zeca');
  assert.equal(bracket.champion.isCpu, true);
});

test('shuffleTournamentParticipants keeps all participants and re-assigns sequential seeds', () => {
  const initial = createDefaultTournamentParticipants(8);
  const shuffled = shuffleTournamentParticipants(initial, () => 0.25);
  assert.equal(shuffled.length, 8);
  assert.deepEqual(
    shuffled.map((p) => p.seed),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  const ids = new Set(shuffled.map((p) => p.id));
  assert.equal(ids.size, 8);
});
