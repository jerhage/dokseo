import '../core/styles/index.css';
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import type { Component, Snippet } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import ContextMenu from './ContextMenu.svelte';
import Dropdown from './Dropdown.svelte';
import { overlaySpacing } from './overlay-placement';
import Popover from './Popover.svelte';
import Tooltip from './Tooltip.svelte';

type TriggerProps = Record<string | symbol, unknown>;

type Mounted = {
  readonly host: HTMLElement;
  readonly mounted: ReturnType<typeof mount>;
};

const ITEMS = ['Copy', 'Paste', 'Rename', 'Duplicate', 'Move', 'Archive', 'Delete'];

let current: Mounted | null = null;

function isAttachment(value: unknown): value is Attachment<HTMLElement> {
  return typeof value === 'function';
}

function triggerSnippet(text: string): Snippet<[TriggerProps]> {
  return createRawSnippet((props: () => TriggerProps) => ({
    render: () => `<button type="button" class="btn">${text}</button>`,
    setup: (element) => {
      const given = props();
      for (const [name, value] of Object.entries(given)) element.setAttribute(name, String(value));
      if (!(element instanceof HTMLElement)) return;
      const cleanups = Object.getOwnPropertySymbols(given)
        .map((key) => given[key])
        .filter(isAttachment)
        .map((attach) => attach(element));
      return () => {
        for (const cleanup of cleanups) cleanup?.();
      };
    },
  }));
}

function markupSnippet(markup: string): Snippet {
  return createRawSnippet(() => ({ render: () => markup }));
}

function itemsMarkup(): string {
  const buttons = ITEMS.map(
    (item) => `<button type="button" role="menuitem" class="dropdown-item">${item}</button>`,
  );
  return `<div>${buttons.join('')}</div>`;
}

function mountNearBottom<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.insetInlineStart = '16px';
  host.style.bottom = '16px';
  document.body.append(host);
  const mounted = mount(component, { target: host, props });
  flushSync();
  current = { host, mounted };
  return host;
}

function found<Kind extends Element>(root: ParentNode, selector: string): Kind {
  const element = root.querySelector<Kind>(selector);
  if (element === null) throw new Error(`Nothing matches ${selector}`);
  return element;
}

async function settle(overlay: Element): Promise<void> {
  flushSync();
  await tick();
  for (const animation of overlay.getAnimations({ subtree: true })) animation.finish();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  flushSync();
}

function gapAbove(anchor: Element, overlay: Element): number {
  return anchor.getBoundingClientRect().top - overlay.getBoundingClientRect().bottom;
}

function gapOf(overlay: Element): number {
  return overlaySpacing(getComputedStyle(overlay)).gap;
}

function removeItemsAfterFirst(overlay: Element): void {
  for (const item of [...overlay.querySelectorAll('.dropdown-item')].slice(1)) item.remove();
}

afterEach(() => {
  if (current === null) return;
  unmount(current.mounted);
  current.host.remove();
  current = null;
});

describe('overlay placement as the overlay changes size', () => {
  it('keeps a popover above its trigger one gap above it as its content grows and shrinks', async () => {
    const host = mountNearBottom(Popover, {
      label: 'Details',
      trigger: triggerSnippet('Details'),
      children: markupSnippet('<div data-body><p>First paragraph.</p></div>'),
    });
    const trigger = found<HTMLElement>(host, 'button');
    const popover = found<HTMLElement>(host, '[role="dialog"]');
    const body = found<HTMLElement>(popover, '[data-body]');
    const gap = gapOf(popover);

    await userEvent.click(trigger);
    await settle(popover);
    const firstHeight = popover.offsetHeight;
    expect(gapAbove(trigger, popover)).toBeCloseTo(gap, 0);

    const added = document.createElement('p');
    added.textContent = 'A second paragraph that makes the popover taller. '.repeat(4);
    body.append(added);
    await settle(popover);
    expect(popover.offsetHeight).toBeGreaterThan(firstHeight);
    expect(gapAbove(trigger, popover)).toBeCloseTo(gap, 0);

    added.remove();
    await settle(popover);
    expect(popover.offsetHeight).toBe(firstHeight);
    expect(gapAbove(trigger, popover)).toBeCloseTo(gap, 0);
  });

  it('keeps a tooltip above its trigger one gap above it as its text changes while shown', async () => {
    const host = mountNearBottom(Tooltip, { text: 'Short', trigger: triggerSnippet('Save') });
    const trigger = found<HTMLElement>(host, 'button');
    const tooltip = found<HTMLElement>(host, '[role="tooltip"]');
    const gap = gapOf(tooltip);

    trigger.focus();
    await settle(tooltip);
    const shortHeight = tooltip.offsetHeight;
    expect(gapAbove(trigger, tooltip)).toBeCloseTo(gap, 0);

    tooltip.textContent = 'A much longer tooltip text that wraps onto several lines. '.repeat(3);
    await settle(tooltip);
    expect(tooltip.offsetHeight).toBeGreaterThan(shortHeight);
    expect(gapAbove(trigger, tooltip)).toBeCloseTo(gap, 0);

    tooltip.textContent = 'Short';
    await settle(tooltip);
    expect(tooltip.offsetHeight).toBe(shortHeight);
    expect(gapAbove(trigger, tooltip)).toBeCloseTo(gap, 0);
  });

  it('keeps a dropdown menu above its trigger one gap above it as its items change while open', async () => {
    const host = mountNearBottom(Dropdown, {
      trigger: markupSnippet('<span>Actions</span>'),
      children: markupSnippet(itemsMarkup()),
    });
    const trigger = found<HTMLElement>(host, '.dropdown-trigger');
    const menu = found<HTMLElement>(host, '[role="menu"]');
    const gap = gapOf(menu);

    await userEvent.click(trigger);
    await settle(menu);
    const fullHeight = menu.offsetHeight;
    expect(gapAbove(trigger, menu)).toBeCloseTo(gap, 0);

    removeItemsAfterFirst(menu);
    await settle(menu);
    expect(menu.offsetHeight).toBeLessThan(fullHeight);
    expect(gapAbove(trigger, menu)).toBeCloseTo(gap, 0);
  });

  it('keeps a context menu above its element one gap above it as its items change while open', async () => {
    const host = mountNearBottom(ContextMenu, {
      label: 'Actions',
      menu: markupSnippet(itemsMarkup()),
      children: markupSnippet('<button type="button" class="btn">Area</button>'),
    });
    const area = found<HTMLElement>(host, '.btn');
    const menu = found<HTMLElement>(host, '[role="menu"]');
    const gap = gapOf(menu);

    area.focus();
    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    await settle(menu);
    const fullHeight = menu.offsetHeight;
    expect(gapAbove(area, menu)).toBeCloseTo(gap, 0);

    removeItemsAfterFirst(menu);
    await settle(menu);
    expect(menu.offsetHeight).toBeLessThan(fullHeight);
    expect(gapAbove(area, menu)).toBeCloseTo(gap, 0);
  });
});
