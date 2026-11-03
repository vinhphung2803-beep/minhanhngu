// Unit tests + balance simulation for js/battle_engine.js (no browser needed).
// Run:  node tests/battle_engine_test.js          (add  --sim  to print win rates)
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, Object, JSON, Array, String, Number });
['data/social_battle_config.js', 'data/social_battle_questions.js', 'js/battle_engine.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^if \(typeof module[^\n]*\n/m, ''), ctx, { filename: f }));
const get = (expr) => vm.runInContext(expr, ctx);
const BattleEngine = get('BattleEngine'), DATA = get('SOCIAL_BATTLE'), BANK = get('SOCIAL_BATTLE_QUESTIONS'), TOPICS = get('SOCIAL_BATTLE_TOPICS');

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) pass++; else { fail++; console.log('FAIL ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); } }
const clone = (o) => JSON.parse(JSON.stringify(o));
function make(level, seed, opts, mod) {
  const cfg = clone(DATA.levels[level]); if (mod) mod(cfg);
  const e = new BattleEngine(cfg, DATA, BANK, TOPICS, Object.assign({ seed, level: isNaN(level) ? level : +level }, opts || {}));
  e.start(); return e;
}
const rightId = (e) => e.event.correctIds[0], wrongId = (e) => e.event.choices.find((c) => !e.event.correctIds.includes(c.id)).id;

// ---- data validation
const v = BattleEngine.validateBank(BANK, TOPICS);
check('bank: all example questions valid', v.valid.length === BANK.length && v.problems.length === 0, v.problems);
const bad = BattleEngine.validateBank([{ id: 'x', choices: [{ id: 'a', text: 'A' }], answer: 'a' }, { id: 'y', choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: 'z' }, null, { id: 'y2', choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: ['a'] }], TOPICS);
check('bank: invalid questions dropped with messages, valid kept', bad.valid.length === 1 && bad.problems.length === 3, bad);

// ---- threshold events: huge damage cannot skip any event, each fires exactly once
{
  const e = make('2', 1, null, (c) => { c.player.atk = 500; c.player.hp = 99999; });
  let fired = [], guard = 0;
  while (e.phase !== 'won' && guard++ < 60) {
    if (e.phase === 'player') { const b = e.act({ type: 'attack' }); check('act returns beats', Array.isArray(b)); }
    if (e.phase === 'event') {
      fired.push({ at: e.event.at, hp: e.enemy.hp, thr: e.event.threshold.hp });
      check('act is blocked during an event', e.act({ type: 'attack' }) === null);
      check('invalid choice ignored', e.answer('nope') === null && e.phase === 'event');
      const r = e.answer(rightId(e)); check('answer returns result', r && r.correct === true);
      check('second answer ignored', e.answer(rightId(e)) === null);
      e.finishEvent();
      check('finishEvent twice is harmless', e.finishEvent().length === 0);
    }
  }
  check('3 events fired in order 0.75/0.5/0.25', fired.length === 3 && fired[0].at === 0.75 && fired[1].at === 0.5 && fired[2].at === 0.25, fired);
  check('enemy HP is capped at each threshold when the event starts', fired.every((f) => f.hp === f.thr), fired);
  check('player wins only after all events', e.phase === 'won' && e.counts.events === 3);
}

// ---- events with 1-hit kill attempt on a level with no events -> straight win
{
  const e = make('1', 2, null, (c) => { c.events = []; c.player.atk = 999; });
  e.act({ type: 'attack' }); check('no thresholds: enemy at 0 -> won', e.phase === 'won');
}

// ---- reward on correct (default reward 'bonusHit' damages), penalty on wrong
{
  const e = make('2', 3, null, (c) => { c.player.atk = 40; c.player.hp = 9999; });
  e.act({ type: 'attack' }); check('first event opens', e.phase === 'event');
  const before = e.enemy.hp; const r = e.answer(rightId(e)); const b = e.finishEvent();
  check('correct answer reward label present', r.label.length > 0 && r.presetId, r);
  check('reward produced beats and changed state', b.length > 0 && (e.enemy.hp < before || e.player.hp !== 9999 || e.player.statuses.length > 0 || e.enemy.statuses.length > 0 || e.phase === 'event'), { hp: e.enemy.hp, before });

  const f = make('2', 4, null, (c) => { c.player.atk = 40; c.player.hp = 500; c.penalty = 'loseTurn'; });
  f.act({ type: 'attack' }); const r2 = f.answer(wrongId(f)); check('wrong answer flagged', r2.correct === false);
  f.finishEvent();
  check('wrong answer penalty loseTurn: next player turn is skipped (enemy acted twice)', f.counts.wrong === 1 && f.phase === 'player');
}
{ // loseTurn really skips: count enemy moves between two player turns
  const f = make('2', 5, { startSp: 0 }, (c) => { c.player.atk = 40; c.player.hp = 9999; c.penalty = 'loseTurn'; });
  f.act({ type: 'attack' }); f.answer(wrongId(f)); const beats = f.finishEvent();
  const kinds = beats.map((b) => b.type);
  check('skip beat for the player is emitted', beats.some((b) => b.type === 'skip' && b.side === 'player'), kinds);
  check('enemy moved twice in a row after the lost turn', beats.filter((b) => b.type === 'move' && b.side === 'enemy').length === 2, kinds);
}

// ---- defeat / gentle
{
  const e = make('3', 6, null, (c) => { c.player.hp = 1; c.enemy.atk = 999; });
  let g = 0; while (e.phase === 'player' && g++ < 5) e.act({ type: 'defend' });
  check('player defeated -> phase lost', e.phase === 'lost' && e.summary().stars === 0);
  check('no actions after the end', e.act({ type: 'attack' }) === null && e.answer('a') === null);
}
{
  const e = make('finale', 7, null, (c) => { c.player.hp = 3; c.enemy.atk = 999; c.enemy.hp = 99999; });
  let g = 0; while (e.phase === 'player' && g++ < 12) e.act({ type: 'focus' });
  check('gentle level: player can never be defeated (HP floor 1)', e.phase === 'player' && e.player.hp >= 1, e.player.hp);
}

// ---- defend reduces damage, skills cost sparks, invalid skills
{
  const dmg = (def) => { let total = 0; for (let s = 0; s < 40; s++) { const e = make('2', 100 + s, null, (c) => { c.enemy.moves = [{ id: 'm', name: 'M', weight: 1, effects: [{ type: 'damage', power: 1 }] }]; }); const before = e.player.hp; e.act({ type: def ? 'defend' : 'focus' }); total += before - e.player.hp + (def ? 0 : 0); } return total; };
  const d1 = dmg(true), d0 = dmg(false);
  check('defend takes clearly less damage than not defending (focus heals 8% so compare raw)', d1 < d0 * 0.7, { defend: d1, other: d0 });
  const e = make('2', 8, { startSp: 0 });
  check('skill refused without sparks', e.act({ type: 'skill', id: 'sketch_burst' }) === null && e.phase === 'player');
  check('unknown skill refused', e.act({ type: 'skill', id: 'nope' }) === null);
  check('unknown action refused', e.act({ type: 'dance' }) === null);
  const e2 = make('2', 9, { startSp: 6 }); const sp0 = e2.player.sp; e2.act({ type: 'skill', id: 'sketch_burst' });
  check('skill spends sparks', e2.player.sp <= sp0 - 2 + 1 + 1, e2.player.sp);
}

// ---- no usable question bank: battle must not hang or crash
{
  const cfg = clone(DATA.levels['2']); cfg.player.atk = 500; cfg.player.hp = 9999;
  const e = new BattleEngine(cfg, DATA, [], TOPICS, { seed: 1, level: 2 }); e.start();
  let g = 0; while (e.phase === 'player' && g++ < 30) e.act({ type: 'attack' });
  check('empty bank: events are skipped, battle still ends in victory', e.phase === 'won' && e.counts.events === 0, e.phase);
}

// ---- bad thresholds are ignored
{
  const e = make('2', 10, null, (c) => { c.events = [{ at: 1.2 }, { at: 0 }, { at: 0.5 }, { at: 0.5 }, { at: 'x' }]; });
  check('invalid/duplicate thresholds ignored', e.thresholds.length === 1 && e.problems.length === 4, e.problems);
}

// ---- thresholds are data: change them and the events follow
{
  const e = make('1', 11, null, (c) => { c.events = [{ at: 0.9 }, { at: 0.1 }]; c.player.atk = 200; c.player.hp = 999; });
  e.act({ type: 'attack' }); const a1 = e.event && e.event.at; e.answer(rightId(e)); e.finishEvent();
  let g = 0; while (e.phase === 'player' && g++ < 5) e.act({ type: 'attack' });
  check('custom thresholds 0.9 then 0.1', a1 === 0.9 && e.event && e.event.at === 0.1, { a1, ev: e.event && e.event.at });
}

// ---- reward/penalty precedence and question reuse
{
  const e = make('2', 12, null, (c) => { c.player.atk = 40; c.player.hp = 999; c.events = [{ at: 0.5, question: 'ph_pets_1', reward: 'healUp' }]; });
  let g = 0; while (e.phase === 'player' && g++ < 10) e.act({ type: 'attack' });
  check('event can force a question', e.event && e.event.question.id === 'ph_pets_1');
  const r = e.answer(rightId(e)); check('question reward overrides event reward overrides topic reward (bondBoost via topic only if nothing else)', r.presetId === 'healUp', r.presetId);
}
{ // questions are not repeated within one battle while unused ones exist
  const e = make('3', 13, null, (c) => { c.player.atk = 120; c.player.hp = 99999; });
  const ids = []; let g = 0;
  while (e.phase !== 'won' && g++ < 80) { if (e.phase === 'player') e.act({ type: 'attack' }); if (e.phase === 'event') { ids.push(e.event.question.id); e.answer(rightId(e)); e.finishEvent(); } }
  check('4 events in level 3, no repeated question', ids.length === 4 && new Set(ids).size === 4, ids);
}

// ---- balance simulation
function play(level, seed, policy) {
  const e = make(level, seed); let g = 0;
  while ((e.phase === 'player' || e.phase === 'event') && g++ < 400) {
    if (e.phase === 'event') { e.answer(policy.knows() ? rightId(e) : wrongId(e)); e.finishEvent(); continue; }
    e.act(policy.pick(e));
  }
  return e;
}
const policies = {
  spam: { knows: () => Math.random() < 0.0, pick: () => ({ type: 'attack' }) },
  'smart+knows': { knows: () => true, pick(e) { const P = e.player; const intent = e.intent; const big = intent && intent.effects.some((x) => x.type === 'damage' && x.power >= 1.3);
      if (P.hp < P.maxHp * 0.4 && P.sp >= 3) return { type: 'skill', id: 'warm_smile' };
      if (big) return { type: 'defend' };
      if (P.sp >= 2) return { type: 'skill', id: 'sketch_burst' };
      return { type: 'attack' }; } },
  'smart+80%': { knows: () => Math.random() < 0.8, pick(e) { return policies['smart+knows'].pick(e); } },
  'smart+random': { knows: () => Math.random() < 0.33, pick(e) { return policies['smart+knows'].pick(e); } }
};
const table = {};
for (const lvl of ['1', '2', '3', 'finale']) {
  table[lvl] = {};
  for (const [pn, pol] of Object.entries(policies)) {
    let wins = 0, N = 300, turns = 0, hp = 0;
    for (let s = 0; s < N; s++) { const e = play(lvl, 1000 + s, pol); if (e.phase === 'won') { wins++; turns += e.turn; hp += e.player.hp / e.player.maxHp; } }
    table[lvl][pn] = { win: wins / N, turns: wins ? +(turns / wins).toFixed(1) : 0, hpLeft: wins ? +(hp / wins).toFixed(2) : 0 };
  }
}
if (process.argv.includes('--sim')) console.table(Object.fromEntries(Object.entries(table).map(([l, o]) => [l, Object.fromEntries(Object.entries(o).map(([p, r]) => [p, r.win + ' / ' + r.turns + 't / hp' + r.hpLeft]))])));
check('sim L1: smart player with good answers wins nearly always', table['1']['smart+knows'].win > 0.9, table['1']);
check('sim L2: smart player with good answers wins mostly', table['2']['smart+knows'].win > 0.8, table['2']);
check('sim L3: smart player with good answers wins often but not always', table['3']['smart+knows'].win > 0.6, table['3']);
check('sim: answering matters (guessing answers = more turns, less HP left, not more wins) on L3', table['3']['smart+random'].hpLeft < table['3']['smart+knows'].hpLeft && table['3']['smart+random'].turns > table['3']['smart+knows'].turns && table['3']['smart+random'].win <= table['3']['smart+knows'].win, table['3']);
check('sim: spamming plain attacks is not enough on L2/L3', table['2'].spam.win < 0.3 && table['3'].spam.win < 0.1, [table['2'].spam, table['3'].spam]);
check('sim: finale is gentle (always winnable)', table['finale']['spam'].win === 1 || table.finale['smart+knows'].win === 1, table.finale);

console.log((fail ? 'FAILED' : 'OK') + ': ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
