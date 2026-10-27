// Share cards (Open Graph, 1200×630) for the gates: public/og.png for the
// main gate, and public/og-<slug>.png for each partner gate in
// app/lib/partners.js. Each card is a small HTML page drawn here and
// photographed by headless Chrome, so the cards use the site's own fonts,
// logos and colours and can be redrawn after any change:
//
//   node scripts/og-cards.mjs
//
// The comb on each card is the gate's ground (lib/honeycomb-hover.js) caught
// mid-assembly: settled edges, a few still arriving, honey at the joins.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const asset = (p) => pathToFileURL(path.join(PUB, p)).href;

// the comb mark's sixteen cells (HoneycombApp.jsx COMB_CELLS), 180×150 each
const MARK = [[115, 250], [115, 400], [250, 325], [250, 475], [385, 100], [385, 250], [385, 400], [520, 175], [520, 325],
  [655, 100], [655, 250], [655, 400], [790, 175], [790, 325], [790, 475], [925, 250]];
const markSvg = (stroke) => `<svg viewBox="0 0 1040 575" width="100%"><g fill="none" stroke="${stroke}" stroke-width="11" stroke-linejoin="round">${
  MARK.map(([x, y]) => { const r = 90, h = r * 0.8333; return `<polygon points="${x + r},${y} ${x + r / 2},${y + h} ${x - r / 2},${y + h} ${x - r},${y} ${x - r / 2},${y - h} ${x + r / 2},${y - h}"/>`; }).join("")
}</g></svg>`;

