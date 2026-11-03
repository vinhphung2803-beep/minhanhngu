// Nạp data/*.js theo đúng thứ tự index.html vào một vm context rồi in JSON của các biến cần trích xuất.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/src="((?:js|data)\/[^"]+)"/g)].map(m => m[1]).filter(f => f.startsWith('data/') || ['js/config.js','js/fontdata.js'].includes(f));
const ctx = vm.createContext({ console, window: {} });
for (const f of files) { try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); } catch (e) { console.error('load fail', f, e.message); } }
const expr = process.argv[2] || 'null';
console.log(JSON.stringify(vm.runInContext('(' + expr + ')', ctx), null, 1));
