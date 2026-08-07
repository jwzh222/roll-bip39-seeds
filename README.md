# Roll Seeds · Generate BIP39 Mnemonics with Physical Dice / Coin Flips (Offline)

> **Roll Seeds** — Generate a secure BIP39 mnemonic from physical dice or coin flips, 100% offline.
> One self-contained HTML file, double-click to run, zero network requests.

Create a secure BIP39 mnemonic using **real coins or dice**, fully offline. The single-file `roll-seeds.html` runs by double-clicking it — no network requests are ever made.

The UI was redesigned from a Figma mockup: clean English, compact layout (aims to fit the whole flow — roll → words → mnemonic — on one screen). Supports **10 BIP39 wordlist languages** (English by default, plus Simplified/Traditional Chinese, French, Spanish, Italian, Portuguese, Japanese, Korean, Czech).

## Usage

1. Download / open `roll-seeds.html` — **turn off Wi-Fi / unplug the network** before use.
2. Pick **12 or 24 words**, then **Coin or Dice** (default: coin).
3. Roll a real coin/die and click the matching face to record each result (keyboard input, or **paste** a string of bits/digits, also works):
   - Coin: heads → `0`, tails → `1`
   - Dice (parity): odd `1/3/5` → `0`, even `2/4/6` → `1`
   - The input auto-groups every **11 bits with a space** for easy copy/verification; invalid input shows a red hint above the box (coin: only 0/1, dice: only 1–6)
   - `Backspace` undoes the last roll; the status bar shows live progress `Bits: 0/128` or `0/256` and an estimated `Time To Crack`
   - **Clicking** the coin/dice images counts as *browser simulation* and triggers progressively stronger reminders (mild for the first 3 clicks, from the 4th it urges you to roll a real die, from the 10th it gets blunt) — for a real wallet, always roll a physical coin/die on your desk
4. Every word block renders 11 slots (unfilled slots show `-` placeholders); as soon as **11 bits** are complete, a word renders together with its **wordlist index** (e.g. `#2794`) so you can cross-check against a paper wordlist; the `Raw Binary` block shows the raw bit stream, with the coin/dice mapping printed just above it.
5. The final word is determined by the remaining entropy + **checksum** (first 4/8 bits of SHA-256) — the last word card shows a `CSUM` badge and "Checksum calculated ✓"; the mnemonic appears below.
6. Write it down on paper, and **test with a small amount first** before moving larger funds.

The page **never persists any input**: closing the page clears all roll data, and nothing is written to `localStorage` (on load it also clears any legacy saved state).

## Algorithm

- Coin / dice → 1 bit (coin: heads/tails; dice: parity). 12 words need 128 bits of entropy, 24 words need 256.
- Every 11 bits = one word. The last word = remaining entropy bits + checksum (`SHA-256(entropy)` first 4/8 bits).
- SHA-256 is a pure in-page JS implementation, self-checked at load against official test vectors; wordlists are checked for 2048 unique words.

## Honest Security Notes

- This tool does **not create entropy** — it converts the physical randomness of your coin/die into a mnemonic. A biased die or a non-private process weakens security.
- A coin/die contributes only 1 bit per toss. If you suspect bias, roll more, or test your coin/die against an official wordlist for fairness.

## Sources

- The 10 BIP39 wordlists come from the official [bitcoin/bips](https://github.com/bitcoin/bips) repo (`bip-0039/*.txt`), injected by `build.js`.
- SHA-256 is an embedded pure-JS implementation (offline-safe), self-checked against [NIST test vectors](https://www.nist.gov/) (`""`, `"abc"`, `"test"`).

## Development

```bash
npm install     # installs jsdom (test-only, not shipped)
npm run build   # rebuilds roll-seeds.html from wordlists/*.txt (idempotent)
npm test        # test.js (syntax / SHA-256 / BIP39 vectors) + e2e.js (jsdom end-to-end UI)
```

`build.js` is idempotent: whether building fresh or re-building an already-built artifact, it produces an identical `roll-seeds.html` from `wordlists/*.txt` (verify with a hash to confirm no unexpected changes).

## Deploy (static hosting)

The app is a **single HTML file**, so any static host can serve it:

```bash
# Prepare a deploy folder (copy roll-seeds.html to index.html / 404.html)
mkdir -p dist && cp roll-seeds.html dist/index.html && cp roll-seeds.html dist/404.html
```

- **Netlify Drop (easiest, no CLI)**: open <https://app.netlify.com/drop> and drag the `dist/` folder in — you get a public URL instantly.
- **Cloudflare Pages**: Dashboard → Workers & Pages → Create → direct-upload `dist/`.
- **Vercel**: `npx vercel` (login required on first use).
- After deploying, still remind users: **for real use, download the single file and run it fully offline.**

## Files

| File | Description |
|---|---|
| `roll-seeds.html` | **Deliverable**: self-contained offline single-file app (Figma-designed UI; Inter / JetBrains Mono fonts and coin art embedded as data URIs, zero runtime networking) |
| `build.js` | Build: injects `wordlists/*.txt` into `roll-seeds.html` (idempotent) |
| `wordlists/*.txt` | 10 BIP39 wordlists (official sources) |
| `test.js` | Syntax / SHA-256 vectors / official BIP39 vectors / wordlist integrity |
| `e2e.js` | jsdom end-to-end UI tests (defaults, image input, parity, final word, languages, warning levels, 24 words) |

> UI design source: Figma `roll-seeds` (`sndzvJtBhCCCaFCLxDvEPG`). Fonts are OFL-licensed (Inter / JetBrains Mono), embedded as latin subsets only; CJK wordlists fall back to system fonts.
