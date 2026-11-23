// Real Chrome renders: desktop 1280px + phone 390px, library and a full
// recorded trial replay. Run: node scripts/shots.mjs — writes screenshots/*.png
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const CHROME = '/opt/meta-chromium/chrome';
const DEBUG_PORT = 9239; // unique to this project: sibling agents share this VM

function chromeArgs(firstUrl) {
  const policy = 'hatch-webgl-allowed-domains-v1\nexample.com\n';
  const file = path.join(os.tmpdir(), 'courtroom-webgl-policy.txt');
  fs.writeFileSync(file, policy);
  const sha = createHash('sha256').update(policy).digest('hex');
  return [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'courtroom-chrome-'))}`,
    `--hatch-webgl-allowed-domains-file=${file}`,
    `--hatch-webgl-allowed-domains-sha256=${sha}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1280,900',
    firstUrl,
  ];
}

const pageUrl = (page) => `file://${ROOT}/${page}`;

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }
  async call(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const done = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return done;
  }
  async waitForEvent(method, timeoutMs = 30000) {
    const start = Date.now();
    for (;;) {
      const i = this.events.findIndex((e) => e.method === method);
      if (i >= 0) return this.events.splice(i, 1)[0];
      if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${method}`);
      await delay(100);
    }
  }
  async evaluate(expression) {
    const res = await this.call('Runtime.evaluate', { expression, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  }
  close() { try { this.ws.close(); } catch (err) { /* already closed */ } }
}

const SHOTS = [
  { name: 'library-1280.png', width: 1280, url: 'index.html', waitMs: 2000 },
  { name: 'trial-1280.png', width: 1280, url: 'index.html', hash: 'case=coa-2026-001&autoplay=1', waitMs: 12000 },
  { name: 'library-390.png', width: 390, url: 'index.html', waitMs: 2000 },
  { name: 'trial-390.png', width: 390, url: 'index.html', hash: 'case=coa-2026-001&autoplay=1', waitMs: 12000 },
];

async function main() {
  fs.mkdirSync(path.join(ROOT, 'screenshots'), { recursive: true });
  const chrome = spawn(CHROME, chromeArgs(pageUrl(SHOTS[0].url)));
  try {
    let wsUrl = null;
    for (let i = 0; i < 150; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const targets = await res.json();
        // Match our own page by URL: other agents' Chromes share this VM
        // and a first-page match can land on their tab.
        const page = targets.find((t) => t.type === 'page' && t.url.includes('courtroom-of-agents'));
        if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
      } catch (err) { /* not up yet */ }
      await delay(200);
    }
    console.log('devtools:', wsUrl ? 'up' : 'NOT UP');
    if (!wsUrl) throw new Error('Chrome DevTools did not come up');
    const cdp = new Cdp(wsUrl);
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    for (const shot of SHOTS) {
      console.log('shot start:', shot.name);
      await cdp.call('Emulation.setDeviceMetricsOverride', {
        width: shot.width, height: 844, deviceScaleFactor: 1, mobile: shot.width < 600,
      });
      console.log('shot metrics set:', shot.name);
      await cdp.call('Page.navigate', { url: pageUrl(shot.url) });
      console.log('shot navigated:', shot.name);
      await cdp.waitForEvent('Page.loadEventFired');
      console.log('shot loaded:', shot.name);
      if (shot.hash) {
        // file:// query strings do not navigate, so the deep link is a hash;
        // set it and reload so the app reads it at startup.
        console.log('shot setting hash:', shot.name);
        await cdp.evaluate(`location.hash = ${JSON.stringify(shot.hash)}; location.reload();`);
        console.log('shot reloaded:', shot.name);
        await cdp.waitForEvent('Page.loadEventFired');
        console.log('shot reloaded+loaded:', shot.name);
      }
      await delay(shot.waitMs);
      // Verify this is still our page before capturing: another agent's
      // Chrome work on this shared VM has hijacked a shot before.
      const href = await cdp.evaluate(`location.href`);
      if (!String(href).includes('courtroom-of-agents')) {
        console.log('WRONG PAGE for', shot.name, '->', href, '; re-navigating once');
        await cdp.call('Page.navigate', { url: pageUrl(shot.url) });
        await cdp.waitForEvent('Page.loadEventFired');
        if (shot.hash) {
          await cdp.evaluate(`location.hash = ${JSON.stringify(shot.hash)}; location.reload();`);
          await cdp.waitForEvent('Page.loadEventFired');
        }
        await delay(shot.waitMs);
      }
      const overflow = await cdp.evaluate(
        `JSON.stringify({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth, turns: document.querySelectorAll('.turn').length, verdict: (document.getElementById('verdict-body') || {}).hidden === false })`,
      );
      const { data } = await cdp.call('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
      });
      fs.writeFileSync(path.join(ROOT, 'screenshots', shot.name), Buffer.from(data, 'base64'));
      console.log('wrote', shot.name, overflow);
    }
    cdp.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
