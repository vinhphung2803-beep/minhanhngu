# Social Battle (Chapter 2, "Making Friends" station)

A turn-based RPG battle against ONE opponent, **Phung The Vinh** (placeholder NPC sprite). It replaces the old
walking/NPC social room. The opponent's HP bar is a "barrier" (awkwardness). At configurable HP thresholds the
battle pauses for a **conversation event**: pick the answer that matches his real interests; a right answer gives a
combat reward, a wrong one a penalty. At 0 HP you become friends.

## Files
| File | Purpose |
|---|---|
| `data/social_battle_config.js` | numbers: levels, thresholds, skills, enemy moves, rewards, penalties |
| `data/social_battle_questions.js` | topics + question bank (**all example questions are placeholders**) |
| `data/text_ch2.js` -> `battle` | opponent name, intro/victory/defeat lines, UI label overrides |
| `js/battle_engine.js` | rules only (no drawing); unit-tested in Node |
| `js/social_battle.js` | screen: sprites, bars, menu, dialogue overlay, results; `BattleMinigame` is generic |
| `js/social.js` | OLD walking social game, kept but registered as `friends_legacy` (unused) |

## Turn flow
1. Round start: the opponent's next move is shown ("Next: ..."), you regain 1 spark.
2. Your action: **Chat** (attack, +1 spark), **Skills** (cost sparks), **Defend** (damage x0.4 until your next turn, +1 spark), **Focus** (+3 sparks, small heal).
3. If the opponent reached a threshold -> conversation event (see below), then
4. the opponent acts. A status "lose a turn" makes a side skip its next turn.
5. Player HP 0 -> defeat screen (Retry / Leave). Opponent HP 0 -> victory.

Controls: mouse/touch click; keyboard arrows + Enter/Space, or number keys 1-4 (B = back in the skill list).
Pressing Enter/click during animations fast-forwards them.

## Thresholds (HP events)
In `levels[n].events`: `{ at: 0.75 }` = when the opponent's HP reaches 75 % of max. Add, remove or change entries freely
(`0 < at < 1`; invalid/duplicate values are ignored with a console warning).
* Damage is **capped at the threshold**, so one huge hit can never skip an event.
* Each threshold fires **exactly once per battle** (also after Retry: a new battle starts clean).
* A reward that deals damage can reach the next threshold; the next event then follows immediately.
* Optional keys per event: `tags:['easy']` (only questions with those tags), `question:'id'` (force a question),
  `reward:'presetId'`, `penalty:'presetId'`.
* Level keys: `choiceCount` (answers shown, the right one is always kept), `penalty`, `reward`, `stars`, `gain`, `gentle` (cannot be lost).

## Adding / editing questions (`data/social_battle_questions.js`)
```js
{ id: 'my_question_1',            // unique
  tags: ['easy'],                 // optional
  levels: [2, 3],                 // optional (omit = all levels)
  situation: 'You see ...',       // optional short scene text
  prompt: 'What do you say?',
  choices: [ { id:'a', topic:'music', text:'...' }, { id:'b', topic:'food', text:'...' }, ... ],   // 2-6 choices
  answer: 'a',                    // or ['a','c'] when several answers fit
  reward: 'healUp', penalty: 'counter',   // optional presets
  feedback: { correct: '...', wrong: '...' } }   // optional lines
```
* Topics are keys of `SOCIAL_BATTLE_TOPICS` (label, colour, icon, default `reward`). Add topics there; a choice with an
  unknown topic only gets a generic icon.
* Remove `placeholder: true` once a question is verified. In debug mode (`G`) placeholder questions are tagged.
* Invalid questions (too few choices, answer not in choices, duplicate id...) are skipped and listed in the console.
* If no question is available for an event, the event is skipped (never a crash) and still counts as fired.
* Reward preset order: `question.reward` > `event.reward` > topic `reward` > level `reward` > `tuning.defaultReward`.
  Penalty order: `question.penalty` > `event.penalty` > level `penalty` > `tuning.defaultPenalty`.

## Skills, rewards, penalties, enemy moves, effects
All are data (see the header of `social_battle_config.js` for the effect list: `damage`, `flatDamage`, `heal`, `status`
(`atk`/`def`/`guard`), `skip`, `sp`). Add a skill = add an object to `skills` (max 4 are shown). Add a reward/penalty =
add an entry to `rewards` / `penalties`. Add an enemy move = add to `levels[n].enemy.moves` (`weight`, optional `when`).
**New effect type:** `BattleEngine.effectHandlers.myEffect = (engine, effect, ctx, beats) => { ... }` then use `{ type:'myEffect' }`.

## Text
Everything the player reads that is not a question lives in `CH2_TEXT.battle` (`intro`, `victory`, `defeat` = arrays of
dialogue lines; `ui` = label overrides, defaults in `BATTLE_UI_DEFAULT`; `log` = move names). Empty arrays show nothing.

## Reuse in Chapter 3
`class Ch3Battle extends BattleMinigame { get data(){ return CH3_BATTLE; } get bank(){...} get topics(){...} }`
with its own data object (same shape), then `MinigameManager.register('...', Ch3Battle)`. The engine does not know about Chapter 2.
The player sprite follows `CharacterGrowth` (current stage sheet).

## Dev hooks
`?sbseed=123` in the URL makes the battle random numbers reproducible. `G` toggles the debug line (mode, thresholds, question id).
