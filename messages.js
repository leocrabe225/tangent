// Every line Jev says. {placeholders} are filled in by pick(). Add your own.

const MESSAGES = {
  // Block screen headline. The score is shown right below it.
  blockHeadline: [
    'Jev has concerns.',
    'Jev said no.',
    'This is a tangent.',
    'Jev ran the numbers. Not great.',
    'Jev would like a word.',
    'Jev has reviewed your choices.',
    'Bold of you.',
    'Jev is not mad. Just disappointed.',
    'Absolutely not.',
    'Jev saw that.',
    'Nice try.',
    'This is not the task.',
    'Jev checked. This is not it.',
    'Your task misses you.',
    "Jev is going to pretend it didn't see this.",
    'Wrong tab.',
    'Detour detected.',
    'You were doing so well.',
    'Jev, a yes/no model, says no.',
    'Computer says no.',
    'Put the tab down.',
    "Let's not.",
    'Jev is calling this one.',
    'Not today.',
    'Hmm. No.',
    'This is how it starts.',
    'Jev is keeping score.',
    'Somewhere, your task is waiting.',
    'Jev did the math twice.',
    'Blocked, with love.',
    'Jev objects.',
    "That's a no from Jev.",
    'Jev is judging. Quietly.',
    'Future you says thanks.',
    'The rabbit hole is closed today.',
    "Not on Jev's watch.",
    'Jev considered it. Briefly.',
    'Step away from the tab.',
    'Jev has a bad feeling about this.',
    'Ah. So this is what we do now.',
  ],

  // Excuse below the bar: the page stays blocked.
  excuseRejected: [
    "Jev isn't buying it ({pct}). Try a better excuse, or get back to work.",
    '{pct}. Jev has heard better, and Jev has heard worse. Mostly better.',
    'Jev read that. Jev gives it {pct}.',
    'Creative. Unconvincing. {pct}.',
    '{pct} convinced. Jev needs more than vibes.',
    'Jev has doubts ({pct}). So do you, probably.',
    'That excuse scored {pct}. The page stays closed.',
    'Jev appreciates the effort. The effort gets {pct}.',
    'No. ({pct}, if you were wondering.)',
    '{pct}. Jev suggests the task instead.',
    'Jev looked for the link to your task. Found {pct} of one.',
    "That's a {pct} excuse. Jev only takes 50% and up.",
    'Nice story. {pct}.',
    'Jev is {pct} sure you believe that.',
    'Denied at {pct}. Jev has seen this move before.',
  ],

  // Excuse accepted, but only just (50% to 80%).
  excuseGrudging: [
    'Jev will allow it ({pct}). Jev is watching.',
    "Fine. {pct}. Don't make Jev regret this.",
    '{pct}. Jev is letting this one slide.',
    'Allowed, reluctantly ({pct}).',
    'Jev squints, then nods ({pct}).',
    '{pct}. Close enough. Go.',
    'Jev has reservations ({pct}), but okay.',
    'Approved at {pct}. Jev will be keeping an eye on this tab.',
    'OK ({pct}). Make it quick and make it count.',
    '{pct}. Jev is choosing to trust you.',
    'Grudgingly allowed ({pct}).',
    'Jev will allow it ({pct}). This time.',
  ],

  // Excuse clearly accepted (above 80%).
  excuseConvinced: [
    'Jev is convinced ({pct}). Carry on.',
    '{pct}. Fair enough. Jev stands corrected.',
    "Oh, that's legit ({pct}). Go ahead.",
    'Jev apologizes for the inconvenience ({pct}).',
    '{pct}. Jev was wrong. It happens. Rarely.',
    'Solid reason ({pct}). Proceed.',
    'Jev approves ({pct}). Back to it.',
    "{pct}. That's work. Jev can see it now.",
    'Convincing ({pct}). Jev will remember this page.',
    'Case closed ({pct}). Enjoy your very productive page.',
    '{pct}. Jev withdraws its objection.',
    'Approved ({pct}). Jev likes your focus.',
  ],

  // Jev couldn't be reached while judging an excuse: the page is allowed.
  excuseUnreachable: [
    "Jev can't be reached. Allowed, this time.",
    'Jev is unreachable. Consider this a free pass.',
    "Jev is out of office. You're on the honor system.",
    'No answer from Jev. Go ahead, but Jev would have said something.',
    "Jev didn't pick up. Allowed, on trust.",
    "Jev's line is down. Lucky you.",
  ],

  // While waiting for Jev.
  thinking: [
    'Jev is thinking…',
    'Jev is reading your excuse…',
    'Jev is weighing this…',
    'Consulting Jev…',
    'Jev is doing the math…',
    'Jev is squinting at this…',
    'One moment, Jev is judging…',
    'Jev is thinking very hard…',
  ],

  // Under the Start button when the session is set to begin later.
  scheduleNote: [
    'Same rules before it starts.',
    'No takebacks, even before the bell.',
    'Jev is already counting on it.',
    'Scheduled means promised.',
    'Cancelling costs the same as quitting.',
    'Future you is now on the hook.',
    'Jev has written it down.',
    'The clock starts whether you do or not.',
  ],

  // Popup, while a scheduled session hasn't started yet.
  pendingWait: [
    'Nothing is blocked yet. Enjoy it.',
    'Jev is stretching.',
    'The internet is still yours. Briefly.',
    'Last call for nonsense.',
    'Jev is warming up its disappointment.',
    'Free range browsing, for now.',
    'Use this time wisely, or, you know, not.',
    'Jev is looking at the clock. So should you.',
    'Grab your coffee. The gate closes soon.',
    'This is the calm part.',
    'Jev is waiting. Patiently. Menacingly.',
    'Scroll while you can.',
    'The countdown is not a suggestion.',
    "Whatever you're doing, finish it.",
  ],

  // Quitting early: Jev refused the reason.
  quitRefused: [
    'Jev says no ({pct}). Back to work.',
    "{pct}. That's not a reason, that's a wish.",
    "Jev heard 'I'm bored' with extra steps ({pct}).",
    'No ({pct}). The session goes on.',
    'Jev gives that {pct}. Your task gives you a look.',
    '{pct}. Try finishing the task. That one always works.',
    "Jev isn't letting you go that easily ({pct}).",
    'Denied ({pct}). Jev believes in you, unfortunately.',
    "{pct}. Jev has read that one before. It didn't work then either.",
    'Not good enough ({pct}). Back to it.',
    'Jev considered it ({pct}) and chose your task.',
    '{pct}. Jev suggests five more minutes. Then five more.',
    'Request denied ({pct}). The door is still locked.',
    'Jev says no ({pct}). Your future self says thanks.',
    '{pct}. Nice try. Really.',
  ],

  // Quitting early: reason accepted, the 60-second cooldown starts.
  quitCooldown: [
    'Jev agreed. Now sit with that decision.',
    'Jev said yes. Take a minute to be sure.',
    'Approved. Now stare at this countdown and think about it.',
    'Jev let you go. The clock is less generous.',
    'One minute of reflection, courtesy of Jev.',
    'Sit tight. Maybe the urge passes.',
    'Jev agreed, but Jev also believes in second thoughts.',
    'Fine. But first, a minute of silence for your task.',
    'Almost free. Just this minute between you and the exit.',
    'Jev approved. Your task is still hoping you will stay.',
  ],

  // Quitting early: shown above the sentence to retype.
  quitSentenceIntro: [
    'Last step. Type this, exactly:',
    'One more thing. Type this, word for word:',
    'To leave, recite the following:',
    'Almost there. Say it (well, type it):',
    'The exit fee is one sentence. Type it exactly:',
    'Jev requires a formal statement:',
    'Sign here, by typing:',
    'Final step, for the record:',
  ],

  // The sentence to retype. {duration} is "1 minute" or "N minutes".
  quitPhrase: [
    'I, a grown adult, am abandoning "{task}" {duration} early, and Jev will remember this.',
    'Dear Jev, it\'s not you, it\'s my attention span. I\'m leaving "{task}" {duration} early.',
    'I solemnly swear that "{task}" can wait {duration} more, and I will not blame Jev for what happens next.',
    'Jev was right about me. I am quitting "{task}" {duration} early for reasons I have already forgotten.',
    'I choose chaos over "{task}". This {minutes}-minute betrayal is entirely my own doing.',
    'Let the record show that I walked away from "{task}" with {duration} on the clock.',
    'I hereby resign from "{task}", effective immediately, {duration} ahead of schedule.',
    'My future self will read this and sigh: I left "{task}" {duration} early.',
    'I am not procrastinating. I am strategically abandoning "{task}" {duration} early.',
    '"{task}" deserved better. It got {duration} less of me.',
    'I promise to come back to "{task}" and to feel mildly guilty about these {duration}.',
    'Jev, please tell "{task}" I said goodbye. I\'m leaving {duration} early.',
    'I have weighed "{task}" against {duration} of freedom, and freedom won.',
    'This is my formal apology to "{task}", which I am leaving {duration} early.',
    'I know exactly what I am doing, and it is leaving "{task}" {duration} early.',
    'Somewhere, a productivity guru felt me skip the last {duration} of "{task}".',
    'Typing this sentence took longer than it would have taken to make progress on "{task}".',
    '"{task}" and I are taking a break. It\'s not a breakup. It\'s {duration}.',
    'I acknowledge that Jev tried its best and that I am still leaving "{task}" {duration} early.',
    'Future me: yes, I left "{task}" {duration} early. No, I don\'t remember why.',
    'Jev gave me a way out of "{task}" and I took it, {duration} early, with no regrets yet.',
    'I understand that "{task}" will still be here when I come back, and that it will judge me.',
    'My attention span has filed a formal complaint about "{task}". I am granting it {duration}.',
    'Breaking news: local person abandons "{task}" {duration} early. More at eleven.',
    'Let it be known that I could have finished "{task}", given {duration} more and a better attitude.',
    'Roses are red, deadlines are too, I\'m leaving "{task}" {duration} before I was due.',
    'I trade {duration} of "{task}" for whatever I was about to do instead.',
    'I am closing "{task}" {duration} early, and I would like Jev to know I feel fine about it.',
    'To whom it may concern: "{task}" was going great, which is why I am leaving {duration} early.',
    'I have read the terms of quitting "{task}" {duration} early and I accept them without reading them.',
  ],

  // Retype step: tried to paste.
  pasteAttempt: [
    'Nice try. Type it.',
    'Pasting? Jev expected better.',
    'No shortcuts. Type it.',
    'Jev saw that paste.',
    'Hands on the keyboard, please.',
    'The whole point is typing it.',
    'Copy-paste is not a feeling. Type it.',
    'Blocked. Letter by letter, please.',
  ],

  // Retype step: didn't match.
  typo: [
    'Not quite. Exactly, please.',
    'Close, but Jev is strict.',
    "That's not what it says.",
    'Typo. Jev noticed. Try again.',
    'Almost. Jev wants it word for word.',
    'Read it again. Slowly.',
    'Not a match. Jev is patient.',
    'Nope. Every word counts.',
  ],

  // Retype step: waited more than 5 minutes after the cooldown.
  expired: [
    'Too late, the request expired. Start over.',
    'You took too long. Jev takes that as a sign. Start over.',
    "Expired. Maybe you didn't want to leave after all.",
    "Time's up. The door closed again. Start over.",
    'Too slow. Jev assumes you changed your mind.',
    'The window closed. Start from the top.',
  ],

  // Asked to quit with an empty reason.
  emptyReason: [
    'Jev needs a reason.',
    'You have to give Jev something.',
    'An empty reason is still no reason.',
    "Jev can't judge nothing. Well, it can. It's a no.",
    'Say why. Jev is listening.',
    'Use your words.',
  ],

  // Bypass record (block screen and popup). {times} is "once" or "N times".
  bypassOff: [
    'This session you switched Tangent off {times}: {minutes} min, {pages} pages, mostly {site}.',
    'Jev was off {times} this session. You spent {minutes} min on {pages} pages, mostly {site}.',
    'While Jev was away ({times}, {minutes} min): {pages} pages, mostly {site}. Jev knows.',
    'Jev remembers: switched off {times}, {minutes} min, {pages} pages. {site} says hi.',
    'You disabled Tangent {times} this session, then visited {pages} pages in {minutes} min. Mostly {site}. Interesting.',
    "Off {times}. {minutes} min. {pages} pages. Mostly {site}. Jev isn't mad. Jev is keeping a spreadsheet.",
    'Record for this session: Tangent off {times}, {minutes} min, {pages} pages, top site {site}.',
    'Jev was switched off {times}. In {minutes} min you found time for {pages} pages, mostly {site}.',
  ],

  // Bypass record: site access was restricted.
  siteAccess: [
    "You also restricted Tangent's site access. Jev noticed.",
    "Also, you took away Tangent's site access. Sneaky. Noted.",
    "And you restricted Tangent's site access. Jev saw that too.",
    'Site access restricted, too. Jev appreciates the creativity.',
    'You also blindfolded Tangent (site access). Jev can still count.',
  ],
};

// A random line from MESSAGES[key] with {placeholders} filled from vars. Pass a seed to get
// the same line for the same seed, for text that shouldn't change every time it's shown.
export function pick(key, vars = {}, seed) {
  const lines = MESSAGES[key];
  const index = seed === undefined ? Math.floor(Math.random() * lines.length) : seed % lines.length;
  return lines[index].replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

export function percent(p) {
  return `${Math.round(p * 100)}%`;
}
