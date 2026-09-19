import { askJev } from './jev.js';
import { pick, percent } from './messages.js';
import { getSession, startSession, requestQuit, confirmQuit, resumeSession, onAlarm, normalizeTask } from './session.js';

const TTL_MS = 7 * 24 * 3600 * 1000;
const BLOCK_BELOW = 0.3;
const EXCUSE_ACCEPT = 0.5;
const EXCUSE_CONVINCED = 0.8;
const TRACKING_PARAMS = /^(utm_.*|fbclid|gclid|si|feature)$/;

const inflight = new Map();

// Storage holds the Jev API key, so keep it to extension pages and this worker. Content
// scripts run inside every web page's process; they get settings through messages instead.
chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch((err) => console.error('Tangent:', err));

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = {
    settings, judge, override, leave,
    session: getSession, 'start-session': startSession, 'request-quit': requestQuit, 'confirm-quit': confirmQuit,
  }[msg.type];
  if (!handler) return false;
  // On failure (no network, bad key, Jev down) the content script fails open: the page stays usable.
  handler(msg, sender).then(sendResponse, (err) => {
    console.warn('Tangent:', err);
    sendResponse({ error: String(err) });
  });
  return true;
});

chrome.runtime.onStartup.addListener(pruneCache);
chrome.runtime.onInstalled.addListener(pruneCache);
chrome.alarms.onAlarm.addListener(onAlarm);
resumeSession();

// A session started or ended: open tabs re-check their page.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !('enabled' in changes || 'task' in changes)) return;
  for (const tab of await chrome.tabs.query({})) {
    chrome.tabs.sendMessage(tab.id, { type: 'settings-changed' }).catch(() => {}); // tabs without the content script
  }
});

// "Back to work" on a page with nowhere to go back to (opened in a new tab): close the tab,
// unless it's the window's last one, which would close the window. Then open a new tab page.
async function leave(_msg, { tab }) {
  const siblings = await chrome.tabs.query({ windowId: tab.windowId });
  if (siblings.length > 1) await chrome.tabs.remove(tab.id);
  else await chrome.tabs.update(tab.id, { url: 'chrome://newtab/' });
  return {};
}

// What content scripts get to know: no key, no history.
async function settings() {
  const { active, task, shame } = await getSession();
  return { active, task, shame };
}

async function judge({ page }) {
  const { active, task } = await getSession();
  if (!active) return withAction({ p: 1 });

  const key = await cacheKey(page, task);
  const hit = await readCache(key);
  if (hit) return withAction(hit);

  if (!inflight.has(key)) {
    inflight.set(key, askAndStore(page, task, key).finally(() => inflight.delete(key)));
  }
  return withAction(await inflight.get(key));
}

// The cache keeps Jev's score, not the decision, so changing the threshold needs no cache reset.
function withAction(verdict) {
  const action = verdict.p < BLOCK_BELOW ? 'block' : 'allow';
  if (action === 'allow') return { ...verdict, action };
  return { ...verdict, action, headline: pick('blockHeadline'), thinking: pick('thinking') };
}

async function askAndStore(page, task, key) {
  if (page.videoId && !(page.videoTitle && page.channel)) {
    const meta = await oembed(page.videoId);
    page.videoTitle ||= meta.videoTitle;
    page.channel ||= meta.channel;
  }
  const p = await askJev({ task, facts: [`Page being visited:\n${describe(page)}`] });
  const verdict = { p, label: page.videoTitle || page.title || normalizeUrl(page.url), at: Date.now() };
  await chrome.storage.local.set({ [key]: verdict });
  return verdict;
}

// "This is actually work": Jev judges the excuse. If it's credible, the page is allowed
// for the rest of this work session (cached with the session id); otherwise it stays blocked.
// If Jev can't be reached, the page is let through this once (not cached).
async function override({ page, excuse }) {
  const { task = '', sessionId } = await chrome.storage.local.get(['task', 'sessionId']);
  let p;
  try {
    p = await askJev({
      task,
      facts: [`Page being visited:\n${describe(page)}`, `User's excuse for visiting it: ${excuse}`],
      question: 'excuse',
    });
  } catch (err) {
    console.warn('Tangent:', err);
    return { accepted: true, reply: pick('excuseUnreachable') };
  }
  const accepted = p >= EXCUSE_ACCEPT;
  if (accepted) {
    const key = await cacheKey(page, task);
    await chrome.storage.local.set({ [key]: { p: 1, source: 'override', session: sessionId, excuse, at: Date.now() } });
  }
  const tone = !accepted ? 'excuseRejected' : p > EXCUSE_CONVINCED ? 'excuseConvinced' : 'excuseGrudging';
  return { p, accepted, reply: pick(tone, { pct: percent(p) }) };
}

function describe(page) {
  if (page.videoId) {
    return [`YouTube video: ${page.videoTitle || '(unknown title)'}`, `Channel: ${page.channel || '(unknown)'}`].join('\n');
  }
  return [`Page title: ${page.title || '(unknown)'}`, `URL: ${normalizeUrl(page.url)}`].join('\n');
}

async function oembed(videoId) {
  try {
    const target = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`);
    if (!res.ok) return {};
    const { title, author_name } = await res.json();
    return { videoTitle: title, channel: author_name };
  } catch {
    return {};
  }
}

function normalizeUrl(raw) {
  const url = new URL(raw);
  url.hash = '';
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(name)) url.searchParams.delete(name);
  }
  return url.toString();
}

async function cacheKey(page, task) {
  const bytes = new TextEncoder().encode(normalizeTask(task));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const taskHash = [...new Uint8Array(digest).slice(0, 6)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const target = page.videoId ? `yt:${page.videoId}` : normalizeUrl(page.url);
  return `v:${taskHash}:${target}`;
}

async function readCache(key) {
  const { [key]: entry, sessionId } = await chrome.storage.local.get([key, 'sessionId']);
  if (!entry) return null;
  const live = entry.source === 'override' ? entry.session === sessionId : Date.now() - entry.at < TTL_MS;
  if (live) return entry;
  await chrome.storage.local.remove(key);
  return null;
}

async function pruneCache() {
  const all = await chrome.storage.local.get(null);
  const expired = Object.keys(all).filter((k) => k.startsWith('v:') && Date.now() - all[k].at >= TTL_MS);
  if (expired.length) await chrome.storage.local.remove(expired);
}
