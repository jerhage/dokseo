import { afterEach, describe, expect, it, vi } from 'vitest';
import { OWN_CONTROLS, plainClick } from './plain-click';

type Listener = (event: { target: unknown }) => void;

class FakeElement {
  readonly control: FakeElement | null;
  constructor(control: FakeElement | null = null) {
    this.control = control;
  }
  closest(selector: string): FakeElement | null {
    expect(selector).toBe(OWN_CONTROLS);
    return this.control;
  }
}

function host(inside: readonly FakeElement[]) {
  let listener: Listener | null = null;
  let removed = false;
  const element = {
    addEventListener: (_type: string, given: Listener) => {
      listener = given;
    },
    removeEventListener: () => {
      removed = true;
    },
    contains: (node: FakeElement) => inside.includes(node),
  };
  return {
    element: element as unknown as HTMLElement,
    click: (target: unknown) => listener?.({ target }),
    wasRemoved: () => removed,
  };
}

describe('plainClick', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports a click outside the controls', () => {
    vi.stubGlobal('Element', FakeElement);
    const onclick = vi.fn();
    const { element, click } = host([]);
    plainClick(onclick)(element);
    click(new FakeElement());
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it('ignores a click on a control inside the element', () => {
    vi.stubGlobal('Element', FakeElement);
    const onclick = vi.fn();
    const button = new FakeElement();
    const { element, click } = host([button]);
    plainClick(onclick)(element);
    click(new FakeElement(button));
    expect(onclick).not.toHaveBeenCalled();
  });

  it('reports a click whose nearest control lies outside the element', () => {
    vi.stubGlobal('Element', FakeElement);
    const onclick = vi.fn();
    const { element, click } = host([]);
    plainClick(onclick)(element);
    click(new FakeElement(new FakeElement()));
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it('stops listening when torn down', () => {
    const { element, wasRemoved } = host([]);
    const teardown = plainClick(() => undefined)(element);
    if (typeof teardown === 'function') teardown();
    expect(wasRemoved()).toBe(true);
  });
});
