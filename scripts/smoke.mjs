// Interactive smoke test over CDP: replay + objection + revision + brief.
// Run: node scripts/smoke.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const DEBUG_PORT = 9240;
const policy = 'hatch-webgl-allowed-domains-v1\nexample.com\n';
const policyFile = path.join(os.tmpdir(), 'courtroom-smoke-policy.txt');
fs.writeFileSync(policyFile, policy);
const sha = createHash('sha256').update(policy).digest('hex');
const chrome = spawn('/opt/meta-chromium/chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--allow-file-access-from-files',
  `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'courtroom-smoke-'))}`,
  `--hatch-webgl-allowed-domains-file=${policyFile}`,
  `--hatch-webgl-allowed-domains-sha256=${sha}`,
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--window-size=1280,900',
  `file://${ROOT}/index.html`,
]);

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) failures++;
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1; this.pending = new Map(); this.events = [];
    this.ready = new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
      } else if (msg.method) this.events.push(msg);
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
      if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for ' + method);
      await delay(100);
    }
  }
  async evaluate(expression) {
    const res = await this.call('Runtime.evaluate', { expression, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  }
  close() { try { this.ws.close(); } catch (e) { /* closed */ } }
}

async function main() {
  let wsUrl = null;
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.url.includes('courtroom-of-agents'));
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) { /* not up yet */ }
    await delay(200);
  }
  if (!wsUrl) throw new Error('DevTools did not come up');
  const cdp = new Cdp(wsUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');
  await cdp.waitForEvent('Page.loadEventFired');
  await delay(800);

  check('library shows 4 case cards', await cdp.evaluate(`document.querySelectorAll('.case-card').length === 4`));
  check('key status says replay only', await cdp.evaluate(`document.getElementById('key-label').textContent.includes('Replay only')`));

  // Open the first recorded case and play it.
  await cdp.evaluate(`document.querySelector('.case-card').click()`);
  await delay(500);
  check('trial view opens with the free-tier question', await cdp.evaluate(`document.getElementById('docket-question').textContent.includes('free tier')`));
  check('mode badge says recorded replay', await cdp.evaluate(`document.getElementById('docket-mode').textContent.includes('Recorded replay')`));
  await cdp.evaluate(`document.getElementById('play-btn').click()`);
  await delay(11500);
  check('replay finishes with 8 turns', await cdp.evaluate(`document.querySelectorAll('.turn').length === 8`));
  check('verdict shows Amend at 71%', await cdp.evaluate(`document.querySelector('.verdict-decision').textContent.toLowerCase() === 'amend' && document.getElementById('verdict-body').textContent.includes('71%')`));
  check('3 citations rendered', await cdp.evaluate(`document.querySelectorAll('.cite').length === 3`));
  check('export enabled after verdict', await cdp.evaluate(`!document.getElementById('export-btn').disabled`));
  check('trial saved to history', await cdp.evaluate(`JSON.parse(localStorage.getItem('coa.trials.v1') || '[]').length === 1`));

  // Citation jump: click the first citation, the turn gets the flash class.
  await cdp.evaluate(`document.querySelector('.cite').click()`);
  await delay(400);
  check('citation click highlights turn 1', await cdp.evaluate(`document.getElementById('turn-1').classList.contains('flash')`));

  // Objection after the verdict: recorded-case revision note appears.
  await cdp.evaluate(`document.getElementById('objection-input').value = 'Churn rose 8% last quarter'; document.getElementById('objection-btn').click()`);
  await delay(400);
  check('objection listed', await cdp.evaluate(`document.querySelectorAll('#objections-list li').length === 1`));
  check('revision note is honest about replays', await cdp.evaluate(`document.querySelector('.revision-note').textContent.includes('cannot re-rule without a live key')`));

  // Challenge on a replay: honest message, no fake re-ruling.
  await cdp.evaluate(`document.getElementById('challenge-input').value = 'You ignored the migration cost'; document.getElementById('challenge-btn').click()`);
  await delay(400);
  check('replay challenge explains it needs a key', await cdp.evaluate(`document.getElementById('challenge-result').textContent.includes('cannot re-rule') || document.getElementById('challenge-result').textContent.includes('Add a key')`));

  // New decision without a key: preparation brief, not a fake debate.
  await cdp.evaluate(`document.querySelector('[data-nav="new"]').click()`);
  await delay(300);
  await cdp.evaluate(`document.getElementById('q').value = 'Should we raise prices by 20%?'; document.getElementById('ctx').value = 'Churn is 4% a month.'; document.getElementById('new-case-form').dispatchEvent(new Event('submit', {cancelable: true}))`);
  await delay(400);
  check('no-key decision shows a brief, not a trial', await cdp.evaluate(`!document.getElementById('brief').hidden && document.getElementById('brief').textContent.includes('Preparation brief') && document.getElementById('brief').textContent.includes('not a trial')`));
  check('no live turns were invented', await cdp.evaluate(`document.querySelectorAll('.turn').length === 8`));

  // Settings: save a key, status flips to live; remove it, flips back.
  await cdp.evaluate(`document.querySelector('[data-nav="settings"]').click()`);
  await delay(300);
  await cdp.evaluate(`document.getElementById('api-key').value = 'AIza-test-key'; document.getElementById('save-key-btn').click()`);
  await delay(300);
  check('key saved to localStorage only', await cdp.evaluate(`JSON.parse(localStorage.getItem('coa.settings.v1')).key === 'AIza-test-key'`));
  check('status flips to live ready', await cdp.evaluate(`document.getElementById('key-label').textContent.includes('Live ready')`));
  await cdp.evaluate(`document.getElementById('remove-key-btn').click()`);
  await delay(300);
  check('key removed', await cdp.evaluate(`!JSON.parse(localStorage.getItem('coa.settings.v1')).key`));

  // History view lists the saved trial.
  await cdp.evaluate(`document.querySelector('[data-nav="history"]').click()`);
  await delay(300);
  check('history lists the free-tier trial', await cdp.evaluate(`document.getElementById('history-list').textContent.includes('free tier')`));

  cdp.close();
  console.log(failures === 0 ? 'SMOKE OK' : 'SMOKE FAILED: ' + failures + ' checks failed');
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => { console.error(err); process.exit(1); })
  .finally(() => { try { chrome.kill('SIGTERM'); } catch (e) { /* gone */ } });
