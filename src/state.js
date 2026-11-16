// Wizard state: one plain object, normalized against flow.json after every
// change and mirrored into the URL hash so a setup can be shared as a link.

export const DEFAULT_STATE = Object.freeze({
  role: 'master',          // 'master' | 'follower'
  os: 'ios',               // 'ios' | 'android'
  alg: 'loop',             // algorithm on the master device
  followerAlg: 'trio',     // algorithm the caregiver is following
  cgm: '',
  pump: '',
  showDeprecated: true,
});

const firstKey = (object) => Object.keys(object)[0];

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

/** Replaces every choice that does not exist for the current path with the first valid one. */
export function normalize(state, data) {
  const next = { ...state };

  if (!(next.role in data.roles)) next.role = DEFAULT_STATE.role;
  const hasOs = (role) => next.os in data.roles[role].platforms;
  if (!hasOs('master') || !hasOs('follower')) next.os = DEFAULT_STATE.os;

  const following = followerAlgorithms(next, data);
  if (!(next.followerAlg in following)) next.followerAlg = firstKey(following);

  const algorithms = masterAlgorithms(next, data);
  if (!(next.alg in algorithms)) next.alg = firstKey(algorithms);

  const algorithm = algorithms[next.alg];
  if (!selectedCgm(next, algorithm)) next.cgm = algorithm.cgms[0].id;

  const pumps = visiblePumps(algorithm, next.showDeprecated);
  if (!pumps.some((pump) => pump.id === next.pump)) next.pump = pumps[0]?.id ?? '';

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

export function stateToHash(state) {
  const params = new URLSearchParams({ role: state.role, os: state.os });

  if (state.role === 'follower') {
    params.set('alg', state.followerAlg);
  } else {
    params.set('alg', state.alg);
    params.set('cgm', state.cgm);
    if (state.pump) params.set('pump', state.pump);
    if (!state.showDeprecated) params.set('legacy', '0');
  }

  return `#${params}`;
}
