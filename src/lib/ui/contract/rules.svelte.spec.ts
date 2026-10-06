import '../core/styles/index.css';
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { rulesFileProblems } from '../core/rules/schema.js';
import type { ElementState, Measured, Rule, RulesFile, Trigger } from '../core/rules/schema.js';
import { RuleControls } from './rule-controls.svelte';
import type { PointerAction, PointerKind } from './rule-input';
import { RULE_SUBJECTS } from './rule-subjects';
import type { RuleSubject } from './rule-subjects';
import RuleHost from './RuleHost.svelte';

type Mounted = ReturnType<typeof mount>;

type Pointer = { readonly x: number; readonly y: number };

type Press = { readonly kind: PointerKind; readonly at: Pointer };

type Run = {
  readonly controls: RuleControls;
  readonly root: HTMLElement;
  mounted: Mounted | null;
  press: Press | null;
  last: Event | null;
};

const LOADED = import.meta.glob('../core/rules/*.json', { eager: true, import: 'default' });

const GRID = [0.5, 0.1, 0.3, 0.7, 0.9];

const UNPRODUCIBLE_DROP_EFFECT =
  'only a drag the browser runs sets a drop effect, and the runner can dispatch a drag but not run one';

function isRulesFile(value: unknown): value is RulesFile {
  return rulesFileProblems(value).length === 0;
}

function rulesFiles(): readonly RulesFile[] {
  return Object.entries(LOADED).map(([path, file]) => {
    if (!isRulesFile(file)) throw new Error(`${path}: ${rulesFileProblems(file).join('; ')}`);
    return file;
  });
}

function subjectFor(rule: Rule): RuleSubject {
  const subject = RULE_SUBJECTS[rule.fixture];
  if (subject === undefined) throw new Error(`No rule subject renders ${rule.fixture}`);
  return subject;
}

function unproducible(rule: Rule): string | null {
  if (rule.event?.dropEffect !== undefined) return UNPRODUCIBLE_DROP_EFFECT;
  return null;
}

async function settle(): Promise<void> {
  flushSync();
  await tick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  flushSync();
}

function eventTarget(target: string | undefined, root: HTMLElement): EventTarget {
  if (target === 'window') return window;
  if (target === 'document') return document;
  if (target === undefined) return root;
  const found = document.querySelector(target);
  if (found === null) throw new Error(`No element matches the trigger target ${target}`);
  return found;
}

function elementTarget(trigger: Trigger, root: HTMLElement): HTMLElement {
  const target = eventTarget(trigger.target, root);
  if (!(target instanceof HTMLElement)) {
    throw new Error(`A ${trigger.event} needs an element, not ${trigger.target ?? 'the root'}`);
  }
  return target;
}

function candidates(left: number, top: number, width: number, height: number): Pointer[] {
  return GRID.flatMap((across) =>
    GRID.map((down) => ({ x: left + width * across, y: top + height * down })),
  ).filter((point) => point.x < innerWidth && point.y < innerHeight);
}

function pointOn(element: Element): Pointer {
  const box = element.getBoundingClientRect();
  const hits = candidates(box.left, box.top, box.width, box.height).map((point) => ({
    point,
    hit: document.elementFromPoint(point.x, point.y),
  }));
  const own = hits.find(({ hit }) => hit === element);
  const inside = hits.find(({ hit }) => hit !== null && element.contains(hit));
  const found = own ?? inside;
  if (found === undefined) throw new Error(`No point on ${element.className} takes the pointer`);
  return found.point;
}

function pointOutside(root: Element): Pointer {
  const found = candidates(0, 0, innerWidth, innerHeight).find((point) => {
    const hit = document.elementFromPoint(point.x, point.y);
    return hit !== null && !root.contains(hit);
  });
  if (found === undefined) throw new Error('No point on the page lies outside the subject');
  return found;
}

function pointFor(target: EventTarget, root: HTMLElement): Pointer {
  if (target === window || target === document || target === document.body) {
    return pointOutside(root);
  }
  if (!(target instanceof Element)) throw new Error('A pointer needs an element to press');
  return pointOn(target);
}

function carriedFiles(trigger: Trigger): DataTransfer {
  const transfer = new DataTransfer();
  if (trigger.files === true) {
    transfer.items.add(new File(['text'], 'notes.txt', { type: 'text/plain' }));
  }
  return transfer;
}

function dispatched(target: EventTarget, event: Event, run: Run): void {
  run.last = event;
  target.dispatchEvent(event);
}

function dragEvent(trigger: Trigger): DragEvent {
  return new DragEvent(trigger.event, {
    bubbles: true,
    cancelable: true,
    composed: true,
    dataTransfer: carriedFiles(trigger),
  });
}

