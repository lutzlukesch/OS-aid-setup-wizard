// Wizard state: one plain object, normalized against flow.json after every
// change and mirrored into the URL hash so a setup can be shared as a link.

// '' means "not chosen yet": an empty hash and Reset both start with no selection.
export const DEFAULT_STATE = Object.freeze({
  role: '',                // 'master' | 'follower'
  os: '',                  // 'ios' | 'android'
  alg: '',                 // algorithm on the master device
  followerAlg: '',         // algorithm the caregiver is following
  cgm: '',
  pump: '',
  showDeprecated: true,
});

export const masterAlgorithms = (state, data) => data.roles.master.platforms[state.os].algorithms;
export const followerAlgorithms = (state, data) => data.roles.follower.platforms[state.os].masterAlgorithms;
export const masterAlgorithm = (state, data) => masterAlgorithms(state, data)[state.alg];

export const isDeprecated = (pump) => pump.lifecycle === 'deprecated';
export const isUnsupported = (pump) => pump.support === 'unsupported';

export function visiblePumps(algorithm, showDeprecated) {
  return algorithm.pumps.filter((pump) => showDeprecated || !isDeprecated(pump));
}

export const selectedCgm = (state, algorithm) => algorithm.cgms.find((cgm) => cgm.id === state.cgm);
export const selectedPump = (state, algorithm) => algorithm.pumps.find((pump) => pump.id === state.pump);

/**
 * Clears every choice that does not exist for the current path, and every
 * choice whose step comes after an empty one. Nothing is ever filled in.
 */
export function normalize(state, data) {
  const next = { ...state };

  if (!(next.role in data.roles)) next.role = '';
  const hasOs = (role) => next.os in data.roles[role].platforms;
  if (!next.role || !hasOs('master') || !hasOs('follower')) next.os = '';

  if (!next.os || !(next.followerAlg in followerAlgorithms(next, data))) next.followerAlg = '';
  if (!next.os || !(next.alg in masterAlgorithms(next, data))) next.alg = '';

  const algorithm = next.alg && masterAlgorithm(next, data);
  if (!algorithm || !selectedCgm(next, algorithm)) next.cgm = '';

  const pumps = next.cgm ? visiblePumps(algorithm, next.showDeprecated) : [];
  if (!pumps.some((pump) => pump.id === next.pump)) next.pump = '';

  return next;
}

// The hash carries only the choices of the active role: `alg` is the master
// algorithm for master and the followed algorithm for follower.
export function stateFromHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const state = { ...DEFAULT_STATE };

  if (params.has('role')) state.role = params.get('role');
  if (params.has('os')) state.os = params.get('os');
  if (params.has('alg')) state[state.role === 'follower' ? 'followerAlg' : 'alg'] = params.get('alg');
  if (params.has('cgm')) state.cgm = params.get('cgm');
  if (params.has('pump')) state.pump = params.get('pump');
  if (params.has('legacy')) state.showDeprecated = params.get('legacy') !== '0';

  return state;
}

/** Returns '' when nothing is chosen. */
export function stateToHash(state) {
  const params = new URLSearchParams();
  const set = (key, value) => value && params.set(key, value);

  set('role', state.role);
  set('os', state.os);
  if (state.role === 'follower') {
    set('alg', state.followerAlg);
  } else {
    set('alg', state.alg);
    set('cgm', state.cgm);
    set('pump', state.pump);
    if (!state.showDeprecated) params.set('legacy', '0');
  }

  const query = params.toString();
  return query && `#${query}`;
}
