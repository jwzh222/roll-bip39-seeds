// test.js — 验证 roll-seeds.html 内嵌代码的正确性
// 1) JS 语法检查  2) SHA-256 向量  3) BIP39 官方助记词测试向量
'use strict';
const fs = require('fs');
const html = fs.readFileSync('roll-seeds.html', 'utf8');

let fail = 0;
function check(name, cond) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name);
  if (!cond) fail++;
}

/* ---------- 1. 语法检查：整体 <script> 仅解析不执行 ---------- */
const scriptStart = html.indexOf('const WORDLISTS');
const scriptEnd = html.indexOf('</script>');
const scriptSrc = html.slice(scriptStart, scriptEnd);
try {
  new Function(scriptSrc); // 只做语法解析
  check('页面 <script> 无 JS 语法错误', true);
} catch (e) {
  check('页面 <script> 无 JS 语法错误：' + e.message, false);
}

/* ---------- 2. 提取词库 JSON ---------- */
const m = html.match(/const WORDLISTS = (\{[\s\S]*?\});\n/);
const WORDLISTS = JSON.parse(m[1]);
check('词库语言数 = 10', Object.keys(WORDLISTS).length === 10);
check('英文词库 2048 词且无重复', WORDLISTS.en.length === 2048 && new Set(WORDLISTS.en).size === 2048);
check('英文词库[0]=abandon, [2047]=zoo', WORDLISTS.en[0] === 'abandon' && WORDLISTS.en[2047] === 'zoo');
check('简体中文词库[0]=的', WORDLISTS['zh-Hans'][0] === '的');

/* ---------- 3. 提取并测试 sha256（从 HTML 原样提取，括号配平） ---------- */
function extractFunc(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('marker not found: ' + marker);
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
}
const sha256 = new Function('return ' + extractFunc(scriptSrc, 'function sha256(ascii)'))();
check('sha256("") 正确', sha256('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
check('sha256("abc") 正确', sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
check('sha256("test") 正确', sha256('test') === '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');

/* ---------- 4. BIP39 官方测试向量（熵 → 助记词） ---------- */
function entropyToMnemonic(hexBytes, lang) {
  const bytes = hexBytes.match(/../g).map(h => parseInt(h, 16));
  const en = bytes.length * 8, cs = en / 32;
  const bits = [];
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  const hashHex = sha256(String.fromCharCode.apply(null, bytes));
  for (let i = 0; i < cs; i++) bits.push((parseInt(hashHex[i >> 2], 16) >> (3 - (i % 4))) & 1);
  const words = [];
  for (let i = 0; i < (en + cs) / 11; i++) {
    let idx = 0;
    for (let j = 0; j < 11; j++) idx = idx * 2 + bits[i * 11 + j];
    words.push((WORDLISTS[lang] || WORDLISTS.en)[idx]);
  }
  return words.join(' ');
}

const vectors = [
  ['00000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'],
  ['7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f',
    'legal winner thank year wave sausage worth useful legal winner thank yellow'],
  ['80808080808080808080808080808080',
    'letter advice cage absurd amount doctor acoustic avoid letter advice cage above'],
  ['ffffffffffffffffffffffffffffffff',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'],
  ['0000000000000000000000000000000000000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'],
  ['ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote'],
];
for (const [hex, expect] of vectors) {
  const got = entropyToMnemonic(hex);
  check(`向量 ${hex.slice(0, 16)}… → ${expect.split(' ').length} 词`, got === expect);
}

// 中文词库抽查：零熵 12 词末词索引应与英文完全一致（算法与语言无关）
const enIdxAbout = WORDLISTS.en.indexOf('about'); // 英文零熵 12 词末词索引（应为 3）
const zhMnem = entropyToMnemonic('00000000000000000000000000000000', 'zh-Hans');
const zhLast = zhMnem.split(' ').slice(-1)[0];
check(`简体中文零熵 12 词末词 = ${zhLast}（索引 ${enIdxAbout}，与英文一致）`,
  zhLast === WORDLISTS['zh-Hans'][enIdxAbout] && enIdxAbout === 3);

console.log('\n' + (fail === 0 ? '全部通过 ✅' : fail + ' 项失败 ❌'));
process.exit(fail === 0 ? 0 : 1);
