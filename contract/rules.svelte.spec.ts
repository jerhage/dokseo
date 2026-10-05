import '../core/styles/index.css';
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rulesFileProblems } from '../core/rules/schema.js';
import type { ElementState, Rule, RulesFile, Trigger } from '../core/rules/schema.js';
import { RuleControls } from './rule-controls.svelte';
import { RULE_SUBJECTS } from './rule-subjects';
import type { RuleSubject } from './rule-subjects';
import RuleHost from './RuleHost.svelte';

type Mounted = ReturnType<typeof mount>;

type Pointer = { readonly x: number; readonly y: number };

type Run = {
  readonly controls: RuleControls;
  readonly root: HTMLElement;
  mounted: Mounted | null;
  press: Pointer;
  last: Event | null;
};

const LOADED = import.meta.glob('../core/rules/*.json', { eager: true, import: 'default' });

const POINTER_ID = 1;

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

function centreOf(target: EventTarget): Pointer {
  if (!(target instanceof Element)) return { x: 0, y: 0 };
  const box = target.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function carriedFiles(trigger: Trigger): DataTransfer {
  const transfer = new DataTransfer();
  if (trigger.files === true) {
    transfer.items.add(new File(['text'], 'notes.txt', { type: 'text/plain' }));
  }
  return transfer;
}

function pointerAt(trigger: Trigger, run: Run, target: EventTarget): Pointer {
  if (trigger.event === 'pointerdown') return centreOf(target);
  return { x: run.press.x + (trigger.dx ?? 0), y: run.press.y + (trigger.dy ?? 0) };
}

function pointerEvent(trigger: Trigger, at: Pointer): PointerEvent {
  return new PointerEvent(trigger.event, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: POINTER_ID,
    pointerType: trigger.pointerType ?? 'mouse',
    isPrimary: true,
    button: 0,
    buttons: trigger.event === 'pointerup' || trigger.event === 'pointercancel' ? 0 : 1,
    clientX: at.x,
    clientY: at.y,
  });
}

async function finishAnimations(target: EventTarget): Promise<void> {
  if (!(target instanceof Element)) return;
  const running = target.getAnimations({ subtree: true });
  for (const animation of running) animation.finish();
  await Promise.all(running.map((animation) => animation.finished));
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

function dispatched(target: EventTarget, event: Event, run: Run): void {
  run.last = event;
  target.dispatchEvent(event);
}

function domEvent(trigger: Trigger, target: EventTarget): Event {
  const init = { bubbles: true, cancelable: true, composed: true };
  switch (trigger.event) {
    case 'click':
    case 'mousedown':
      return new MouseEvent(trigger.event, { ...init, detail: trigger.detail ?? 1 });
    case 'mouseenter':
    case 'mouseleave':
      return new MouseEvent(trigger.event, { bubbles: false, cancelable: false });
    case 'keydown':
      return new KeyboardEvent('keydown', {
        ...init,
        key: trigger.key ?? '',
        shiftKey: trigger.shiftKey === true,
      });
    case 'dragenter':
    case 'dragleave':
    case 'dragover':
    case 'drop':
      return new DragEvent(trigger.event, { ...init, dataTransfer: carriedFiles(trigger) });
    case 'focusin':
    case 'focusout':
      return new FocusEvent(trigger.event, { bubbles: true });
    case 'transitionend':
      return new TransitionEvent('transitionend', { ...init, propertyName: 'transform' });
    case 'input':
      if (target instanceof HTMLInputElement) target.value = String(trigger.value ?? '');
      return new InputEvent('input', init);
    case 'change':
      if (target instanceof HTMLInputElement && target.type === 'file') {
        target.files = carriedFiles({ ...trigger, files: true }).files;
      }
      return new Event('change', { bubbles: true });
    default:
      return new Event(trigger.event, init);
  }
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
      await finishAnimations(eventTarget(trigger.target, run.root));
      break;
    case 'toggle':
      await enterTopLayer();
      break;
    case 'blur': {
      const target = eventTarget(trigger.target, run.root);
      if (target instanceof HTMLElement) target.blur();
      break;
    }
    case 'pointerdown':
    case 'pointermove':
    case 'pointerup':
    case 'pointercancel': {
      const target = eventTarget(trigger.target, run.root);
      const at = pointerAt(trigger, run, target);
      if (trigger.event === 'pointerdown') run.press = at;
      dispatched(target, pointerEvent(trigger, at), run);
      break;
    }
    default: {
      const target = eventTarget(trigger.target, run.root);
      dispatched(target, domEvent(trigger, target), run);
    }
  }
  await settle();
}

