/** @typedef {'native' | 'native-script' | 'script'} Behaviour */

/**
 * @typedef {object} ElementState
 * @property {string} selector
 * @property {Readonly<Record<string, string | null>>} [attributes]
 * @property {Readonly<Record<string, boolean>>} [classes]
 * @property {Readonly<Record<string, string | null>>} [style]
 * @property {Readonly<Record<string, string | number | boolean>>} [properties]
 * @property {boolean} [focused]
 * @property {boolean} [open]
 * @property {boolean} [present]
 */

/**
 * @typedef {object} Trigger
 * @property {string} event
 * @property {string} [target]
 * @property {string} [key]
 * @property {boolean} [shiftKey]
 * @property {number} [detail]
 * @property {string} [pointerType]
 * @property {number} [dx]
 * @property {number} [dy]
 * @property {number} [ms]
 * @property {boolean} [files]
 * @property {string} [prop]
 * @property {string | number | boolean} [value]
 * @property {string} [method]
 */

/**
 * @typedef {object} Emitted
 * @property {string} callback
 * @property {unknown} [with]
 */

/**
 * @typedef {object} EventOutcome
 * @property {boolean} [defaultPrevented]
 * @property {string} [dropEffect]
 */

/**
 * @typedef {object} Rule
 * @property {string} name
 * @property {string} fixture
 * @property {Readonly<Record<string, unknown>>} [options]
 * @property {readonly ElementState[]} [given]
 * @property {readonly Trigger[]} when
 * @property {readonly ElementState[]} [then]
 * @property {readonly Emitted[]} [emits]
 * @property {EventOutcome} [event]
 * @property {string} source
 * @property {boolean} certain
 * @property {string} [note]
 */

/**
 * @typedef {object} RulesFile
 * @property {string} component
 * @property {Behaviour} behaviour
 * @property {readonly Rule[]} rules
 */

const BEHAVIOURS = ['native', 'native-script', 'script'];

const EVENTS = [
  'animationsend',
  'blur',
  'call',
  'change',
  'click',
  'dragenter',
  'dragleave',
  'dragover',
  'drop',
  'focusin',
  'focusout',
  'input',
  'keydown',
  'mount',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'pointercancel',
  'pointerdown',
  'pointermove',
  'pointerup',
  'resize',
  'scroll',
  'set',
  'time',
  'toggle',
  'transitionend',
  'unmount',
];

const RULE_KEYS = [
  'name',
  'fixture',
  'options',
  'given',
  'when',
  'then',
  'emits',
  'event',
  'source',
  'certain',
  'note',
];

const STATE_KEYS = [
  'selector',
  'attributes',
  'classes',
  'style',
  'properties',
  'focused',
  'open',
  'present',
];

const TRIGGER_KEYS = [
  'event',
  'target',
  'key',
  'shiftKey',
  'detail',
  'pointerType',
  'dx',
  'dy',
  'ms',
  'files',
  'prop',
  'value',
  'method',
];

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {Record<string, unknown>} value
 * @param {readonly string[]} allowed
 * @param {string} where
 * @returns {readonly string[]}
 */
function unknownKeys(value, allowed, where) {
  return Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .map((key) => `${where}: unknown key ${key}`);
}

/**
 * @param {unknown} state
 * @param {string} where
 * @returns {readonly string[]}
 */
function stateProblems(state, where) {
  if (!isRecord(state)) return [`${where}: not an object`];
  const problems = [...unknownKeys(state, STATE_KEYS, where)];
  if (typeof state.selector !== 'string' || state.selector === '') {
    problems.push(`${where}: selector missing`);
  }
  if (Object.keys(state).length < 2) problems.push(`${where}: names no state`);
  for (const key of ['attributes', 'style']) {
    const map = state[key];
    if (map === undefined) continue;
    if (!isRecord(map)) problems.push(`${where}: ${key} is not an object`);
    else if (Object.values(map).some((value) => typeof value !== 'string' && value !== null)) {
      problems.push(`${where}: ${key} values must be strings or null`);
    }
  }
  const classes = state.classes;
  if (classes !== undefined) {
    if (!isRecord(classes) || Object.values(classes).some((on) => typeof on !== 'boolean')) {
      problems.push(`${where}: classes must map names to booleans`);
    }
  }
  for (const key of ['focused', 'open', 'present']) {
    if (state[key] !== undefined && typeof state[key] !== 'boolean') {
      problems.push(`${where}: ${key} must be a boolean`);
    }
  }
  return problems;
}

/**
 * @param {unknown} trigger
 * @param {string} where
 * @returns {readonly string[]}
 */
