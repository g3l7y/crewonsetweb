import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductionLogs, mapDataToProductionLogs, mapUserDataToProductionLogs } from './productions.ts';
import { mapDataToAchievements, mapUserDataToAchievements } from './achievements.ts';
import { mapGameCareerSaves } from './game-careers.ts';

const value = (key: string, data: string | number) => typeof data === 'string'
  ? { key, kind: 2, text: data } : { key, kind: 0, integer: data };
const career = (values: unknown[], id = 'save-one') => ({ [`CrewCareer_v1_${id}`]: JSON.stringify({ id, name: 'Game 1', values }) });
const attempt = { closed: true, submissionId: 'take-one', level: 1, pre: 90, camera: 60, lighting: 25, post: 85, score: 86.67, grade: 'A', playedUtc: '2026-10-06T01:00:00Z', takes: 2,
  opening: 2000, closing: 1500, partial: false, assisted: false,
  transactions: [{ item: 'SD card', category: 'Consumables', amount: -500 }], completionFeedback: 'Game feedback', nextStep: 'Game next step' };
const history = JSON.stringify({ results: [attempt], active: attempt });

test('reads existing chunked career history, preserves scores and ledger, and does not duplicate active', () => {
  const data = career([value('Analytics.Career.v1.Count', 2), value('Analytics.Career.v1.0', history.slice(0, 43)), value('Analytics.Career.v1.1', history.slice(43))]);
  const logs = mapUserDataToProductionLogs({ ...data, production_logs: '{"logs":[]}' });
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.level, 1);
  assert.equal(logs[0]?.productionScore, 85);
  assert.equal(logs[0]?.budgetUsed, 500);
  assert.equal(logs[0]?.budgetRemaining, 1500);
  assert.equal(logs[0]?.feedback, 'Game feedback');
  assert.equal(logs[0]?.nextStep, 'Game next step');
  assert.equal(logs[0]?.details?.['takes'], 2);
  assert.equal(logs[0]?.title, '');
});

test('prefers uploaded detail for the same submission without duplicate rows', () => {
  const data = career([value('Analytics.Career.v1', history)]);
  const logs = mapUserDataToProductionLogs({ ...data, production_logs: JSON.stringify({ logs: [{ id: 'take-one:player', submission_id: 'take-one', level: 1, production: 'Actual contract', overall_score: 88, pre_production_feedback: 'Actual phase feedback' }] }) });
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.title, 'Actual contract');
  assert.equal(logs[0]?.score, 88);
  assert.equal(logs[0]?.preProductionFeedback, 'Actual phase feedback');
  assert.equal(logs[0]?.details?.['takes'], 2);
});

test('supports native nested ProductionLogRecord and respects its explicit failed decision', () => {
  const data = career([value('Analytics.Career.v1', JSON.stringify({ results: [{ ...attempt, productionLog: {
    id: 'take-one:player', submissionId: 'take-one', production: 'Saved contract', client: 'Saved client', score: 80,
    preProductionScore: 80, productionScore: 80, postProductionScore: 80, preProductionFeedback: 'Setup from game', decision: 'failed', decisionFeedback: 'Mandatory condition missing',
  } }] }))]);
  const log = mapUserDataToProductionLogs(data)[0];
  assert.equal(log?.title, 'Saved contract');
  assert.equal(log?.clientDecision, 'failed');
  assert.equal(log?.preProductionFeedback, 'Setup from game');
  assert.equal(log?.feedback, 'Mandatory condition missing');
});

test('does not resurrect deleted saves or turn active attempts and level access into completed productions', () => {
  const deleted = career([value('SaveDeleted', 1), value('Analytics.Career.v1', history)]);
  assert.equal(mapGameCareerSaves(deleted).length, 0);
  assert.deepEqual(mapUserDataToProductionLogs(deleted), []);
  assert.deepEqual(mapUserDataToProductionLogs(career([value('CurrentLevel', 2), value('Analytics.Career.v1', JSON.stringify({ results: [], active: { ...attempt, closed: false } }))])), []);
});

test('missing chunks and malformed logs are errors, not an empty-success response', () => {
  assert.throws(() => mapUserDataToProductionLogs(career([value('Analytics.Career.v1.Count', 2), value('Analytics.Career.v1.0', '{}')])), /chunk/);
  assert.throws(() => mapDataToProductionLogs({ unexpected: [] }), /unreadable/);
});

test('does not manufacture scores, levels, rank or date for missing production metadata', () => {
  const log = mapDataToProductionLogs([{ id: 'metadata-missing' }])[0];
  assert.equal(log?.score, undefined);
  assert.equal(log?.level, 0);
  assert.equal(log?.date, '');
  assert.equal(log?.title, '');
});

test('retains the actual level-unlocked record without turning it into a first-contract award', () => {
  const result = mapDataToAchievements({ achievements: [{ id: 'game_level_1', title: 'Level 1 Unlocked', description: 'Unlocked campaign level 1 in Crew On Set!', unlocked: true, unlockedAt: 'invalid' }] });
  assert.equal(result[0]?.title, 'Level 1 Unlocked');
  assert.equal(result[0]?.description, 'Unlocked campaign level 1 in Crew On Set!');
  assert.equal(result[0]?.unlockedAt, null);
});

test('reads the game career achievements, preserves per-career progress and never invents dates', () => {
  const data = career([value('Profile.Career.v1', JSON.stringify({ version: 1, recordings: 4, completedMask: 1 })), value('AchivDone_career_top_rank', 1)]);
  const achievements = mapUserDataToAchievements(data);
  assert.equal(achievements.find(a => a.id.endsWith(':career_blooms'))?.unlocked, true);
  assert.equal(achievements.find(a => a.id.endsWith(':career_ten_takes'))?.progress, 4);
  assert.equal(achievements.find(a => a.id.endsWith(':career_top_rank'))?.unlocked, true);
  assert.ok(achievements.every(a => a.unlockedAt === null));
  assert.deepEqual(mapUserDataToAchievements(career([value('SaveDeleted', 1), value('AchivDone_career_top_rank', 1)])), []);
});

test('fetch requests all existing user data, allowing dynamic career keys', async () => {
  const original = globalThis.fetch;
  let body: unknown;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    const data = career([value('Analytics.Career.v1', history)]);
    return new Response(JSON.stringify({ code: 200, data: { Data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { Value: v }])) } }));
  };
  try {
    const logs = await getProductionLogs('test-ticket');
    assert.deepEqual(body, {});
    assert.equal(logs.length, 1);
  } finally { globalThis.fetch = original; }
});
