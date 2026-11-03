// ============================================================
// data/vocab.js - vocabulary for Language Detective. EDIT THIS FILE to change the words.
//   word    : the foreign word (what she learns)
//   meaning : its meaning in your language (shown after a correct answer)
//   icon    : picture name (must exist in assets/ui/vocab.png, see VOCAB_ICONS below)
//   cat     : category id (see VOCAB_CATEGORIES)
// Available pictures: apple cat dog sun moon star heart tree house book cup fish bird flower ball pencil
// Words with no picture still work in the sort / sentence / unscramble parts.
// ============================================================
const VOCAB_CONFIG = {
  speechLang: 'en-US',          // language of the browser voice used by "Listen" (en-US, fr-FR, ja-JP, ...)
};
const VOCAB_CATEGORIES = { animal: 'Animals', nature: 'Nature', things: 'Things' };
const VOCAB = [
  { word: 'cat',    meaning: 'con mèo',    icon: 'cat',    cat: 'animal' },
  { word: 'dog',    meaning: 'con chó',    icon: 'dog',    cat: 'animal' },
  { word: 'bird',   meaning: 'con chim',   icon: 'bird',   cat: 'animal' },
  { word: 'fish',   meaning: 'con cá',     icon: 'fish',   cat: 'animal' },
  { word: 'sun',    meaning: 'mặt trời',   icon: 'sun',    cat: 'nature' },
  { word: 'moon',   meaning: 'mặt trăng',  icon: 'moon',   cat: 'nature' },
  { word: 'star',   meaning: 'ngôi sao',   icon: 'star',   cat: 'nature' },
  { word: 'tree',   meaning: 'cái cây',    icon: 'tree',   cat: 'nature' },
  { word: 'flower', meaning: 'bông hoa',   icon: 'flower', cat: 'nature' },
  { word: 'apple',  meaning: 'quả táo',    icon: 'apple',  cat: 'things' },
  { word: 'cup',    meaning: 'cái cốc',    icon: 'cup',    cat: 'things' },
  { word: 'book',   meaning: 'quyển sách', icon: 'book',   cat: 'things' },
  { word: 'pencil', meaning: 'bút chì',    icon: 'pencil', cat: 'things' },
  { word: 'ball',   meaning: 'quả bóng',   icon: 'ball',   cat: 'things' },
  { word: 'house',  meaning: 'ngôi nhà',   icon: 'house',  cat: 'things' },
  { word: 'heart',  meaning: 'trái tim',   icon: 'heart',  cat: 'things' }
];
// Sentence-building round: words are shuffled, she taps them in the right order.
const SENTENCES = [
  { words: ['I', 'like', 'red', 'apples'],            meaning: 'Tôi thích táo đỏ' },
  { words: ['The', 'cat', 'sees', 'the', 'moon'],     meaning: 'Con mèo nhìn thấy mặt trăng' },
  { words: ['We', 'read', 'a', 'book'],               meaning: 'Chúng tôi đọc một quyển sách' },
  { words: ['A', 'bird', 'is', 'in', 'the', 'tree'],  meaning: 'Một con chim ở trên cây' }
];
