type IconButtonTooltip = string | false;

function iconButtonTitle(
  label: string,
  tooltip: IconButtonTooltip | undefined,
): string | undefined {
  if (tooltip === false) return undefined;
  return tooltip ?? label;
}

export { iconButtonTitle };
export type { IconButtonTooltip };