// A deterministic comb, flat-topped like the effect's, built at the card's
// left and right edges and kept off the middle, where the words are.
function comb({ color, glow, honey, seed }) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const R = 62, SQ = Math.sqrt(3), lines = [], moving = [], dots = [], fills = [];
  const pos = (q, r) => [R * 1.5 * q, R * SQ * (r + q / 2)];
  const vert = (x, y, k) => [x + R * Math.cos((Math.PI / 3) * k), y + R * Math.sin((Math.PI / 3) * k)];
  for (let q = -1; q <= 14; q++) for (let r = -8; r <= 8; r++) {
    const [x, y] = pos(q, r);
    if (y < -R || y > 630 + R) continue;
    const edge = Math.min(x, 1200 - x);            // distance from the nearer side
    const p = edge < 120 ? 0.92 : edge < 230 ? 0.6 : edge < 300 ? 0.18 : 0;
    if (rnd() > p) continue;
    const start = Math.floor(rnd() * 6), built = rnd() < 0.75 ? 6 : 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < built; i++) {
      const k = (start + i) % 6, a = vert(x, y, k), b = vert(x, y, k + 1);
      lines.push([a, b]);
      if (rnd() < 0.12) dots.push(a);
    }
    if (built < 6 && rnd() < 0.8) {               // an edge still flying in from depth
      const k = (start + built) % 6, a = vert(x, y, k), b = vert(x, y, k + 1), d = 10 + rnd() * 26, t = (rnd() - 0.5) * 0.6;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, rot = (P) => [mx + (P[0] - mx) * Math.cos(t) - (P[1] - my) * Math.sin(t) + d, my + (P[0] - mx) * Math.sin(t) + (P[1] - my) * Math.cos(t) - d];
      moving.push([rot(a), rot(b)]);
    }
    if (built === 6 && rnd() < 0.12) fills.push([x, y]);
  }
  const seg = ([a, b]) => `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  const still = lines.map(seg).join(""), fly = moving.map(seg).join("");
  const hex = ([x, y]) => [0, 1, 2, 3, 4, 5].map((k) => vert(x, y, k).map((v) => v.toFixed(1)).join(",")).join(" ");
  return `<svg class="comb" viewBox="0 0 1200 630" width="1200" height="630">
    <defs><filter id="g" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>
      <radialGradient id="fade" cx="50%" cy="50%" r="60%"><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".0"/></radialGradient></defs>
    ${fills.map((c) => `<polygon points="${hex(c)}" fill="${honey}" opacity=".14"/>`).join("")}
    <path d="${still}" stroke="${glow}" stroke-width="9" opacity=".22" fill="none" stroke-linecap="round" filter="url(#g)"/>
    <path d="${still}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="${fly}" stroke="${glow}" stroke-width="10" opacity=".16" fill="none" stroke-linecap="round" filter="url(#g)"/>
    <path d="${fly}" stroke="${color}" stroke-width="2.6" opacity=".55" fill="none" stroke-linecap="round"/>
    ${dots.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="${honey}" opacity=".28"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${honey}"/>`).join("")}
  </svg>`;
}

const FONTS = `
@font-face{font-family:'Lora';font-style:normal;font-weight:400 700;src:url(${asset("fonts/lora-normal-400-700.woff2")}) format('woff2')}
@font-face{font-family:'Lora';font-style:italic;font-weight:400 700;src:url(${asset("fonts/lora-italic-400-700.woff2")}) format('woff2')}
@font-face{font-family:'Montserrat';font-weight:400 700;src:url(${asset("fonts/montserrat-normal-400-700.woff2")}) format('woff2')}
@font-face{font-family:'Public Sans';font-weight:400 700;src:url(${asset("fonts/public-sans-normal-400-700.woff2")}) format('woff2')}
@font-face{font-family:'Nunito';font-weight:400 700;src:url(${asset("fonts/nunito-normal-400-700.woff2")}) format('woff2')}
@font-face{font-family:'Source Serif 4';font-style:normal;font-weight:400 700;src:url(${asset("fonts/source-serif-4-normal-400-700.woff2")}) format('woff2')}
@font-face{font-family:'Source Serif 4';font-style:italic;font-weight:400 700;src:url(${asset("fonts/source-serif-4-italic-400-700.woff2")}) format('woff2')}`;

const page = ({ ground, combOpts, top, title, sub, foot, css }) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0}html,body{width:1200px;height:630px;overflow:hidden}
body{position:relative;background:${ground};-webkit-font-smoothing:antialiased}
.comb{position:absolute;inset:0;opacity:.7;-webkit-mask-image:linear-gradient(90deg,#000 0,#000 17%,rgba(0,0,0,.28) 29%,rgba(0,0,0,.28) 71%,#000 83%,#000 100%)}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 250px}
.wm{font:600 17px/1 'Montserrat',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#f2bf49;white-space:nowrap}
.lock{display:flex;align-items:center;gap:22px}.x{font:400 24px/1 'Montserrat',sans-serif;color:var(--muted)}
h1{margin-top:38px;font-size:70px;line-height:1.05;letter-spacing:-.015em;white-space:nowrap}
p{margin-top:22px;font-size:23px;line-height:1.45;color:var(--body);max-width:640px;text-wrap:balance}
.foot{position:absolute;left:0;right:0;bottom:44px;text-align:center;font:600 13px/1 'Montserrat',sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--muted)}
${css}</style></head><body>${comb(combOpts)}<div class="c">${top}<h1>${title}</h1><p>${sub}</p></div><div class="foot">${foot}</div></body></html>`;

const cards = [
  {
    file: "og.png",
    html: page({
      ground: "radial-gradient(60% 75% at 50% 45%,#2a1606 0%,#0d0704 55%,#000 100%)",
      combOpts: { color: "#f2bf49", glow: "#fc9226", honey: "#f7d27a", seed: 11 },
      top: `<div style="width:260px">${markSvg("#E3A444")}</div>`,
      title: `Enter the <em>Honeycomb.</em>`,
      sub: "A living archive of the unexplained, shared by invitation.",
      foot: "Your experience · Our collective history",
      css: `:root{--body:#cbb58e;--muted:#a08a66}h1{font-family:'Lora',serif;font-weight:500;color:#f4ead4}h1 em{color:#e3a444}p{font-family:'Lora',serif}`,
    }),
  },
  {
    file: "og-rice.png",
    html: page({
      ground: "radial-gradient(70% 75% at 50% 45%,#1f2b6e 0%,#0d1645 55%,#060b26 100%)",
      combOpts: { color: "#f6c924", glow: "#3f5bd1", honey: "#fff1b0", seed: 23 },
      top: `<div class="lock"><span class="wm">Project Honeycomb</span><span class="x">×</span><div style="background:#fff;padding:12px 16px;border-radius:3px;box-shadow:0 18px 50px rgba(0,0,0,.45)"><img src="${asset("partners/rice-woodson-center-for-the-impossible.jpg")}" style="display:block;width:300px"></div></div>`,
      title: `Welcome to the <em>Honeycomb.</em>`,
      sub: "A private entrance for the Archives of the Impossible at Rice University.",
      foot: "Shared by invitation",
      css: `:root{--body:#ccd2e6;--muted:#9aa3c4}h1{font-family:'Public Sans',sans-serif;font-weight:700;letter-spacing:-.02em;color:#fff}h1 em{font-style:normal;color:#f6c924}p{font-family:'Public Sans',sans-serif}.foot{font-family:'Public Sans',sans-serif}`,
    }),
  },
  {
    file: "og-john-mack.png",
    html: page({
      ground: "radial-gradient(70% 75% at 50% 45%,#2c1052 0%,#14072d 55%,#07020f 100%)",
      combOpts: { color: "#c39bff", glow: "#7f37ba", honey: "#efe3ff", seed: 37 },
      top: `<div class="lock"><span class="wm">Project Honeycomb</span><span class="x">×</span><img src="${asset("partners/john-mack-institute.png")}" style="display:block;width:330px"></div>`,
      title: `Welcome to the <em>Honeycomb.</em>`,
      sub: "A private entrance for the John E. Mack Institute.",
      foot: "Shared by invitation",
      css: `:root{--body:#d8cfe8;--muted:#a99bc2}h1{font-family:'Source Serif 4',serif;font-weight:500;color:#f7f2ff}h1 em{color:#c9a6ff}p{font-family:'Nunito',sans-serif}.foot{font-family:'Nunito',sans-serif}`,
    }),
  },
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hc-og-"));
for (const card of cards) {
  const html = path.join(tmp, card.file.replace(/\.png$/, ".html"));
  fs.writeFileSync(html, card.html);
  const out = path.join(PUB, card.file);
  const r = spawnSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    "--force-device-scale-factor=1", "--virtual-time-budget=3000", "--window-size=1200,630",
    `--user-data-dir=${path.join(tmp, "profile")}`, `--screenshot=${out}`, pathToFileURL(html).href], { stdio: "pipe" });
  if (r.status !== 0 || !fs.existsSync(out)) throw new Error(`Chrome failed on ${card.file}: ${r.stderr}`);
  console.log("wrote", path.relative(ROOT, out));
}
fs.rmSync(tmp, { recursive: true, force: true });
