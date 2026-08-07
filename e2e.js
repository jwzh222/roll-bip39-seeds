// e2e.js — 用 jsdom 模拟浏览器，端到端验证 UI 交互到助记词生成的完整流程
'use strict';
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(fs.readFileSync('roll-seeds.html', 'utf8'), {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const { window } = dom;
const { document } = window;
window.confirm = () => true; // 允许切换/清空
window.scrollTo = () => {};

let fail = 0;
function check(name, cond) { console.log((cond ? '  ✓ ' : '  ✗ ') + name); if (!cond) fail++; }
function $(id) { return document.getElementById(id); }
function txt(id) { return $(id).textContent.replace(/\s+/g, ' ').trim(); }
function clickChoice(val) { document.querySelector(`.choice[data-val="${val}"]`).click(); }
function pressKey(k) { $('inputbox').dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })); }
function clickSeg(group, val) {
  document.querySelector(`.seg-btn[data-group="${group}"][data-value="${val}"]`).click();
}
function setLang(v) {
  const sel = $('lang');
  sel.value = v;
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
}

/* ---------- 初始状态 ---------- */
check('默认 coin 模式选中', document.querySelector('.seg-btn[data-group="source"][data-value="coin"]').classList.contains('active'));
check('默认 12 词选中', document.querySelector('.seg-btn[data-group="words"][data-value="12"]').classList.contains('active'));
check('默认语言 English', $('lang').value === 'en');
check('进度初始 0/128', txt('progress') === '0/128');
check('coin 模式显示 2 张图片', document.querySelectorAll('.choice').length === 2);
check('输入框提醒 coin 只能输 0/1', txt('inputPlaceholder').includes('enter 0 or 1'));

/* ---------- 模拟投掷警告（点击图片，语气逐级强化） ---------- */
function simRoll() { clickChoice(0); pressKey('Backspace'); } // 点击后立即撤销，保持进度 0/128
simRoll();
check('第 1 次点击显示警告', $('inputWarn').style.display !== 'none');
check('第 1 次警告为学习版', $('inputWarn').textContent.includes('for learning only'));
simRoll(); simRoll();
check('第 3 次仍为学习版', $('inputWarn').textContent.includes('for learning only'));
simRoll(); // 第 4 次
check('第 4 次警告升级为实体骰子', $('inputWarn').textContent.includes('real-world'));
for (let i = 0; i < 6; i++) simRoll(); // 第 5–10 次
check('第 10 次警告严厉版', $('inputWarn').textContent.includes('arrogant'));
check('警告测试后进度仍为 0/128', txt('progress') === '0/128');

/* ---------- 点击硬币输入 ---------- */
clickChoice(1); // 反面 → 1
check('点击反面后进度 1/128', txt('progress') === '1/128');
check('输入框显示 1', txt('rolls').includes('1'));

/* ---------- 键盘输入 ---------- */
pressKey('0'); // 正面 → 0
check('键盘 0 后进度 2/128', txt('progress') === '2/128');
pressKey('Backspace'); // 撤销
check('Backspace 撤销后进度 1/128', txt('progress') === '1/128');

/* ---------- 切换到骰子 ---------- */
clickSeg('source', 'dice');
check('骰子模式显示 6 张图片', document.querySelectorAll('.choice').length === 6);
check('切换后进度清零 0/128', txt('progress') === '0/128');
check('输入框提醒 dice 只能输 1~6', txt('inputPlaceholder').includes('1–6'));
check('说明包含奇偶法', txt('legend').includes('odd'));

clickChoice(2); // 偶数 → 1
clickChoice(1); // 奇数 → 0
check('骰子奇偶法二进制 = 10', txt('binaryStrip') === '10');

/* ---------- 切回硬币并填充 128 位全零 ---------- */
clickSeg('source', 'coin');
let progressSeen = null;
for (let i = 0; i < 128; i++) {
  clickChoice(0); // 正面 → 0，全零熵
  if (i === 120) progressSeen = txt('wordsGrid');
}
check('最后单词框显示已填 121/128 位熵', progressSeen.includes('Filled 121/128'));
check('完成后进度 128/128 ✓', txt('progress') === '128/128 ✓');
check('渲染 12 个单词格', $('wordsGrid').children.length === 12);

/* ---------- 全零熵助记词 = 官方已知向量 ---------- */
const expected = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
check('助记词与官方向量一致', $('mnemonic').value === expected);
const lastChip = $('wordsGrid').lastElementChild;
check('最后一个单词为 about', lastChip.querySelector('.wtext').textContent === 'about');
check('末词含校验位标记(4 位 cs)', lastChip.querySelectorAll('.bit.cs').length === 4);
check('完成后不再显示生成状态行', txt('finalStatus') === '');

/* ---------- 语言切换 ---------- */
setLang('zh-Hans');
const zhExpected = Array(11).fill('的').join(' ') + ' 在';
check('切到简体中文后助记词为中文', $('mnemonic').value === zhExpected);
setLang('en');
check('切回 English 助记词恢复', $('mnemonic').value === expected);

/* ---------- 撤销（Backspace） / 清空 ---------- */
$('inputbox').focus();
pressKey('Backspace');
check('Backspace 撤销后进度 127/128', txt('progress') === '127/128');
for (let i = 0; i < 127; i++) pressKey('Backspace');
check('全部撤销后进度 0/128', txt('progress') === '0/128');
check('全部撤销后无单词格', $('wordsGrid').children.length === 0);

/* ---------- 24 词模式 ---------- */
clickSeg('words', '24');
check('24 词模式进度 0/256', txt('progress') === '0/256');
check('说明更新为 256 位熵', txt('legend').includes('256 bits'));
clickChoice(1); clickChoice(0); clickChoice(1);
check('24 词模式下输入 3 位进度 3/256', txt('progress') === '3/256');

console.log('\n' + (fail === 0 ? '端到端测试全部通过 ✅' : fail + ' 项失败 ❌'));
process.exit(fail === 0 ? 0 : 1);