function triggerProblems(trigger, where) {
  if (!isRecord(trigger)) return [`${where}: not an object`];
  const problems = [...unknownKeys(trigger, TRIGGER_KEYS, where)];
  if (typeof trigger.event !== 'string' || !EVENTS.includes(trigger.event)) {
    problems.push(`${where}: event ${String(trigger.event)} is not one of the known events`);
  }
  if (trigger.event === 'keydown' && typeof trigger.key !== 'string') {
    problems.push(`${where}: a keydown names its key`);
  }
  if (trigger.event === 'set' && typeof trigger.prop !== 'string') {
    problems.push(`${where}: a set names its prop`);
  }
  if (trigger.event === 'call' && typeof trigger.method !== 'string') {
    problems.push(`${where}: a call names its method`);
  }
  if (trigger.event === 'time' && typeof trigger.ms !== 'number') {
    problems.push(`${where}: a time names its ms`);
  }
  return problems;
}

/**
 * @param {unknown} list
 * @param {string} where
 * @param {(item: unknown, where: string) => readonly string[]} check
 * @param {boolean} required
 * @returns {readonly string[]}
 */
function listProblems(list, where, check, required) {
  if (list === undefined) return required ? [`${where}: missing`] : [];
  if (!Array.isArray(list)) return [`${where}: not a list`];
  if (required && list.length === 0) return [`${where}: empty`];
  return list.flatMap((item, index) => check(item, `${where}[${index}]`));
}

/**
 * @param {unknown} emitted
 * @param {string} where
 * @returns {readonly string[]}
 */
function emittedProblems(emitted, where) {
  if (!isRecord(emitted)) return [`${where}: not an object`];
  const problems = [...unknownKeys(emitted, ['callback', 'with'], where)];
  if (typeof emitted.callback !== 'string') problems.push(`${where}: callback missing`);
  return problems;
}

/**
 * @param {unknown} outcome
 * @param {string} where
 * @returns {readonly string[]}
 */
function outcomeProblems(outcome, where) {
  if (!isRecord(outcome)) return [`${where}: not an object`];
  const problems = [...unknownKeys(outcome, ['defaultPrevented', 'dropEffect'], where)];
  if (outcome.defaultPrevented !== undefined && typeof outcome.defaultPrevented !== 'boolean') {
    problems.push(`${where}: defaultPrevented must be a boolean`);
  }
  if (outcome.dropEffect !== undefined && typeof outcome.dropEffect !== 'string') {
    problems.push(`${where}: dropEffect must be a string`);
  }
  return problems;
}

/**
 * @param {unknown} rule
 * @param {string} where
 * @returns {readonly string[]}
 */
function ruleProblems(rule, where) {
  if (!isRecord(rule)) return [`${where}: not an object`];
  const problems = [...unknownKeys(rule, RULE_KEYS, where)];
  for (const key of ['name', 'fixture', 'source']) {
    if (typeof rule[key] !== 'string' || rule[key] === '')
      problems.push(`${where}: ${key} missing`);
  }
  if (typeof rule.certain !== 'boolean') problems.push(`${where}: certain must be a boolean`);
  if (rule.certain === false && typeof rule.note !== 'string') {
    problems.push(`${where}: an uncertain rule says why in its note`);
  }
  if (rule.options !== undefined && !isRecord(rule.options)) {
    problems.push(`${where}: options is not an object`);
  }
  if (rule.event !== undefined) problems.push(...outcomeProblems(rule.event, `${where}.event`));
  const observed = rule.emits !== undefined || rule.event !== undefined;
  problems.push(
    ...listProblems(rule.given, `${where}.given`, stateProblems, false),
    ...listProblems(rule.when, `${where}.when`, triggerProblems, true),
    ...listProblems(rule.then, `${where}.then`, stateProblems, !observed),
    ...listProblems(rule.emits, `${where}.emits`, emittedProblems, false),
  );
  return problems;
}

/**
 * @param {unknown} file
 * @returns {readonly string[]}
 */
function rulesFileProblems(file) {
  if (!isRecord(file)) return ['the file is not an object'];
  const problems = [...unknownKeys(file, ['component', 'behaviour', 'rules'], 'file')];
  if (typeof file.component !== 'string') problems.push('file: component missing');
  if (typeof file.behaviour !== 'string' || !BEHAVIOURS.includes(file.behaviour)) {
    problems.push('file: behaviour must be native, native-script or script');
  }
  problems.push(...listProblems(file.rules, 'rules', ruleProblems, true));
  return problems;
}

export { BEHAVIOURS, EVENTS, rulesFileProblems };
