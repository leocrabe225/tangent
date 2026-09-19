// Work sessions: a task with an end time. Until then the session can't just be switched off:
// quitting early takes a reason Jev accepts, a cooldown, then retyping a silly sentence.
// A heartbeat notices when Tangent was off during a session (disabled, or site access
// restricted) and keeps a record of it.
//
// Starting a session with the same task as a recent one resumes it: same id (so accepted
// excuses still apply) and the same bypass record, over as many days as it takes.
import { askJev } from './jev.js';
import { pick } from './messages.js';

const QUIT_ACCEPT = 0.5;
const COOLDOWN_MS = 60 * 1000;
const CONFIRM_WINDOW_MS = 5 * 60 * 1000; // after the cooldown, then the request expires
const MIN_SESSION_MS = 60 * 1000;
const RECENT_MAX = 5;
const BEAT_MINUTES = 1;
// Longer than a missed beat or two. A gap only counts as a bypass if pages were visited during
// it (from local history), so a closed laptop or a closed Chrome doesn't.
const GAP_MS = 3 * 60 * 1000;

export async function getSession() {
  const s = await chrome.storage.local.get(['enabled', 'task', 'sessionId', 'sessionEnd', 'sessions', 'quit']);
  const now = Date.now();
  const active = !!s.enabled && now < (s.sessionEnd ?? 0);
  const sessions = s.sessions ?? {};
  return {
    active,
    task: s.task ?? '',
    sessionEnd: s.sessionEnd,
    shame: active ? describeBypasses(sessions[s.sessionId]?.bypasses ?? []) : '',
    quit: active ? quitPhase(s.quit, now) : null,
    recent: Object.values(sessions).sort((a, b) => b.lastUsed - a.lastUsed).map(({ task, lastUsed }) => ({ task, lastUsed })),
  };
}

// The sentence to retype is only revealed once the cooldown is over.
function quitPhase(quit, now) {
  if (!quit) return null;
  const cooldownEndsAt = quit.approvedAt + COOLDOWN_MS;
  const expiresAt = cooldownEndsAt + CONFIRM_WINDOW_MS;
  if (now < cooldownEndsAt) return { phase: 'cooldown', cooldownEndsAt };
  if (now < expiresAt) return { phase: 'confirm', phrase: quit.phrase, expiresAt };
  return null;
}

export async function startSession({ task, end }) {
  task = task.trim();
  if (!task) throw new Error('Say what you are working on first.');
  if ((await getSession()).active) throw new Error('A session is already running.');
  if (!(end >= Date.now() + MIN_SESSION_MS)) throw new Error('Pick an end time in the future.');
  // Without a key every call to Jev fails, and failures let pages through.
  const { jevApiKey, sessions = {} } = await chrome.storage.local.get(['jevApiKey', 'sessions']);
  if (!jevApiKey) throw new Error('Add your TypeSafe API key first (Jev, at the bottom).');

  const id = Object.keys(sessions).find((k) => sameTask(sessions[k].task, task)) ?? crypto.randomUUID();
  task = sessions[id]?.task ?? task; // a resumed session keeps its original wording
  sessions[id] = { bypasses: [], siteAccessFlagged: false, ...sessions[id], task, lastUsed: Date.now() };
  for (const old of Object.keys(sessions).sort((a, b) => sessions[b].lastUsed - sessions[a].lastUsed).slice(RECENT_MAX)) {
    delete sessions[old];
  }
  // lastBeat restarts now: time between sessions (overnight, say) is never a bypass.
  await chrome.storage.local.set({ task, sessionEnd: end, sessionId: id, sessions, lastBeat: Date.now(), quit: null, enabled: true });
  await scheduleAlarms(end);
  return getSession();
}

