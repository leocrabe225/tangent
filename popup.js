import { sameTask } from './session.js';
import { pick, percent } from './messages.js';

const $ = (id) => document.getElementById(id);

// Session changes go through the worker, which enforces the rules; the popup only displays.
async function send(type, data = {}) {
  const res = await chrome.runtime.sendMessage({ type, ...data });
  if (res?.error) throw new Error(res.error.replace(/^Error: /, ''));
  return res;
}

let session = null;
let wantsToQuit = false;
let rendering = false;

async function render() {
  if (rendering) return;
  rendering = true;
  try {
    session = await send('session');
    const all = await chrome.storage.local.get(null);
    const q = session.quit;

    $('idle').hidden = session.active;
    $('active').hidden = !session.active;
    if (session.active) {
      $('activeTask').textContent = session.task;
      $('shame').textContent = session.shame;
    } else {
      wantsToQuit = false;
      if (!$('until').value) $('until').value = defaultUntil();
      renderRecent();
    }
    $('quit').hidden = wantsToQuit || !!q;
    $('askStep').hidden = !(wantsToQuit && !q);
    // New line each time a step appears, not on every render.
    showStep('cooldownStep', q?.phase === 'cooldown', () => { $('cooldownText').textContent = pick('quitCooldown'); });
    showStep('confirmStep', q?.phase === 'confirm', () => { $('sentenceIntro').textContent = pick('quitSentenceIntro'); });
    if (q?.phase === 'confirm' && $('phrase').textContent !== q.phrase) {
      $('phrase').textContent = q.phrase;
      $('phraseInput').value = '';
      $('phraseInput').focus();
    }

    // A bad key makes Jev fail, and failures let pages through: no key changes mid-session.
    $('apiKey').value = all.jevApiKey || '';
    $('apiKey').hidden = session.active;
    $('keyLocked').hidden = !session.active;
    $('mode').textContent = all.jevApiKey ? 'Jev: ready' : 'Jev: add your API key';
    $('jevBox').open ||= !all.jevApiKey;
    $('stats').textContent = `${Object.keys(all).filter((k) => k.startsWith('v:')).length} pages judged`;
    tick();
  } finally {
    rendering = false;
  }
}

function tick() {
  if (!session?.active) return;
  const now = Date.now();
  const q = session.quit;
  if (now >= session.sessionEnd || (q?.phase === 'cooldown' && now >= q.cooldownEndsAt) || (q?.phase === 'confirm' && now >= q.expiresAt)) {
    render();
    return;
  }
  $('remaining').textContent = `until ${formatClock(session.sessionEnd)} · ${formatDuration(session.sessionEnd - now)} left`;
  if (q?.phase === 'cooldown') {
    const s = Math.ceil((q.cooldownEndsAt - now) / 1000);
    $('countdown').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
}

function showStep(id, visible, onShow) {
  if (visible && $(id).hidden) onShow();
  $(id).hidden = !visible;
}

function renderRecent() {
  const recent = session.recent;
  $('recentBox').hidden = !recent.length;
  $('recent').replaceChildren(...recent.map(({ task, lastUsed }) => {
    const button = document.createElement('button');
    const name = Object.assign(document.createElement('span'), { className: 'name', textContent: task, title: task });
    const when = Object.assign(document.createElement('span'), { className: 'when', textContent: formatAgo(lastUsed) });
    button.append(name, when);
    button.addEventListener('click', () => {
      $('task').value = task;
      updateStartLabel();
    });
    return button;
  }));
  updateStartLabel();
}

// Starting with the task of a recent session resumes it (see session.js).
function updateStartLabel() {
  const match = session?.recent.find((r) => sameTask(r.task, $('task').value));
  $('start').textContent = match ? 'Resume' : 'Start working';
  for (const button of $('recent').children) {
    button.classList.toggle('selected', !!match && button.querySelector('.name').textContent === match.task);
  }
}

async function run(action) {
  $('error').textContent = '';
  try {
    await action();
  } catch (err) {
    $('error').textContent = err.message;
    render();
  }
}

$('start').addEventListener('click', () => run(async () => {
  await send('start-session', { task: $('task').value, end: parseUntil($('until').value) });
  await render();
}));
$('task').addEventListener('input', updateStartLabel);
$('task').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('start').click(); }
});

$('quit').addEventListener('click', () => {
  wantsToQuit = true;
  render().then(() => $('reason').focus());
});
$('ask').addEventListener('click', () => run(async () => {
  $('askReply').textContent = pick('thinking');
  const { p, accepted } = await send('request-quit', { reason: $('reason').value });
  $('askReply').textContent = accepted ? '' : pick('quitRefused', { pct: percent(p) });
  if (accepted) await render();
}));

$('confirm').addEventListener('click', () => run(async () => {
  const { ok } = await send('confirm-quit', { text: $('phraseInput').value });
  $('confirmReply').textContent = ok ? '' : pick('typo');
  if (ok) await render();
}));
$('phraseInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('confirm').click();
});
for (const type of ['paste', 'drop']) {
  $('phraseInput').addEventListener(type, (e) => {
    e.preventDefault();
    $('confirmReply').textContent = pick('pasteAttempt');
  });
}
$('phrase').addEventListener('copy', (e) => e.preventDefault());

async function clearVerdicts() {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter((k) => k.startsWith('v:')));
}

// Verdicts cached under another key shouldn't outlive a key change.
$('apiKey').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ jevApiKey: e.target.value.trim() });
  await clearVerdicts();
  render();
});
$('clear').addEventListener('click', async () => {
  await clearVerdicts();
  render();
});

// Default end: an hour from now, rounded up to the quarter hour.
function defaultUntil() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// "HH:MM" today, or tomorrow if that time has already passed.
function parseUntil(value) {
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

function formatClock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAgo(ms) {
  const days = Math.floor((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);
  if (days === 0) return formatClock(ms);
  if (days === 1) return 'yesterday';
  return days < 7 ? `${days} days ago` : new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDuration(ms) {
  const minutes = Math.ceil(ms / 60000);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

setInterval(tick, 250);
render();
