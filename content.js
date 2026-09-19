(() => {
  const IS_YOUTUBE = /(^|\.)youtube\.com$/.test(location.hostname);
  const SPA_SETTLE_MS = 500;
  const YT_FALLBACK_MS = 1000;
  const DOM_WAIT_MS = 1500;
  const TITLE_WAIT_MS = 2000;

  // em, not rem: sites set their own root font size (YouTube uses 10px).
  const OVERLAY_CSS = `
    [hidden] { display: none !important; }
    .wrap { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center;
            background: rgba(12, 12, 16, 0.94); backdrop-filter: blur(8px);
            font: 16px/1.5 system-ui, -apple-system, sans-serif; color: #eee; }
    .card { max-width: 30em; padding: 2em; text-align: center; }
    .msg { font-size: 1.8em; font-weight: 700; margin-bottom: 0.5em; }
    .score { font-size: 1.1em; color: #ff8a7a; font-variant-numeric: tabular-nums; }
    .task, .subject { margin-top: 1em; color: #aaa; }
    .task b { color: #eee; }
    .subject { font-style: italic; }
    .actions { margin-top: 1.5em; display: flex; gap: 0.75em; justify-content: center; flex-wrap: wrap; }
    button { font: inherit; padding: 0.55em 1em; border-radius: 8px; border: 1px solid #444;
             background: #222; color: #eee; cursor: pointer; }
    button.primary { background: #eee; color: #111; border-color: #eee; }
    form { margin-top: 1em; display: flex; gap: 0.5em; }
    input { flex: 1; font: inherit; padding: 0.55em 0.75em; border-radius: 8px;
            border: 1px solid #444; background: #111; color: #eee; }
    .shame { margin-top: 1em; color: #ffb86b; font-size: 0.9em; }
    .shame:empty { display: none; }
    .reply { margin-top: 1em; min-height: 1.5em; color: #9fd4a3; }`;

  let navToken = 0;
  let holding = false; // keep videos paused while judging or blocked
  let lastUrl = location.href;
  let lastMeta = { videoId: null, videoTitle: null };
  let lastJudged = { url: null, title: null };
  let overlayHost = null;

  // Media events don't bubble, but they do go through the capture phase.
  document.addEventListener('play', (e) => { if (holding) e.target.pause(); }, true);

  function hold(on) {
    holding = on;
    if (on) document.querySelectorAll('video').forEach((v) => v.pause());
  }

  function videoIdFromLocation() {
    if (location.pathname === '/watch') return new URLSearchParams(location.search).get('v');
    return location.pathname.match(/^\/shorts\/([\w-]+)/)?.[1] ?? null;
  }

  // Read title/channel once YouTube has rendered them for *this* video. The metadata can
  // lag the URL after SPA navigation, so also require the title to have changed. Whatever
  // isn't found in time (the channel often renders later, and collab videos use different
  // markup) is filled in by the worker from oEmbed.
  async function readVideoMeta(videoId, token) {
    if (location.pathname.startsWith('/shorts/')) return {};
    const deadline = Date.now() + DOM_WAIT_MS;
    while (Date.now() < deadline && token === navToken) {
      const flexy = document.querySelector(`ytd-watch-flexy[video-id="${videoId}"]`);
      const title = flexy?.querySelector('ytd-watch-metadata h1')?.textContent.trim();
      if (title && (lastMeta.videoId === videoId || title !== lastMeta.videoTitle)) {
        const channel = flexy.querySelector('ytd-watch-metadata ytd-channel-name a')?.textContent.trim();
        lastMeta = { videoId, videoTitle: title };
        return { videoTitle: title, channel };
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return {};
  }

  // SPAs can keep the previous page's title for a while after the URL changes, and YouTube
  // doesn't update it at all on back/forward. After a navigation, wait for the title to
  // change; if it never does, send no title rather than the previous page's.
  // YouTube search pages are labelled from the query instead.
  async function pageTitle(token) {
    if (IS_YOUTUBE && location.pathname === '/results') {
      return `YouTube search: ${new URLSearchParams(location.search).get('search_query') ?? ''}`;
    }
    if (lastJudged.url === location.href || document.title !== lastJudged.title) return document.title;
    const deadline = Date.now() + TITLE_WAIT_MS;
    while (Date.now() < deadline && token === navToken) {
      await new Promise((r) => setTimeout(r, 100));
      if (document.title !== lastJudged.title) return document.title;
    }
    return '';
  }

  async function check() {
    const token = ++navToken;
    lastUrl = location.href;
    removeOverlay();

    let active, task, shame;
    try {
      ({ active, task, shame } = await chrome.runtime.sendMessage({ type: 'settings' }));
    } catch {
      return; // extension was reloaded; this content script is orphaned
    }
    if (token !== navToken) return;
    if (!active) { hold(false); return; }

    const videoId = IS_YOUTUBE ? videoIdFromLocation() : null;
    hold(!!videoId);
    // Videos are judged on their own title/channel, so don't wait on the page title.
    const page = { url: location.href, title: videoId ? document.title : await pageTitle(token) };
    if (videoId) Object.assign(page, { videoId }, await readVideoMeta(videoId, token));
    if (token !== navToken) return;
    lastJudged = { url: page.url, title: document.title };

    let verdict;
    try {
      verdict = await chrome.runtime.sendMessage({ type: 'judge', page });
    } catch {
      return; // extension was reloaded; this content script is orphaned
    }
    if (token !== navToken) return;

    if (verdict?.action === 'block') {
      showOverlay(page, verdict, task, shame);
    } else if (videoId) {
      release();
    }
  }

  function release() {
    hold(false);
    document.querySelector('video')?.play().catch(() => {});
  }

  function el(tag, className = '', ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.append(...children);
    return node;
  }

  // Go back if there's somewhere to go. Otherwise (a tab opened on this page) the worker closes
  // the tab. history.length alone can't tell, since it also counts forward entries: try going
  // back, and leave only if no navigation (same page or new one) has started a second later.
  function backToWork() {
    const leave = () => chrome.runtime.sendMessage({ type: 'leave' }).catch(() => {});
    if (history.length <= 1) return leave();
    const fallback = setTimeout(leave, 1000);
    const cancel = () => clearTimeout(fallback);
    window.addEventListener('popstate', cancel, { once: true });
    window.addEventListener('beforeunload', cancel, { once: true });
    history.back();
  }

  function removeOverlay() {
    overlayHost?.remove();
    overlayHost = null;
  }

  function showOverlay(page, verdict, task, shame) {
    removeOverlay();
    overlayHost = document.createElement('div');
    // Keep keystrokes in the overlay away from page shortcuts (YouTube's k, f, j...).
    for (const type of ['keydown', 'keyup', 'keypress']) {
      overlayHost.addEventListener(type, (e) => e.stopPropagation());
    }
    const root = overlayHost.attachShadow({ mode: 'closed' });
    // Built with DOM calls, not innerHTML: YouTube enforces Trusted Types.
    const style = document.createElement('style');
    style.textContent = OVERLAY_CSS;
    const card = el('div', 'card',
      el('div', 'msg', verdict.headline),
      el('div', 'score', `Jev: ${Math.round(verdict.p * 100)}% productive`),
      el('div', 'task', "You said you're working on: ", el('b', '', task)),
      el('div', 'subject', verdict.label),
      el('div', 'shame', shame),
      el('div', 'actions', el('button', 'primary back', 'Back to work'), el('button', 'override', 'This is actually work')),
      el('form', '', el('input'), el('button', '', 'Plead')),
      el('div', 'reply'));
    root.append(style, el('div', 'wrap', card));

    const $ = (sel) => root.querySelector(sel);
    $('form').hidden = true;
    Object.assign($('input'), { placeholder: 'Convince Jev…', maxLength: 200 });

    $('.back').addEventListener('click', backToWork);
    $('.override').addEventListener('click', () => {
      $('.actions').hidden = true;
      $('form').hidden = false;
      $('input').focus();
    });
    $('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const excuse = $('input').value.trim();
      if (!excuse) return;
      $('form').hidden = true;
      $('.reply').textContent = verdict.thinking;
      let reply, accepted;
      try {
        ({ reply, accepted } = await chrome.runtime.sendMessage({ type: 'override', page, excuse }));
      } catch {
        [reply, accepted] = ["Jev can't be reached. Allowed, this time.", true]; // extension reloaded
      }
      $('.reply').textContent = reply;
      if (accepted) {
        setTimeout(() => { removeOverlay(); release(); }, 2200);
      } else {
        $('input').value = '';
        $('form').hidden = false;
        $('.actions').hidden = false;
        $('.override').hidden = true;
        $('input').focus();
      }
    });

    document.documentElement.appendChild(overlayHost);
  }

  // Navigation. On YouTube, yt-navigate-finish fires once the new page has rendered. The URL
  // changes earlier, when navigation starts, so URL polling is only a delayed fallback there
  // (the title and metadata would still be the previous page's), and on other SPAs it waits
  // for the title to settle. A new YouTube video is paused as soon as its URL appears.
  let settleTimer = null;
  function onUrlPoll() {
    if (location.href === lastUrl || settleTimer) return;
    if (IS_YOUTUBE && videoIdFromLocation()) hold(true);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      if (location.href !== lastUrl) check();
    }, IS_YOUTUBE ? YT_FALLBACK_MS : SPA_SETTLE_MS);
  }
  if (IS_YOUTUBE) {
    document.addEventListener('yt-navigate-finish', () => { if (location.href !== lastUrl) check(); });
  }
  setInterval(onUrlPoll, 500);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'settings-changed') check();
  });

  check();
})();