async function finishAnimations(target: EventTarget): Promise<void> {
  if (!(target instanceof Element)) return;
  const running = target.getAnimations({ subtree: true });
  for (const animation of running) animation.finish();
  await Promise.all(running.map((animation) => animation.finished));
}

function scrolledToTop(trigger: Trigger): void {
  const destination = document.querySelector(trigger.to ?? '');
  if (destination === null)
    throw new Error(`No element matches the scroll's destination ${trigger.to}`);
  destination.scrollIntoView({ block: 'start', behavior: 'instant' });
}

async function enterTopLayer(): Promise<void> {
  const other = document.createElement('div');
  other.popover = 'manual';
  document.body.append(other);
  other.showPopover();
  await settle();
  other.hidePopover();
  other.remove();
}

function keyText(key: string, shiftKey: boolean): string {
  const name =
    key === ' ' ? '[Space]' : key.length === 1 ? key.replaceAll(/[{[]/g, '$&$&') : `{${key}}`;
  return shiftKey ? `{Shift>}${name}{/Shift}` : name;
}

async function recorded(type: string, run: Run, act: () => Promise<void>): Promise<void> {
  const keep = (event: Event): void => {
    run.last = event;
  };
  window.addEventListener(type, keep, { capture: true });
  try {
    await act();
  } finally {
    window.removeEventListener(type, keep, { capture: true });
  }
}

async function pointer(kind: PointerKind, action: PointerAction, at: Pointer): Promise<void> {
  await commands.rulePointer({ kind, action, x: at.x, y: at.y });
}

async function release(run: Run, at: Pointer): Promise<void> {
  const held = run.press;
  if (held === null) throw new Error('A release needs a press before it, and the rule gives none');
  run.press = null;
  await pointer(held.kind, 'up', at);
}

async function click(trigger: Trigger, run: Run): Promise<void> {
  const target = elementTarget(trigger, run.root);
  if (trigger.detail === 0) {
    target.focus();
    await userEvent.keyboard('{Enter}');
    return;
  }
  const at = pointOn(target);
  if (run.press !== null) {
    await release(run, at);
    return;
  }
  const box = target.getBoundingClientRect();
  await userEvent.click(target, { position: { x: at.x - box.left, y: at.y - box.top } });
}

async function keydown(trigger: Trigger, run: Run): Promise<void> {
  const target = eventTarget(trigger.target, run.root);
  if (target instanceof HTMLElement && !target.contains(document.activeElement)) target.focus();
  await userEvent.keyboard(keyText(trigger.key ?? '', trigger.shiftKey === true));
}

async function pointerAction(trigger: Trigger, run: Run): Promise<void> {
  const kind: PointerKind = trigger.pointerType === 'touch' ? 'touch' : 'mouse';
  const target = eventTarget(trigger.target, run.root);
  if (trigger.event === 'pointerdown' || trigger.event === 'mousedown') {
    const at = pointFor(target, run.root);
    run.press = { kind, at };
    await pointer(kind, 'down', at);
    return;
  }
  const held = run.press;
  if (held === null) {
    throw new Error(`A ${trigger.event} needs a press before it, and the rule gives none`);
  }
  const at = { x: held.at.x + (trigger.dx ?? 0), y: held.at.y + (trigger.dy ?? 0) };
  if (trigger.event === 'pointermove') {
    await pointer(held.kind, 'move', at);
    return;
  }
  if (trigger.event === 'pointercancel' && held.kind === 'mouse') {
    throw new Error('A mouse cannot cancel its pointer; only a touch can');
  }
  run.press = null;
  await pointer(held.kind, trigger.event === 'pointercancel' ? 'cancel' : 'up', at);
}

function blurred(trigger: Trigger, run: Run): void {
  const target = eventTarget(trigger.target, run.root);
  if (target instanceof HTMLElement) {
    target.blur();
    return;
  }
  if (target !== window || window.parent === window) {
    throw new Error(`Nothing takes focus away from ${trigger.target ?? 'the root'}`);
  }
  window.focus();
  window.parent.focus();
}

async function fire(trigger: Trigger, run: Run): Promise<void> {
  switch (trigger.event) {
    case 'mount':
      break;
    case 'unmount':
      if (run.mounted !== null) await unmount(run.mounted);
      run.mounted = null;
      break;
    case 'set':
      run.controls.set(trigger.prop ?? '', trigger.value);
      break;
    case 'call':
      run.controls.call(trigger.method ?? '', trigger.value);
      break;
    case 'time':
      vi.advanceTimersByTime(trigger.ms ?? 0);
      break;
    case 'animationsend':
    case 'transitionend':
      await finishAnimations(eventTarget(trigger.target, run.root));
      break;
    case 'toggle':
      await enterTopLayer();
      break;
    case 'scroll':
      scrolledToTop(trigger);
      break;
    case 'blur':
      blurred(trigger, run);
      break;
    case 'focusin':
      elementTarget(trigger, run.root).focus();
      break;
    case 'focusout':
      elementTarget(trigger, run.root).blur();
      break;
    case 'click':
      await recorded('click', run, () => click(trigger, run));
      break;
    case 'keydown':
      await recorded('keydown', run, () => keydown(trigger, run));
      break;
    case 'mousedown':
    case 'pointerdown':
    case 'pointermove':
    case 'pointerup':
    case 'pointercancel':
      await recorded(trigger.event, run, () => pointerAction(trigger, run));
      break;
    case 'mouseenter':
      await userEvent.hover(elementTarget(trigger, run.root));
      break;
    case 'mouseleave':
      await userEvent.unhover(elementTarget(trigger, run.root));
      break;
    case 'input':
      await userEvent.fill(elementTarget(trigger, run.root), String(trigger.value ?? ''));
      break;
    case 'change':
      await userEvent.upload(
        elementTarget(trigger, run.root),
        new File(['text'], 'notes.txt', { type: 'text/plain' }),
      );
      break;
    case 'dragenter':
    case 'dragleave':
    case 'dragover':
    case 'drop':
      dispatched(eventTarget(trigger.target, run.root), dragEvent(trigger), run);
      break;
    default:
      dispatched(
        eventTarget(trigger.target, run.root),
        new Event(trigger.event, { bubbles: true, cancelable: true, composed: true }),
        run,
      );
  }
  await settle();
}

function isOpen(element: Element): boolean {
  if (element instanceof HTMLDialogElement || element instanceof HTMLDetailsElement) {
    return element.open;
  }
  return element.matches(':popover-open');
}

function styleValue(element: Element, name: string): string {
  return element instanceof HTMLElement ? element.style.getPropertyValue(name).trim() : '';
}

type StyleValue = string | null | Measured;

function withinTolerance(written: string, measured: Measured): boolean {
  if (!written.endsWith(measured.unit)) return false;
  const amount = Number.parseFloat(written.slice(0, written.length - measured.unit.length));
  return Number.isFinite(amount) && Math.abs(amount - measured.value) <= measured.tolerance;
}

function styleHolds(element: Element, name: string, value: StyleValue): boolean {
  const written = styleValue(element, name);
  if (value === 'set') return written !== '';
  if (typeof value === 'string' || value === null) return written === (value ?? '');
  return withinTolerance(written, value);
}

function holds(state: ElementState): boolean {
  const element = document.querySelector(state.selector);
  if (element === null) return state.present === false;
  if (state.present === false) return false;
  const attributes = Object.entries(state.attributes ?? {}).every(
    ([name, value]) => element.getAttribute(name) === value,
  );
  const classes = Object.entries(state.classes ?? {}).every(
    ([name, present]) => element.classList.contains(name) === present,
  );
  const style = Object.entries(state.style ?? {}).every(([name, value]) =>
    styleHolds(element, name, value),
  );
  const properties = Object.entries(state.properties ?? {}).every(
    ([name, value]) => Reflect.get(element, name) === value,
  );
  const focused =
    state.focused === undefined || (document.activeElement === element) === state.focused;
  const open = state.open === undefined || isOpen(element) === state.open;
  return attributes && classes && style && properties && focused && open;
}

function reachFocus(state: ElementState): boolean {
  const onlyFocus = Object.keys(state).every((key) => key === 'selector' || key === 'focused');
  const element = document.querySelector(state.selector);
  if (!onlyFocus || !(element instanceof HTMLElement)) return false;
  if (state.focused === true) element.focus();
  else element.blur();
  return true;
}

async function given(rule: Rule, subject: RuleSubject, run: Run): Promise<void> {
  const reaching = {
    controls: run.controls,
    root: run.root,
    settle,
    fire: (trigger: Trigger) => fire(trigger, run),
  };
  for (const state of rule.given ?? []) {
    if (holds(state)) continue;
    const reached = (await subject.reach?.(state, reaching)) === true || reachFocus(state);
    if (!reached) throw new Error(`Nothing reaches the given state of ${state.selector}`);
    await settle();
    if (!holds(state)) throw new Error(`The given state of ${state.selector} was not reached`);
  }
  run.last = null;
}

function expectState(state: ElementState): void {
  const element = document.querySelector(state.selector);
  if (state.present !== undefined) {
    expect({ selector: state.selector, present: element !== null }).toEqual({
      selector: state.selector,
      present: state.present,
    });
  }
  if (element === null) {
    expect(state.present, `${state.selector} is missing`).toBe(false);
    return;
  }
  for (const [name, value] of Object.entries(state.attributes ?? {})) {
    expect(element.getAttribute(name), `${state.selector} [${name}]`).toBe(value);
  }
  for (const [name, present] of Object.entries(state.classes ?? {})) {
    expect(element.classList.contains(name), `${state.selector} .${name}`).toBe(present);
  }
  for (const [name, value] of Object.entries(state.style ?? {})) {
    const written = styleValue(element, name);
    if (value === 'set') expect(written, `${state.selector} ${name}`).not.toBe('');
    else if (typeof value === 'string' || value === null) {
      expect(written, `${state.selector} ${name}`).toBe(value ?? '');
    } else {
      const within = `${value.value}${value.unit} within ${value.tolerance}`;
      expect(
        withinTolerance(written, value),
        `${state.selector} ${name} is ${written}, not ${within}`,
      ).toBe(true);
    }
  }
  for (const [name, value] of Object.entries(state.properties ?? {})) {
    expect(Reflect.get(element, name), `${state.selector} .${name}`).toBe(value);
  }
  if (state.focused !== undefined) {
    expect(document.activeElement === element, `${state.selector} focused`).toBe(state.focused);
  }
  if (state.open !== undefined) {
    expect(isOpen(element), `${state.selector} open`).toBe(state.open);
  }
}

function isPlainObject(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isComparedValue(value: unknown, described: unknown): boolean {
  if (value === null || typeof value !== 'object') return true;
  return isPlainObject(value) && isPlainObject(described);
}

function expectEmitted(rule: Rule, controls: RuleControls): void {
  for (const expected of rule.emits ?? []) {
    const call = controls.emitted.find((emitted) => emitted.callback === expected.callback);
    expect(call, `${expected.callback} was called`).toBeDefined();
    const [first] = call?.values ?? [];
    if (expected.with !== undefined && isComparedValue(first, expected.with)) {
      expect(first, `${expected.callback} was called with`).toEqual(expected.with);
    }
  }
}

function expectEventOutcome(rule: Rule, last: Event | null): void {
  if (rule.event === undefined) return;
  if (rule.event.defaultPrevented !== undefined) {
    expect(last?.defaultPrevented, 'the default was prevented').toBe(rule.event.defaultPrevented);
  }
  if (rule.event.dropEffect !== undefined) {
    const effect = last instanceof DragEvent ? last.dataTransfer?.dropEffect : undefined;
    expect(effect, 'the drop effect').toBe(rule.event.dropEffect);
  }
}

function laidOut(subject: RuleSubject): HTMLStyleElement | null {
  if (subject.layout === undefined) return null;
  const sheet = document.createElement('style');
  sheet.textContent = subject.layout;
  document.head.append(sheet);
  return sheet;
}

async function runRule(rule: Rule): Promise<void> {
  const subject = subjectFor(rule);
  await commands.rulePointerAway();
  if (subject.coarsePointer === true) await commands.ruleCoarsePointer(true);
  const layout = laidOut(subject);
  const root = document.createElement('div');
  document.body.append(root);
  const controls = new RuleControls(rule.options ?? {}, document.body);
  subject.prepare?.(controls);
  const run: Run = {
    controls,
    root,
    mounted: mount(RuleHost, { target: root, props: { subject, controls } }),
    press: null,
    last: null,
  };
  let disconnect: (() => void) | undefined;
  try {
    await settle();
    disconnect = subject.connect?.(controls);
    await given(rule, subject, run);
    for (const trigger of rule.when) await fire(trigger, run);
    for (const state of rule.then ?? []) expectState(state);
    expectEmitted(rule, controls);
    expectEventOutcome(rule, run.last);
  } finally {
    if (run.press !== null) await release(run, run.press.at);
    disconnect?.();
    if (run.mounted !== null) await unmount(run.mounted);
    root.remove();
    layout?.remove();
    if (subject.coarsePointer === true) await commands.ruleCoarsePointer(false);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe.each(rulesFiles().map((file) => [file.component, file] as const))(
  'the %s rules',
  (_component, file) => {
    for (const rule of file.rules) {
      const reason = unproducible(rule);
      if (!rule.certain) {
        it.todo(rule.name);
      } else if (reason !== null) {
        it.todo(`${rule.name} (${reason})`);
      } else {
        it(rule.name, async () => {
          if (rule.when.some((trigger) => trigger.event === 'time')) {
            vi.useFakeTimers({
              toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
            });
          }
          await runRule(rule);
        });
      }
    }
  },
);
