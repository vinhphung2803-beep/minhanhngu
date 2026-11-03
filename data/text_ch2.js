// ============================================================
// data/text_ch2.js - ALL words of Chapter 2 live here.
// You (the author) write the story text; the game only reads this file.
// Empty strings / empty arrays = nothing is shown (the game still works).
// Short UI labels (button names...) have simple defaults you can change.
// ============================================================
const CH2_TEXT = {
  chapterTitle: 'Becoming Myself',
  chapterAges: '',                 // e.g. 'Age 6-14' (empty = hidden)

  // ---- YOUR STORY TEXT (each entry = one dialogue box, use \n for a line break) ----
  intro: [],                       // shown before the hub opens
  afterGrowth: { child: [], preteen: [], teen: [] },   // shown after each growth cutscene
  growthLabel: { child: '', preteen: '', teen: '' },   // small label under "Age N" in the cutscene
  afterGame: { artist: [], language: [], friends: [], discover: [] },  // after a mini-game is fully cleared
  finale: [],                      // after Discover Yourself, before moving to Chapter 3

  // ---- SOCIAL BATTLE ("Making Friends" station): story lines + labels. Empty arrays = nothing shown. ----
  // The questions themselves are in data/social_battle_questions.js, numbers in data/social_battle_config.js.
  battle: {
    opponentName: 'Phung The Vinh',     // name shown in the battle (also in data/social_battle_config.js)
    playerName: '',                     // '' = "You"
    intro: [],                          // dialogue boxes before the FIRST attempt of every battle
    victory: [],                        // after the barrier melts (before the result screen)
    defeat: [],                         // after the player is defeated
    ui: {},                             // optional label overrides, e.g. { menu: { attack: 'Talk' }, barrier: 'Shyness', victory: 'Friends!' }
                                        // (all keys + defaults: BATTLE_UI_DEFAULT in js/social_battle.js)
    log: {}                             // optional overrides of move names, e.g. { attack: 'Friendly Chat', defend: 'Listen' }
  },

  // ---- NPC lines (OLD walking version of Making Friends; not used by the battle) ----
  npc: {
    shy:       { name: '', greet: '', happy: '', wrong: '' },
    energetic: { name: '', greet: '', happy: '', wrong: '' },
    calm:      { name: '', greet: '', happy: '', wrong: '' }
  },

  // ---- hub labels ----
  stations: { artist: 'Họa Sĩ Nhí', language: 'Language Detective', friends: 'Kết Bạn', discover: 'Khám Phá Bản Thân', boss18: 'Tuổi 18' },
  levelNames: {
    artist:   ['Hình Khối Lớn', 'Vẽ Theo Tranh', 'Chi Tiết Nhỏ'],
    language: ['Match Up', 'Sort & Build', 'Detective Case'],
    friends:  ['Phá Băng', 'Điểm Chung', 'Bạn Thật Sự'],   // Social Battle levels (labels only - rename freely)
    discover: ['Thử Thách'], boss18: ['Trận Chiến Tuổi 18']
  },
  stats: { creativity: 'Sáng tạo', language: 'Ngôn ngữ', friendship: 'Tình bạn' },

  // ---- short UI labels ----
  ui: {
    start: 'Bắt đầu', cont: 'Tiếp tục', retry: 'Thử lại', next: 'Tiếp', back: 'Quay lại', hub: 'Sảnh', done: 'Xong',
    locked: 'Đã khóa', result: 'Kết quả', score: 'Điểm', newBadge: 'Huy hiệu mới!', newReward: 'Mở khóa phần thưởng!',
    fill: 'Tô màu', brush: 'Cọ', eraser: 'Tẩy', undo: 'Hoàn tác', clear: 'Xóa hết', reference: 'Tranh mẫu',
    accuracy: 'Độ chính xác', listen: 'Listen', hint: 'Hint', correct: 'Chính xác!', wrong: 'Thử lại',   // listen/hint: thuộc Language Detective -> giữ tiếng Anh
   
    enter: 'Vào', progress: 'Tiến trình', badges: 'Huy hiệu', rewards: 'Phần thưởng', phase: 'Giai đoạn',
    friendship: 'Tình bạn', wave: 'Vẫy tay', share: 'Chia sẻ', play: 'Chơi', follow: 'Đi theo', wait: 'Chờ',
    needs: 'Cần', unlockAt: 'Mở khóa ở', exitChapter: 'Cửa ra chương'
  },

  // ---- badge + reward names (labels only) ----
  badges: {
    first_brush:    { name: 'Nét Cọ Đầu Tiên', desc: 'Hoàn thành Họa Sĩ Nhí màn 1' },
    colorful:       { name: 'Muôn Màu',         desc: 'Hoàn thành mọi màn Họa Sĩ Nhí' },
    true_colors:    { name: 'Màu Sắc Thật',     desc: 'Đạt 3 sao ở Chi Tiết Nhỏ' },
    first_words:    { name: 'First Words',      desc: 'Hoàn thành Language Detective màn 1' },
    polyglot:       { name: 'Polyglot',         desc: 'Hoàn thành mọi màn Language Detective' },
    word_detective: { name: 'Word Detective',   desc: 'Đạt 3 sao ở Detective Case' },
    hello_friend:   { name: 'Chào Bạn Mới',     desc: 'Hoàn thành Kết Bạn màn 1' },
    team_player:    { name: 'Đồng Đội',         desc: 'Hoàn thành Kết Bạn màn 2' },
    best_buddies:   { name: 'Bạn Thân',         desc: 'Hoàn thành mọi màn Kết Bạn' },
    discoverer:     { name: 'Nhà Khám Phá',     desc: 'Hoàn thành Khám Phá Bản Thân' },
    growing_up:     { name: 'Lớn Lên',          desc: 'Trưởng thành thành dạng mới' },
    all_rounder:    { name: 'Toàn Năng',        desc: 'Thu thập tổng cộng 18 sao' }
  },
  rewards: {
    palette_plus:  { name: 'Thêm Màu Sắc',   desc: '4 màu vẽ mới' },
    hint_lens:     { name: 'Kính Gợi Ý',      desc: 'Nút gợi ý trong trò Language' },
    friendly_aura: { name: 'Hào Quang Thân Thiện', desc: 'Tình bạn tăng nhanh hơn' },
    sparkle_trail: { name: 'Vệt Lấp Lánh',    desc: 'Tia sáng bay theo bạn ở sảnh' }
  }
};
const LT = (key, fallback) => (CH2_TEXT.ui && CH2_TEXT.ui[key]) || fallback || key;
