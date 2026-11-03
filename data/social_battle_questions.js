// ============================================================
// data/social_battle_questions.js - the question bank for Social Battle conversation events.
// Add / edit / delete questions HERE. The battle engine never needs to change.
//
// !!! EVERY QUESTION BELOW IS A PLACEHOLDER (placeholder: true) !!!
// They were written only to test the system. They are NOT facts about the real person.
// Only the four TOPICS marked confirmed:true come from the author's brief:
//   drawing & art, video games, music, dogs & cats.
// Distractor topics (cooking, fishing, ...) are generic filler: replace them with what is
// really true. Set placeholder:false (or delete the key) on a question once you have checked it.
//
// QUESTION FORMAT
// {
//   id:        'unique_id',                 required, unique
//   placeholder: true,                      optional marker (shown in the debug view, G key)
//   tags:      ['easy'],                    optional - events can ask for tags (see social_battle_config.js)
//   levels:    [1, 2],                      optional - only used in these levels (omit = all levels)
//   situation: 'Short description of the moment',      shown first (can be '' )
//   prompt:    'The question / what do you say?',
//   choices: [ { id:'a', topic:'art', text:'What you say' }, ... ],   2-6 choices, each with a topic key
//   answer:    'a'  (or ['a','c'] if several are right),   the choice id(s) that fit the real person
//   reward:    'healUp',   penalty: 'counter',     optional preset ids (social_battle_config.js)
//   feedback:  { correct:'...', wrong:'...' },     optional lines shown after answering
// }
// Fewer choices are shown on easy levels (level.choiceCount); the right answer is always kept.
// Choice order is shuffled every time. Questions are not repeated inside one battle while unused
// ones exist.
// ============================================================

// Topic keys are used by the choices. 'confirmed' = known from the brief. reward = default reward
// preset when a choice of this topic is the correct answer (a question/event can override it).
// icon: ICON_INDEX name | vocab: VOCAB_ICON_INDEX name | pixel: key of SB_PIXEL (js/social_battle.js: gamepad, note)
const SOCIAL_BATTLE_TOPICS = {
  art:     { label: 'Vẽ & Nghệ thuật', confirmed: true, color: '#ff8cb4', icon: 'brush',    reward: 'bonusHit' },
  games:   { label: 'Trò chơi điện tử',   confirmed: true, color: '#96d0ff', pixel: 'gamepad', reward: 'powerUp' },
  music:   { label: 'Âm nhạc',         confirmed: true, color: '#c8aaff', pixel: 'note',    reward: 'healUp' },
  pets:    { label: 'Chó & Mèo',   confirmed: true, color: '#ffd65a', vocab: 'dog',    reward: 'bondBoost' },
  // generic filler topics for wrong answers (NOT claims about anyone):
  food:    { label: 'Nấu ăn',  confirmed: false, color: '#ff9a6b', icon: 'gift' },
  sport:   { label: 'Thể thao',   confirmed: false, color: '#8fd3a8', icon: 'ball' },
  nature:  { label: 'Cây cối',   confirmed: false, color: '#8fd3a8', vocab: 'flower' },
  travel:  { label: 'Tàu hỏa',   confirmed: false, color: '#9fb3c8', icon: 'follow' },
  school:  { label: 'Bài tập', confirmed: false, color: '#b8a58a', icon: 'book' },
  other:   { label: 'Khác',    confirmed: false, color: '#b8a58a', icon: 'question' }
};

