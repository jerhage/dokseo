type CommandItemElement = 'a' | 'button' | 'div';

function commandItemElement(
  href: string | undefined,
  element: CommandItemElement | undefined,
): CommandItemElement {
  if (element !== undefined) return element;

  return href === undefined ? 'button' : 'a';
}

export { commandItemElement };
export type { CommandItemElement };
