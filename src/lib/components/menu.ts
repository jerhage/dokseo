import { getContext, setContext } from 'svelte';
import type { Move } from './roving';

type Menu = {
  readonly close: () => void;
};

const MENU = Symbol('menu');

const OPENING_KEYS: Readonly<Record<string, Move>> = {
  ArrowDown: 'first',
  ArrowUp: 'last',
};

function menuOpening(key: string): Move | undefined {
  return Object.hasOwn(OPENING_KEYS, key) ? OPENING_KEYS[key] : undefined;
}

function provideMenu(menu: Menu): void {
  setContext(MENU, menu);
}

function useMenu(): Menu {
  const menu = getContext<Menu | undefined>(MENU);
  if (menu === undefined) {
    throw new Error('No menu in context. Render a DropdownItem inside a Dropdown.');
  }
  return menu;
}

export { MENU, menuOpening, provideMenu, useMenu };
export type { Menu };