const SOCIAL_BATTLE_QUESTIONS = [
  { id: 'ph_art_1', placeholder: true, tags: ['easy'],
    situation: '[placeholder] You notice a sketchbook peeking out of a bag.',
    prompt: 'What do you ask about?',
    choices: [
      { id: 'a', topic: 'food',   text: 'What is your favourite recipe?' },
      { id: 'b', topic: 'art',    text: 'Do you draw? Can I see?' },
      { id: 'c', topic: 'sport',  text: 'Do you play football?' },
      { id: 'd', topic: 'travel', text: 'Do you like long train rides?' } ],
    answer: 'b', feedback: { correct: '', wrong: '' } },

  { id: 'ph_games_1', placeholder: true, tags: ['easy'],
    situation: '[placeholder] A handheld console beeps on the desk.',
    prompt: 'What do you say?',
    choices: [
      { id: 'a', topic: 'games',  text: 'Which game are you playing?' },
      { id: 'b', topic: 'nature', text: 'Do you like gardening?' },
      { id: 'c', topic: 'school', text: 'Did you finish the homework?' },
      { id: 'd', topic: 'music',  text: 'What song is this?' } ],
    answer: 'a' },

  { id: 'ph_music_1', placeholder: true, tags: ['easy'],
    situation: '[placeholder] Soft music leaks from a pair of headphones.',
    prompt: 'How do you start talking?',
    choices: [
      { id: 'a', topic: 'sport',  text: 'Did you watch the match?' },
      { id: 'b', topic: 'food',   text: 'Want to share a snack?' },
      { id: 'c', topic: 'music',  text: 'That sounds nice! What are you listening to?' },
      { id: 'd', topic: 'travel', text: 'Do you know the bus times?' } ],
    answer: 'c' },

  { id: 'ph_pets_1', placeholder: true, tags: ['easy'],
    situation: '[placeholder] A phone wallpaper shows something fluffy.',
    prompt: 'What do you ask?',
    choices: [
      { id: 'a', topic: 'pets',   text: 'Aww, is that your dog or cat?' },
      { id: 'b', topic: 'school', text: 'Is that your exam schedule?' },
      { id: 'c', topic: 'games',  text: 'Is that a game character?' } ],
    answer: 'a', penalty: 'weaken' },

  { id: 'ph_weekend_1', placeholder: true,
    situation: '[placeholder] It is almost the weekend.',
    prompt: 'You want to suggest something fun. What do you propose?',
    choices: [
      { id: 'a', topic: 'sport',  text: 'Let us run laps around the field!' },
      { id: 'b', topic: 'art',    text: 'Let us draw together in the park!' },
      { id: 'c', topic: 'food',   text: 'Let us bake something!' },
      { id: 'd', topic: 'nature', text: 'Let us water the plants!' } ],
    answer: 'b' },

  { id: 'ph_gift_1', placeholder: true,
    situation: '[placeholder] You want to give a small friendly gift.',
    prompt: 'Which gift is the best match?',
    choices: [
      { id: 'a', topic: 'games',  text: 'A little game voucher' },
      { id: 'b', topic: 'food',   text: 'A cooking apron' },
      { id: 'c', topic: 'sport',  text: 'A sweatband' },
      { id: 'd', topic: 'school', text: 'A new ruler' } ],
    answer: 'a' },

  { id: 'ph_rainy_1', placeholder: true,
    situation: '[placeholder] It is a rainy afternoon and you are stuck inside.',
    prompt: 'What do you suggest?',
    choices: [
      { id: 'a', topic: 'music',  text: 'Let us make a playlist together.' },
      { id: 'b', topic: 'travel', text: 'Let us read timetables.' },
      { id: 'c', topic: 'nature', text: 'Let us count raindrops on the window.' },
      { id: 'd', topic: 'food',   text: 'Let us wash the dishes.' } ],
    answer: 'a', reward: 'healUp' },

  { id: 'ph_walk_1', placeholder: true,
    situation: '[placeholder] You are walking home together and see a street animal.',
    prompt: 'What do you say?',
    choices: [
      { id: 'a', topic: 'pets',   text: 'Look! Can we say hello to it?' },
      { id: 'b', topic: 'sport',  text: 'Race you to the corner!' },
      { id: 'c', topic: 'school', text: 'Let us quiz each other on math.' },
      { id: 'd', topic: 'travel', text: 'Which bus goes this way?' } ],
    answer: 'a' },

  { id: 'ph_free_1', placeholder: true,
    situation: '[placeholder] A free lesson period.',
    prompt: 'What would you love to do together?',
    choices: [
      { id: 'a', topic: 'food',   text: 'Cook a surprise lunch.' },
      { id: 'b', topic: 'games',  text: 'Play a co-op game.' },
      { id: 'c', topic: 'art',    text: 'Draw each other as cartoon characters.' },
      { id: 'd', topic: 'sport',  text: 'Play table tennis.' } ],
    answer: ['b', 'c'] },

  { id: 'ph_hard_1', placeholder: true, levels: [3],
    situation: '[placeholder] A real chance to show you care.',
    prompt: 'Which topic would make your new friend\'s eyes light up?',
    choices: [
      { id: 'a', topic: 'other',  text: 'Tell me about your day.' },
      { id: 'b', topic: 'pets',   text: 'Tell me about the animals you love!' },
      { id: 'c', topic: 'travel', text: 'Tell me about trains.' },
      { id: 'd', topic: 'school', text: 'Tell me about your favourite subject.' } ],
    answer: 'b', reward: 'bondBoost' }
];
