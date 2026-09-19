// Jev client (TypeSafe System One API). Returns the probability that the answer to a
// yes/no ("noul") question is yes. https://docs.typesafe.ai/api

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const TIMEOUT_MS = 8000;
const RETRY_STATUSES = new Set([429, 529]);
const MAX_ATTEMPTS = 3;

const QUESTIONS = {
  onTask: {
    type: 'noul',
    instructions: 'Is visiting this page part of working on the declared task?',
    criteria: {
      true: 'The page directly helps with the task, or is reference material, tooling or research reasonably needed for it',
      false: 'The page is unrelated to the task, or is entertainment or a distraction',
    },
  },
  excuse: {
    type: 'noul',
    instructions: 'Does the excuse credibly explain how this page helps with the declared task?',
    criteria: {
      true: 'The excuse gives a concrete, plausible link between the page and the task',
      false: 'The excuse is vague, unrelated, or admits the page is a break or distraction',
    },
  },
  quit: {
    type: 'noul',
    instructions: 'Is this a legitimate reason to end the work session before its planned end?',
    criteria: {
      true: 'The task is finished, or something outside the user\'s control needs them now (a meeting, an emergency, health)',
      false: 'Boredom, wanting a break or a distraction, procrastination, or no real reason',
    },
  },
};

// `facts` are the lines of state after the task: the page, an excuse, a quit reason...
export async function askJev({ task, facts, question = 'onTask' }) {
  const { jevApiKey } = await chrome.storage.local.get('jevApiKey');
  if (!jevApiKey) throw new Error('No TypeSafe API key set');

  const state = [`Declared task: ${task}`, ...facts].join('\n\n');
  const body = JSON.stringify({ state, model: MODEL, questions: { [question]: QUESTIONS[question] } });
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jevApiKey}`, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) {
      const noul = (await res.json()).answers?.[question]?.noul;
      if (typeof noul !== 'number') throw new Error('Jev returned no answer');
      return noul;
    }
    if (!RETRY_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(`Jev API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
  }
}
