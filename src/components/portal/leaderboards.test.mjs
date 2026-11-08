import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Exercise the actual membership calculation so an object accidentally placed
// in the ID list reproduces the dashboard crash, rather than testing a copy.
const source = readFileSync(new URL('./leaderboards.tsx', import.meta.url), 'utf8');
const body = source.split('const friendLeaders = useMemo<Leader[]>(() => {')[1].split('  }, [')[0]
  .replace('(id): id is string =>', '(id) =>');
const selectFriends = new Function('currentProfileQuery', 'realFriendsQuery', 'globalLeaders', body);
const owner = { playFabId: 'abc123', username: 'Kelvin', displayName: 'Kelvin' };
const row = { playFabId: 'ABC123', name: 'Kelvin', score: 96, productions: 3 };

test('loaded owner profile and no friends retain one scored owner without crashing', () => {
  assert.deepEqual(selectFriends({ data: owner }, { data: [] }, [row]), [row]);
});
test('only confirmed friends join the owner and unrelated players are excluded', () => {
  const friend = { playFabId: 'FRIEND', name: 'Friend' };
  const stranger = { playFabId: 'OTHER', name: 'Other' };
  assert.deepEqual(selectFriends({ data: owner }, { data: [{ playFabId: 'friend', status: 'confirmed' }, { playFabId: 'OTHER', status: 'pending' }] }, [row, friend, stranger]), [row, friend]);
});
test('owner without recorded results appears once and loading does not crash', () => {
  assert.equal(selectFriends({ data: owner }, { data: [] }, []).length, 1);
  assert.deepEqual(selectFriends({}, {}, []), []);
});
