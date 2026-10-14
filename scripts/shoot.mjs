// Captures amb Chrome sense finestra, per CDP i sense dependències (Node 22 porta WebSocket).
// Serveix per mirar la web quan el panell del navegador està amagat i les animacions queden congelades.
//
// Ús: node scripts/shoot.mjs <url> <prefix-de-sortida> <ample>x<alt> <pas> [<pas>…]
//   top | p:<id>:<0-1> (progrés dins l'escena [data-track] de #id) | id:<id> | y:<px> → es col·loca i fa captura
//   click:<selector> | drag:<selector>|<de 0-1>|<a 0-1> | key:<tecla> | type:<text> | wait:<ms>
//   js:<expressió> (n'escriu el resultat) | shot:<nom> (captura tal com està)
// Variables: CHROME_PATH, REDUCED=1 (moviment reduït), NOWEBGL=1, SETTLE i WAIT (ms), QUALITY.
// Al final llista errors i avisos de consola i les peticions fallides.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, prefix, sizeArg, ...steps] = process.argv.slice(2);
const [width, height] = sizeArg.split('x').map(Number);
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'arenda-chrome-'));
const chrome = spawn(
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--enable-unsafe-swiftshader',
    ...(process.env.NOWEBGL ? ['--disable-3d-apis'] : []),
    '--disable-features=Translate',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function target() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((entry) => entry.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome no ha arrencat');
}

const ws = new WebSocket(await target());
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let nextId = 0;
const pending = new Map();
const problems = [];
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
    return;
  }
  const { method, params } = message;
  if (method === 'Runtime.exceptionThrown') problems.push(`EXCEPTION ${params.exceptionDetails.exception?.description ?? params.exceptionDetails.text}`);
  if (method === 'Runtime.consoleAPICalled' && (params.type === 'error' || params.type === 'warning'))
    problems.push(`CONSOLE.${params.type} ${params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 400)}`);
  if (method === 'Log.entryAdded' && (params.entry.level === 'error' || params.entry.level === 'warning')) problems.push(`LOG.${params.entry.level} ${params.entry.text.slice(0, 300)} ${params.entry.url ?? ''}`);
  if (method === 'Network.loadingFailed' && !params.canceled) problems.push(`NET.failed ${params.errorText} ${params.requestId}`);
  if (method === 'Network.responseReceived' && params.response.status >= 400) problems.push(`NET.${params.response.status} ${params.response.url}`);
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (reply.result?.exceptionDetails) problems.push(`EVAL ${reply.result.exceptionDetails.exception?.description}`);
  return reply.result?.result?.value;
};

for (const domain of ['Page', 'Runtime', 'Log', 'Network']) await send(`${domain}.enable`);
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
if (process.env.REDUCED) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
if (width < 700) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.navigate', { url });
await sleep(Number(process.env.SETTLE ?? 4500));

for (const step of steps) {
  const [kind, ...rest] = step.split(':');
  const value = rest.join(':');
  let name = step.replace(/[^a-z0-9.]+/gi, '-');
  if (kind === 'top') await evaluate('window.scrollTo({top: 0, behavior: "instant"})');
  if (kind === 'p') {
    const [id, amount] = value.split(':');
    await evaluate(
      `(() => { const s = document.querySelector('#${id}[data-track], #${id} [data-track]'); const top = s.getBoundingClientRect().top + scrollY; window.scrollTo({ top: top + ${Number(amount)} * (s.offsetHeight - innerHeight), behavior: 'instant' }); })()`,
    );
  }
  if (kind === 'id') await evaluate(`document.getElementById(${JSON.stringify(value)}).scrollIntoView({ behavior: 'instant', block: 'start' })`);
  if (kind === 'y') await evaluate(`window.scrollTo({ top: ${Number(value)}, behavior: 'instant' })`);
  if (kind === 'js') {
    console.log('js →', JSON.stringify(await evaluate(value)));
    continue;
  }
  if (kind === 'click' || kind === 'drag') {
    const [selector, from = '0.5', to = '0.5'] = kind === 'drag' ? value.split('|') : [value];
    const box = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
    if (!box) { problems.push(`MISSING ${selector}`); continue; }
    await sleep(250);
    const y = box[1] + box[3] / 2;
    const x0 = box[0] + box[2] * Number(from);
    const x1 = box[0] + box[2] * Number(to);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y, button: 'left', clickCount: 1 });
    if (kind === 'drag') for (let i = 1; i <= 8; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + ((x1 - x0) * i) / 8, y, button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y, button: 'left', clickCount: 1 });
    await sleep(350);
    continue;
  }
  if (kind === 'key') {
    const code = { Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37, Tab: 9 }[value];
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code: value, windowsVirtualKeyCode: code });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code: value, windowsVirtualKeyCode: code });
    await sleep(300);
    continue;
  }
  if (kind === 'type') {
    await send('Input.insertText', { text: value });
    await sleep(150);
    continue;
  }
  if (kind === 'wait') {
    await sleep(Number(value));
    continue;
  }
  if (kind === 'shot') name = value;
  await sleep(Number(process.env.WAIT ?? 2600));
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: Number(process.env.QUALITY ?? 72) });
  const file = `${prefix}-${name}.jpg`;
  writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  console.log('shot', file);
}

const info = await evaluate(
  `JSON.stringify({ scrollHeight: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - innerWidth, canvas: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })(), webgl: (() => { try { const g = document.createElement('canvas').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl2'; } catch (error) { return String(error); } })() })`,
);
console.log('info', info);
console.log(problems.length ? `PROBLEMS (${problems.length}):\n` + [...new Set(problems)].join('\n') : 'no console errors, no failed requests');
ws.close();
chrome.kill();
process.exit(0);
