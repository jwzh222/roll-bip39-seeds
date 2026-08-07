// build.js — 将 wordlists/*.txt 注入到 roll-seeds.html 模板，生成单文件离线应用。
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dir = path.join(root, 'wordlists');

// 语言 key -> 文件名（与页面内 WORDLISTS 对象的 key 一致）
const langs = {
  'en':      'english',
  'zh-Hans': 'chinese_simplified',
  'zh-Hant': 'chinese_traditional',
  'fr':      'french',
  'es':      'spanish',
  'it':      'italian',
  'pt':      'portuguese',
  'ja':      'japanese',
  'ko':      'korean',
  'cs':      'czech',
};

const data = {};
let warn = false;
for (const [key, fname] of Object.entries(langs)) {
  const raw = fs.readFileSync(path.join(dir, fname + '.txt'), 'utf8');
  const words = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  if (words.length !== 2048) { console.error(`!! ${fname}: ${words.length} words (expect 2048)`); warn = true; }
  if (new Set(words).size !== words.length) { console.error(`!! ${fname}: duplicates found`); warn = true; }
  data[key] = words;
}

const json = JSON.stringify(data); // Node 默认保留原始 UTF-8，非 ASCII 不转义

const htmlPath = path.join(root, 'roll-seeds.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const marker = '/*__BIP39_WORDLISTS_JSON__*/';
if (!html.includes(marker)) {
  // 已构建过（marker 已被消费）：从当前文件反解出模板，把词库 JSON 换回占位符，再重新注入。
  // 这样 build.js 幂等：首次构建、重复构建、在成品上重新构建都能得到一致结果。
  const m = html.match(/const WORDLISTS = (\{[\s\S]*?\});\r?\n/);
  if (!m) {
    console.error('!! 无法定位词库 JSON（const WORDLISTS = {...}），无法重建。请确认 roll-seeds.html 完整。');
    process.exit(1);
  }
  html = html.replace(m[0], 'const WORDLISTS = ' + marker + ';\n');
  console.log('↻ 检测到已构建产物，已从中反解模板后重新注入。');
}
html = html.replace(marker, () => json);
fs.writeFileSync(htmlPath, html);

console.log(`OK — injected ${(json.length / 1024).toFixed(0)} KB of wordlist data (${Object.keys(data).length} languages)`);
if (warn) process.exit(1);
