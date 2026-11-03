# Chapter 2 – Becoming Myself: gameplay guide

All story words are yours to write in `data/text_ch2.js` (empty by default). This document only describes **mechanics**.

## Flow
Chapter 1 -> (growth cutscene baby -> child) -> **hub** with 4 stations -> after *Discover Yourself* the chapter exit opens -> Chapter 3 placeholder (growth cutscene teen -> young) -> birthday ending.

Hub controls: `A/D` or arrows walk, `SPACE/W/Up` hop, `E` / `Enter` / tap / `Down` enter the station you stand in front of, `P` progress screen (stats, stars, badges, rewards).

## The four stations
Every mini-game has a level-select screen (stars + best score). Level N+1 unlocks when level N has at least 1 star. `Esc` or the top-right button leaves a level. Stars are 1-3.

### 1. The Little Artist (`js/paint.js`)
Pictures are paint-by-region grids (48x30 cells, drawn from `data/paintings.js`). Outlines cannot be painted.
* Tools: **Fill** (colours a whole region), **Brush** (freehand, sizes 1-3), **Eraser**, **Undo** (25 steps), **Clear**, palette of 8 colours (12 after the *Extra Colors* reward).
* Mouse/touch: tap or drag. Keyboard: arrows move the cursor, `SPACE` paints, `1-9` pick a colour, `T` swaps Fill/Brush, `Z` undo.
* Level 1 *Big Shapes* (free colouring, 8 big regions): stars from coverage (60/80/95 %), 3 stars also need 3+ different colours.
* Level 2 *Follow the Picture* (10 regions): copy the reference image (accuracy 55/70/85 %). A wrong "Done" blinks the wrong regions.
* Level 3 *Fine Details* (15 regions, exact colours): accuracy 70/85/95 %.
* Nothing requires drawing skill: Fill works with one tap per region. Repeated failed attempts become more forgiving.

### 2. Language Detective (`js/language.js`, words in `data/vocab.js`)
* Level 1 *Match Up*: tap a word, then its picture (6 pairs).
* Level 2 *Sort & Build*: put 8 words in 2 categories, then build 2 sentences by tapping words in order.
* Level 3 *Detective Case*: 8 cases, 4 kinds: **listen** (browser voice, if supported), **meaning** (picture -> word), **picture** (word -> picture), **unscramble** letters. Wrong answers are disabled and counted; you can always finish.
* Feedback: green check / red cross, sounds, sparkles; the meaning is shown after every correct answer. Keys `1-4` answer multiple choice.
* Reward *Hint Lens*: a Hint button removes two wrong options (or fills the next letter).

### 3. Making Friends (`js/social.js`, `js/npc.js`, `data/npc_data.js`, `data/social_levels.js`)
Walk to an NPC, press `E`/tap, choose an action (number keys or click). Each NPC shows what it **needs** (wave / gift / ball icon) – pick the matching action to raise its friendship (+34, three successes = 100).
NPC personalities (their own conditions):
| type | to talk to it you must… |
|---|---|
| shy | stand still near it ~1 s; it backs away if you rush at it |
| energetic | **hop** near it first – it only stops to listen right after that |
| calm | wait – it needs a short rest after a good talk |

Commands **Follow** / **Wait** (levels 2-3) need enough friendship (shy 40, energetic 30, calm 0). An energetic NPC only waits for ever at friendship 60+ (else it gets bored after 5 s).
Pressure plates open gates while something stands on them; after you step off, the gate closes again after 1.4 s – so the plate must be held by a friend.
* Level 1 *Say Hello*: befriend two NPCs.
* Level 2 *Work Together*: befriend the NPC, make it follow you onto the plate, tell it to wait, run through the gate to the exit.
* Level 3 *Group Challenge*: three NPCs, two gates. Friend 1 holds plate 1, friend 2 holds plate 2, friend 3 (calm) walks with you to the exit; everyone needs friendship 60.
* NPC states: idle, wander, attentive, retreat, follow, wait, happy, unsure, wave (with animation). The friendship bar is shown over each NPC; the top bar is the Friendship Progress.
* Mistakes (wrong action) reduce stars; a condition not met is only a hint (icon over the NPC), never a penalty.

### 4. Discover Yourself (`js/discover.js`, phases in `data/minigame_data.js`)
Unlocks when **Creativity, Language and Friendship are all >= 30** (`data/progression_data.js`).
Four small phases, each a checkpoint (saved, leaving never loses progress):
1. Paint the sunset (match the picture)  2. Detective case (5 questions)  3. Social room with a shy friend + gate  4. Free painting (4+ colours for full marks).
Nothing can be failed; painting gets more forgiving after repeated attempts.

## Progression
* **Stats**: Creativity (painting), Language, Friendship. Each cleared level adds points (10/14/18 + 2 per star; extra for colours); only *improvements* over your best are added, so replaying cannot farm points. Stats are used for the Discover unlock and for reward conditions only.
* **Badges** (12, `data/progression_data.js` -> `BADGES`): first brush, colorful, true colors, first words, polyglot, word detective, hello friend, team player, best buddies, discoverer, growing up, all-rounder. A pop-up appears when you earn one.
* **Rewards** (4): *Extra Colors* (4 paint colours), *Hint Lens* (hints in Language), *Friendly Aura* (+25 % friendship gain), *Sparkle Trail* (hub cosmetic).
* **Growth**: child (Chapter 2 start) -> preteen after **4 mini-game levels** cleared -> teen after *Discover Yourself*; Chapter 3 starts with the young form. Ages shown are in `data/growth.js`.
* Everything is saved in `localStorage` (`SaveSystem`) and survives reloads. Replay any level for a better score.
