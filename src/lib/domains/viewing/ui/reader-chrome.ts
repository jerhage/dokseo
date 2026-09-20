export type ChromeToggle = {
  readonly label: string;
  readonly glyph: string;
  readonly pressed: boolean;
};

export function chromeShown(asked: boolean, held: boolean): boolean {
  return asked || held;
}

export function chromeToggle(shown: boolean): ChromeToggle {
  return {
    label: shown ? 'Hide the toolbars' : 'Show the toolbars',
    glyph: '☰',
    pressed: shown,
  };
}
