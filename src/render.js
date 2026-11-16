// Renders the whole page from (state, data). Every function here is idempotent:
// calling render() again with the same arguments changes nothing.

import { $, setText, cloneTemplate, fillFields, syncRadioGroup, renderOnce } from './dom.js';
import {
  followerAlgorithms,
  masterAlgorithms,
  masterAlgorithm,
  visiblePumps,
  selectedCgm,
  selectedPump,
  isDeprecated,
  isUnsupported,
} from './state.js';

const OS_LABELS = { ios: 'iOS', android: 'Android' };

export function render(state, data) {
  const isFollower = state.role === 'follower';

  document.body.dataset.role = state.role;
  syncRadioGroup($('roleGroup'), state.role);
  syncRadioGroup($('osGroup'), state.os);
  $('showDeprecatedToggle').checked = state.showDeprecated;

  renderStepper(state, data);
  renderPlatforms(state, data);

  $('followerBranch').hidden = !isFollower;
  $('masterBranch').hidden = isFollower;
  if (isFollower) {
    renderFollowerBranch(state, data);
  } else {
    renderMasterBranch(state, data);
  }
}

function renderStepper(state, data) {
  const stepper = $('stepper');
  const steps = data.roles[state.role].steps;
  stepper.dataset.count = steps.length;
  renderOnce(stepper, state.role, () =>
    steps.map((label, index) => {
      const step = cloneTemplate('tpl-step');
      fillFields(step, { number: index + 1, label });
      return step;
    })
  );
}

function renderPlatforms(state, data) {
  const platforms = data.roles[state.role].platforms;
  setText('osTitle', `Choose ${state.role === 'master' ? 'Master' : 'Caregiver'} Smartphone Operating System`);

  for (const os of Object.keys(OS_LABELS)) {
    const platform = platforms[os];
    setText(`${os}Subtitle`, platform.subtitle);
    setText(`${os}CostBadge`, platform.costBadge);
    setText(`${os}CostNote`, platform.costNote);
    setText(`${os}BuildMethod`, platform.buildMethod);
  }
}

// ---------------------------------------------------------------------------
// Branch A: caregiver / follower (platform -> followed algorithm -> apps)
// ---------------------------------------------------------------------------

function renderFollowerBranch(state, data) {
  const platform = data.roles.follower.platforms[state.os];
  const algorithms = followerAlgorithms(state, data);
  const algorithm = algorithms[state.followerAlg];

  const group = $('followerAlgGroup');
  group.dataset.count = Object.keys(algorithms).length;
  renderOnce(group, state.os, () =>
    Object.entries(algorithms).map(([key, alg]) => {
      const card = cloneTemplate('tpl-follower-alg');
      card.dataset.value = key;
      fillFields(card, {
        name: alg.name,
        badge: alg.badge,
        summary: alg.summary,
        count: `${alg.buildOptions.length} Apps / Methods`,
      });
      return card;
    })
  );
  syncRadioGroup(group, state.followerAlg);

  setText('followerBranchTitle', `Available Caregiver Builds: ${platform.name} Following ${algorithm.name}`);
  setText('followerComboBadge', `${OS_LABELS[state.os]} Caregiver → ${algorithm.name}`);
  setText('followerCostNote', platform.costNote);

  renderOnce($('followerApps'), `${state.os}:${state.followerAlg}`, () =>
    algorithm.buildOptions.map((option) => {
      const card = cloneTemplate('tpl-follower-app');
      fillFields(card, {
        name: option.name,
        nightscout: option.requiresNightscout ? 'Requires Nightscout' : 'Nightscout Optional',
        purpose: option.purpose,
        installMethod: option.installMethod,
        docsLabel: option.docsLabel ?? 'Open Caregiver Setup Docs',
      });
      card.querySelector('[data-field="nightscout"]').dataset.tone = option.requiresNightscout ? 'purple' : 'emerald';
      card.querySelector('a').href = option.docsUrl;
      return card;
    })
  );
}

// ---------------------------------------------------------------------------
// Branch B: master (algorithm -> CGM -> pump -> docs)
// ---------------------------------------------------------------------------

