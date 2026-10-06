type IconButtonTooltip = string | false;

type IconButtonTip =
  | { readonly kind: 'none' }
  | { readonly kind: 'title'; readonly text: string }
  | { readonly kind: 'hint'; readonly text: string; readonly describes: boolean };

function iconButtonTitle(
  label: string,
  tooltip: IconButtonTooltip | undefined,
): string | undefined {
  if (tooltip === false) return undefined;
  return tooltip ?? label;
}

function iconButtonTip(
  label: string,
  tooltip: IconButtonTooltip | undefined,
  hint: boolean,
): IconButtonTip {
  const text = iconButtonTitle(label, tooltip);
  if (text === undefined) return { kind: 'none' };
  if (!hint) return { kind: 'title', text };
  return { kind: 'hint', text, describes: text !== label };
}

export { iconButtonTip, iconButtonTitle };
export type { IconButtonTip, IconButtonTooltip };