function isOpen(element: Element): boolean {
  if (element instanceof HTMLDialogElement || element instanceof HTMLDetailsElement) {
    return element.open;
  }
  return element.matches(':popover-open');
}

function setOpen(element: Element, open: boolean): void {
  if (isOpen(element) === open) return;
  if (element instanceof HTMLDialogElement) {
    if (open) element.showModal();
    else element.close();
  } else if (element instanceof HTMLDetailsElement) {
    element.open = open;
  } else if (element instanceof HTMLElement) {
    if (open) element.showPopover();
    else element.hidePopover();
  }
}

function applied(state: ElementState): void {
  const element = document.querySelector(state.selector);
  if (element === null) throw new Error(`No element matches the given ${state.selector}`);
  for (const [name, value] of Object.entries(state.attributes ?? {})) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
  for (const [name, present] of Object.entries(state.classes ?? {})) {
    element.classList.toggle(name, present);
  }
  if (element instanceof HTMLElement) {
    for (const [name, value] of Object.entries(state.style ?? {})) {
      if (value === null) element.style.removeProperty(name);
      else element.style.setProperty(name, value);
    }
    for (const [name, value] of Object.entries(state.properties ?? {})) {
      Reflect.set(element, name, value);
    }
    if (state.focused === true) element.focus();
    if (state.focused === false) element.blur();
  }
  if (state.open !== undefined) setOpen(element, state.open);
}

async function given(rule: Rule, subject: RuleSubject, run: Run): Promise<void> {
  for (const state of rule.given ?? []) {
    const reached =
      subject.reach === undefined
        ? false
        : await subject.reach(state, { controls: run.controls, root: run.root, settle });
    if (!reached) applied(state);
    await settle();
  }
}

function styleValue(element: Element, name: string): string {
  return element instanceof HTMLElement ? element.style.getPropertyValue(name).trim() : '';
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
    else expect(written, `${state.selector} ${name}`).toBe(value ?? '');
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

function expectEmitted(rule: Rule, controls: RuleControls): void {
  for (const expected of rule.emits ?? []) {
    const call = controls.emitted.find((emitted) => emitted.callback === expected.callback);
    expect(call, `${expected.callback} was called`).toBeDefined();
    const [first] = call?.values ?? [];
    if (expected.with !== undefined && (first === null || typeof first !== 'object')) {
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

async function runRule(rule: Rule): Promise<void> {
  const subject = subjectFor(rule);
  const root = document.createElement('div');
  document.body.append(root);
  const controls = new RuleControls(rule.options ?? {}, document.body);
  subject.prepare?.(controls);
  const run: Run = {
    controls,
    root,
    mounted: mount(RuleHost, { target: root, props: { subject, controls } }),
    press: { x: 0, y: 0 },
    last: null,
  };
  try {
    await settle();
    await given(rule, subject, run);
    for (const trigger of rule.when) await fire(trigger, run);
    for (const state of rule.then ?? []) expectState(state);
    expectEmitted(rule, controls);
    expectEventOutcome(rule, run.last);
  } finally {
    if (run.mounted !== null) await unmount(run.mounted);
    root.remove();
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe.each(rulesFiles().map((file) => [file.component, file] as const))(
  'the %s rules',
  (_component, file) => {
    for (const rule of file.rules) {
      if (!rule.certain) {
        it.todo(rule.name);
        continue;
      }
      it(rule.name, async () => {
        if (rule.when.some((trigger) => trigger.event === 'time')) {
          vi.useFakeTimers({
            toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
          });
        }
        await runRule(rule);
      });
    }
  },
);