function renderMasterBranch(state, data) {
  const algorithms = masterAlgorithms(state, data);
  const group = $('masterAlgGroup');
  group.dataset.count = Object.keys(algorithms).length;
  renderOnce(group, state.os, () =>
    Object.entries(algorithms).map(([key, alg]) => {
      const card = cloneTemplate('tpl-master-alg');
      card.dataset.value = key;
      fillFields(card, {
        name: alg.name,
        badge: alg.badge,
        engine: `Engine: ${alg.engine}`,
        summary: alg.summary,
        cgmCount: `Supported CGMs: ${alg.cgms.length}`,
        pumpCount: `Supported Pumps: ${alg.pumps.length}`,
      });
      return card;
    })
  );
  syncRadioGroup(group, state.alg);

  const algorithm = masterAlgorithm(state, data);
  renderCgm(state, algorithm);
  renderPump(state, algorithm);
}

function renderCgm(state, algorithm) {
  const cgm = selectedCgm(state, algorithm);

  setText('cgmHeaderAlgName', algorithm.name);
  setText('cgmCardAlgLabel', algorithm.name);

  const select = $('cgmSelect');
  renderOnce(select, `${state.os}:${state.alg}`, () =>
    algorithm.cgms.map((c) => new Option(`${c.name} — [${c.driverTag}]`, c.id))
  );
  select.value = cgm.id;

  setText('cgmDriverBadge', cgm.driverTag);
  setText('cgmHowTo', cgm.howToUseWithAlgorithm);
  setText('cgmExtraNote', cgm.extraNote);
  $('cgmDocsLink').href = cgm.cgmDocsUrl;

  const heartbeat = $('cgmHeartbeatBadge');
  heartbeat.textContent = cgm.wakesAppInBackground ? 'BLE Background Heartbeat: Yes' : 'No Background BLE Heartbeat';
  heartbeat.dataset.tone = cgm.wakesAppInBackground ? 'emerald' : 'amber';
}

function pumpOptionLabel(pump) {
  const prefix = isDeprecated(pump) ? '[Discontinued/Legacy] ' : isUnsupported(pump) ? '[Not Yet Supported] ' : '';
  return `${prefix}${pump.name} — (${pump.status})`;
}

function renderPump(state, algorithm) {
  const pumps = visiblePumps(algorithm, state.showDeprecated);
  const pump = selectedPump(state, algorithm);

  const select = $('pumpSelect');
  renderOnce(select, `${state.os}:${state.alg}:${state.showDeprecated}`, () =>
    pumps.length > 0
      ? pumps.map((p) => new Option(pumpOptionLabel(p), p.id))
      : [new Option('No pumps match the current filter', '')]
  );
  select.disabled = pumps.length === 0;
  select.value = pump?.id ?? '';

  $('pumpEmpty').hidden = Boolean(pump);
  $('pumpDetails').hidden = !pump;
  if (!pump) return;

  const deprecated = isDeprecated(pump);
  const unsupported = isUnsupported(pump) || !pump.continueDocsUrl;

  setText('pumpName', pump.name);
  setText('pumpTypeBadge', pump.type);
  setText('pumpDriverInfo', pump.driverInfo);

  const status = $('pumpStatusBadge');
  status.textContent = pump.status;
  status.dataset.tone = isUnsupported(pump) ? 'rose' : deprecated ? 'amber' : 'emerald';
  $('pumpLifecycleBadge').hidden = !deprecated;

  $('pumpDeprecatedBanner').hidden = !(deprecated && pump.deprecatedNote);
  setText('pumpDeprecatedNote', pump.deprecatedNote);

  const cgm = selectedCgm(state, algorithm);
  const needsHeartbeat = pump.requiresHeartbeatCgm && !cgm.wakesAppInBackground;
  $('pumpCgmWarning').hidden = !needsHeartbeat;
  setText(
    'pumpCgmWarningText',
    needsHeartbeat
      ? `${pump.name} on ${algorithm.name} requires a CGM that wakes the app in the background every 5 minutes via Bluetooth (such as Dexcom G6/G7 or direct BLE Libre). ${cgm.name} does not provide a local BLE heartbeat.`
      : ''
  );

  $('pumpUnsupportedBanner').hidden = !unsupported;
  const docsLink = $('pumpDocsLink');
  docsLink.href = unsupported ? algorithm.startDocsUrl : pump.continueDocsUrl;
  docsLink.dataset.variant = unsupported ? 'muted' : 'primary';
  setText(
    'pumpDocsLabel',
    unsupported ? `Browse All ${algorithm.name} Supported Pumps` : `Continue ${pump.name} Setup in ${algorithm.name} Docs`
  );
}
