// Entry point: loads flow.json, owns the state and wires events.

import { $, setText } from './dom.js';
import { DEFAULT_STATE, normalize, stateFromHash, stateToHash } from './state.js';
import { render } from './render.js';

const DATA_URL = './data/flow.json';
const TOAST_MS = 3600;

let data = null;
let state = null;
let toastTimer = null;

function setState(patch) {
  state = normalize({ ...state, ...patch }, data);
  history.replaceState(null, '', stateToHash(state));
  render(state, data);
}

// ---------------------------------------------------------------------------
// Actions, dispatched from [data-action] clicks and [data-bind] changes
// ---------------------------------------------------------------------------

const actions = {
  role: (role) => setState({ role }),
  os: (os) => setState({ os }),
  alg: (alg) => setState({ alg }),
  'follower-alg': (followerAlg) => setState({ followerAlg }),
  reset() {
    setState({ ...DEFAULT_STATE });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Wizard reset to default Master (iOS → Loop) path.');
  },
  'open-json': openJsonDialog,
  'close-json': () => $('jsonDialog').close(),
  'copy-json': copyJson,
  'download-json': downloadJson,
};

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || !data) return;
  actions[target.dataset.action]?.(target.dataset.value);
});

document.addEventListener('change', (event) => {
  const key = event.target.dataset.bind;
  if (!key || !data) return;
  setState({ [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
});

// Choice cards are div[role=radio]: Space/Enter select, arrow keys move the
// selection inside the radiogroup, as native radios do.
document.addEventListener('keydown', (event) => {
  const radio = event.target.closest?.('[role="radio"]');
  if (!radio) return;

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    radio.click();
    return;
  }

  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;

  event.preventDefault();
  const radios = [...radio.closest('[role="radiogroup"]').querySelectorAll('[role="radio"]')];
  const next = radios[(radios.indexOf(radio) + step + radios.length) % radios.length];
  next.click();
  next.focus();
});

window.addEventListener('hashchange', () => {
  if (data) setState(stateFromHash(location.hash));
});

// ---------------------------------------------------------------------------
// flow.json dialog, toast
// ---------------------------------------------------------------------------

const flowJson = () => JSON.stringify(data, null, 2);

function openJsonDialog() {
  setText('jsonDialogContent', flowJson());
  $('jsonDialog').showModal();
}

// A click on the backdrop lands on the <dialog> itself, not on its content.
$('jsonDialog').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

async function copyJson() {
  try {
    await navigator.clipboard.writeText(flowJson());
    showToast('Copied flow.json to clipboard.');
  } catch {
    showToast('Unable to copy automatically; use Download flow.json.');
  }
}

function downloadJson() {
  const url = URL.createObjectURL(new Blob([flowJson()], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'flow.json' });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
}

function showToast(message) {
  const toast = $('toast');
  setText('toastMessage', message);
  toast.dataset.visible = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => delete toast.dataset.visible, TOAST_MS);
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

/** On https://<owner>.github.io/<repo>/ the issue tracker is github.com/<owner>/<repo>/issues. */
function issuesUrl() {
  const owner = location.hostname.match(/^([^.]+)\.github\.io$/)?.[1];
  const repo = location.pathname.split('/').find(Boolean);
  return owner && repo ? `https://github.com/${owner}/${repo}/issues/new` : null;
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.error(`Could not load ${DATA_URL}:`, error);
    $('loadError').hidden = false;
    $('app').hidden = true;
    return;
  }

  setText('lastUpdated', `Data verified: ${data.lastUpdated}`);
  const reportUrl = issuesUrl();
  if (reportUrl) {
    $('reportLink').href = reportUrl;
    $('reportLink').hidden = false;
  }

  state = normalize(stateFromHash(location.hash), data);
  render(state, data);
  $('app').removeAttribute('aria-busy');
}

init();
