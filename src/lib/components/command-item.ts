type CommandItemElement = 'a' | 'button' | 'div';

function commandItemElement(href: string | undefined, interactive: boolean): CommandItemElement {
  if (!interactive) return 'div';

  return href === undefined ? 'button' : 'a';
}

export { commandItemElement };
export type { CommandItemElement };
