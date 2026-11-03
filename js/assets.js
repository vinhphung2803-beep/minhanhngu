// ============================================================
// assets.js - Loads every image once. Paths are RELATIVE (no leading
// slash) so the game works on GitHub Pages sub-folders too.
// ============================================================
const Assets = {
  images: {},
  LIST: {
    baby: 'assets/characters/baby_sheet.png',
    tiles: 'assets/environments/tiles.png',
    decor: 'assets/environments/decor.png',
    hillsFar: 'assets/environments/hills_far.png',
    hillsNear: 'assets/environments/hills_near.png',
    cloud: 'assets/environments/cloud.png',
    arch: 'assets/environments/arch.png',
    items: 'assets/collectibles/collectibles.png',
    sparkle: 'assets/effects/sparkle.png',
    font: 'assets/ui/font.png',
    child: 'assets/characters/child.png', preteen: 'assets/characters/preteen.png',
    teen: 'assets/characters/teen.png', young: 'assets/characters/young.png', adult: 'assets/characters/adult.png',
    stations: 'assets/environments/stations.png', props: 'assets/environments/props.png',
    icons: 'assets/ui/icons.png', badges: 'assets/ui/badges.png', vocab: 'assets/ui/vocab.png'
  },
  failed: [],
  // NPC sheets are registered by data/npc_data.js (npc_<type>_<stage>)
  addNpcSheets(types, stages) {
    types.forEach((t) => stages.forEach((s) => { this.LIST['npc_' + t + '_' + s] = 'assets/characters/npc_' + t + '_' + s + '.png'; }));
  },

  load() {
    const jobs = Object.entries(this.LIST).map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(); };
      img.onerror = () => { this.failed.push(src); console.error('Missing asset: ' + src); resolve(); };
      img.src = src;
    }));
    return Promise.all(jobs);
  },
  get(key) { return this.images[key]; }
};
