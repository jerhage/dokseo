type TagColour =
  | 'slate'
  | 'clay'
  | 'sage'
  | 'plum'
  | 'rose'
  | 'ice'
  | 'ruby'
  | 'ember'
  | 'olive'
  | 'fern'
  | 'cyan'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'magenta'
  | 'stone';

type ColouredTag = { readonly colour: TagColour };

const TAG_COLOURS = [
  'slate',
  'clay',
  'sage',
  'plum',
  'rose',
  'ice',
  'ruby',
  'ember',
  'olive',
  'fern',
  'cyan',
  'sky',
  'indigo',
  'violet',
  'magenta',
  'stone',
] as const satisfies readonly TagColour[];

const FIRST_TAG_COLOUR: TagColour = TAG_COLOURS[0];

function colourUse(existing: readonly ColouredTag[]): ReadonlyMap<TagColour, number> {
  const used = new Map<TagColour, number>(TAG_COLOURS.map((colour) => [colour, 0]));
  for (const tag of existing) used.set(tag.colour, (used.get(tag.colour) ?? 0) + 1);

  return used;
}

function nextColour(existing: readonly ColouredTag[]): TagColour {
  const used = colourUse(existing);
  let fewest: TagColour = FIRST_TAG_COLOUR;

  for (const colour of TAG_COLOURS) {
    if ((used.get(colour) ?? 0) < (used.get(fewest) ?? 0)) fewest = colour;
  }

  return fewest;
}

export { TAG_COLOURS, FIRST_TAG_COLOUR, nextColour };
export type { TagColour, ColouredTag };
