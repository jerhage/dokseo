import { match } from 'ts-pattern';
import type { Card } from './capture-cards.svelte';

type NoteTool =
  | { readonly kind: 'none' }
  | { readonly kind: 'add'; readonly label: string }
  | { readonly kind: 'edit'; readonly label: string };

type TextTool =
  | { readonly kind: 'none' }
  | { readonly kind: 'shown'; readonly label: string }
  | { readonly kind: 'tucked'; readonly label: string };

type CardTools = {
  readonly note: NoteTool;
  readonly text: TextTool;
  readonly copies: string | null;
};

type ToolCard = Pick<Card, 'editable' | 'noteLabel' | 'annotation' | 'text' | 'origin' | 'place'>;

const NO_NOTE: NoteTool = { kind: 'none' };

function noteTool(card: ToolCard): NoteTool {
  if (card.noteLabel === null) return NO_NOTE;

  return card.annotation === null
    ? { kind: 'add', label: card.noteLabel }
    : { kind: 'edit', label: card.noteLabel };
}

function textTool(card: ToolCard): TextTool {
  if (!card.editable) return { kind: 'none' };

  const label = `Edit the text of the capture at ${card.place}`;
  return match<ToolCard['origin'], TextTool>(card.origin)
    .with('written', () => ({ kind: 'shown', label: `Edit the note at ${card.place}` }))
    .with('recognized', () => ({ kind: 'shown', label }))
    .with('lifted', () => ({ kind: 'tucked', label }))
    .exhaustive();
}

function copiedText(card: ToolCard): string | null {
  const text = card.text?.trim() ?? '';
  return text.length === 0 ? null : text;
}

function cardTools(card: ToolCard): CardTools {
  return {
    note: noteTool(card),
    text: textTool(card),
    copies: copiedText(card),
  };
}

export { cardTools };
export type { CardTools, NoteTool, TextTool, ToolCard };
