# Tangent

Tangent blocks off-task pages while you work.

You tell it what you're working on. Every page you open, and every YouTube video, gets checked
against that by [Jev](https://docs.typesafe.ai/introduction), a model from TypeSafe AI that only
answers yes or no. An async Rust tutorial gets through. A cat compilation from the same search
results doesn't.

It's a side project built for fun. No tests, no store listing, and it will sometimes be wrong.

## Setup

1. Clone the repo.
2. Go to `chrome://extensions`, turn on Developer mode, click Load unpacked and pick the folder.
3. Open the Tangent popup and paste your [TypeSafe API key](https://console.typesafe.ai/keys)
   under Jev, at the bottom.

## Using it

Type your task, pick an end time, click Start working. Until the end time, the task is locked.

If a page gets blocked but really is work, click "This is actually work" and explain why. Jev
reads your excuse. If it's convincing, the page stays open for the rest of the session.

Stopping early is annoying on purpose. You give Jev a reason (boredom doesn't count), wait a
minute, then type out an embarrassing sentence. No pasting.

You can always just disable the extension. Tangent notices, and the next block screen says so.

Recent sessions are listed in the popup, so you can pick one back up the next day.

## Things to know

- During a session, each page you open sends your task and the page's URL and title (or the
  video's title and channel) to TypeSafe's API. No cookies, no page content. Outside a session,
  nothing is sent.
- Calls are billed to your key. It's about a cent a day.
- Your API key is kept in Chrome's extension storage, unencrypted, like any extension setting.
  Websites can't read it.
- To notice when it was switched off, Tangent checks your browsing history. That stays on your
  machine.
- If Jev can't be reached, pages are let through.
- Not affiliated with TypeSafe AI.

Everything Jev says is in `messages.js`. Funnier lines are welcome.

## License

MIT, see [LICENSE](LICENSE). No warranty, use at your own risk.
