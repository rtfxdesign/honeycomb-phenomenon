// Screenshots over the DevTools protocol: a headless Chrome, one page, a list
// of shots. Each shot is a URL (or a continuation of the last one), a viewport,
// an optional script to run first, a wait, and a file. Output is PNG at 2x.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2];
const PORT = 9333;
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, "_profile");
fs.rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--window-size=1440,900", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pageWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error("Chrome did not come up");
}

const ws = new WebSocket(await pageWs());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
  else if (msg.method) events.push(msg);
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;

await send("Page.enable");
await send("Runtime.enable");

async function viewport(width, height, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile, screenWidth: width, screenHeight: height });
  if (mobile) await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
}
async function goto(url) {
  events.length = 0;
  await send("Page.navigate", { url });
  for (let i = 0; i < 120; i++) { if (events.some((e) => e.method === "Page.loadEventFired")) return; await sleep(100); }
}
async function shot(file) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
  console.log("shot", file);
}

const plan = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
for (const step of plan) {
  if (step.viewport) await viewport(step.viewport[0], step.viewport[1], Boolean(step.mobile));
  if (step.url) await goto(step.url);
  if (step.run) { const r = await evaluate(step.run); if (step.log) console.log("  run ->", JSON.stringify(r)); }
  if (step.wait) await sleep(step.wait);
  if (step.file) await shot(step.file);
}
ws.close();
chrome.kill();
fs.rmSync(profile, { recursive: true, force: true });
console.log("done");