// Tasks that normalize the same are the same session and share cached verdicts.
export function normalizeTask(task) {
  return task.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function sameTask(a, b) {
  return normalizeTask(a) === normalizeTask(b);
}

export async function requestQuit({ reason }) {
  const s = await getSession();
  if (!s.active) throw new Error('No session running.');
  if (s.quit) return { accepted: true }; // already approved; the popup shows where it's at
  reason = reason.trim();
  if (!reason) throw new Error(pick('emptyReason'));
  const minutesLeft = Math.ceil((s.sessionEnd - Date.now()) / 60000);
  const p = await askJev({
    task: s.task,
    facts: [`Minutes left in the planned session: ${minutesLeft}`, `Reason given for stopping early: ${reason}`],
    question: 'quit',
  });
  const accepted = p >= QUIT_ACCEPT;
  if (accepted) await chrome.storage.local.set({ quit: { approvedAt: Date.now(), phrase: makePhrase(s.task, minutesLeft) } });
  return { p, accepted };
}

export async function confirmQuit({ text }) {
  const { quit } = await chrome.storage.local.get('quit');
  if (!quit) throw new Error('Ask Jev first.');
  const phase = (await getSession()).quit;
  if (phase?.phase === 'cooldown') throw new Error('The cooldown isn\'t over.');
  if (phase?.phase !== 'confirm') {
    await chrome.storage.local.set({ quit: null });
    throw new Error(pick('expired'));
  }
  if (normalizeTask(text) !== normalizeTask(quit.phrase)) return { ok: false };
  await endSession();
  return { ok: true };
}

async function endSession() {
  await chrome.alarms.clear('heartbeat');
  await chrome.alarms.clear('session-end');
  await chrome.storage.local.set({ enabled: false, quit: null });
}

// Runs whenever the worker starts: re-arms alarms (they may not survive a disable) and
// checks for a gap in the heartbeat.
export async function resumeSession() {
  const { enabled, sessionEnd } = await chrome.storage.local.get(['enabled', 'sessionEnd']);
  if (!enabled) return;
  if (Date.now() < sessionEnd && !(await chrome.alarms.get('heartbeat'))) await scheduleAlarms(sessionEnd);
  await checkHeartbeat();
}

// At 'session-end', the check records any last gap, then ends the session.
export async function onAlarm(alarm) {
  if (alarm.name === 'heartbeat' || alarm.name === 'session-end') await checkHeartbeat();
}

async function scheduleAlarms(end) {
  await chrome.alarms.create('heartbeat', { periodInMinutes: BEAT_MINUTES });
  await chrome.alarms.create('session-end', { when: end });
}

let heartbeatCheck = null;
function checkHeartbeat() {
  // A worker start and an alarm can arrive together; don't record the same gap twice.
  return (heartbeatCheck ??= doCheckHeartbeat().finally(() => { heartbeatCheck = null; }));
}

async function doCheckHeartbeat() {
  const s = await chrome.storage.local.get(['enabled', 'sessionEnd', 'lastBeat', 'sessionId', 'sessions']);
  if (!s.enabled) return;
  const now = Date.now();
  const sessions = s.sessions ?? {};
  const record = (sessions[s.sessionId] ??= { task: '', lastUsed: now, bypasses: [], siteAccessFlagged: false });
  const bypasses = record.bypasses;

  if (s.lastBeat && now - s.lastBeat > GAP_MS) {
    const end = Math.min(now, s.sessionEnd);
    const visits = await chrome.history.search({ text: '', startTime: s.lastBeat, endTime: end, maxResults: 10000 });
    const pages = visits.filter((v) => /^https?:/.test(v.url));
    if (pages.length) {
      bypasses.push({ kind: 'off', minutes: Math.round((end - s.lastBeat) / 60000), pages: pages.length, topSite: topSite(pages) });
    }
  }
  // Restricting site access keeps the extension "on" but blind.
  if (!record.siteAccessFlagged && !(await chrome.permissions.contains({ origins: ['https://*/*'] }))) {
    bypasses.push({ kind: 'site-access' });
    record.siteAccessFlagged = true;
  }
  await chrome.storage.local.set({ lastBeat: now, sessions });
  if (!(now < s.sessionEnd)) await endSession(); // also closes a session with no end time
}

function topSite(pages) {
  const counts = new Map();
  for (const { url } of pages) {
    const host = new URL(url).hostname.replace(/^www\./, '');
    counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

// Seeded by the number of bypasses: the line stays put until there's something new to say.
function describeBypasses(bypasses) {
  const off = bypasses.filter((b) => b.kind === 'off');
  const lines = [];
  if (off.length) {
    const worst = off.reduce((a, b) => (b.pages > a.pages ? b : a));
    lines.push(pick('bypassOff', {
      times: off.length === 1 ? 'once' : `${off.length} times`,
      minutes: off.reduce((n, b) => n + b.minutes, 0),
      pages: off.reduce((n, b) => n + b.pages, 0),
      site: worst.topSite,
    }, bypasses.length));
  }
  if (bypasses.some((b) => b.kind === 'site-access')) lines.push(pick('siteAccess', {}, bypasses.length));
  return lines.join(' ');
}

function makePhrase(task, minutesLeft) {
  const shortTask = task.length > 40 ? `${task.slice(0, 37).trimEnd()}...` : task;
  const duration = minutesLeft === 1 ? '1 minute' : `${minutesLeft} minutes`;
  return pick('quitPhrase', { task: shortTask, duration, minutes: minutesLeft });
}
