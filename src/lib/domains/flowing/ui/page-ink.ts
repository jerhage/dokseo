import type { PageInk, PageScheme } from './flow-styles';

type InkReading = {
  readonly declaredScheme: string;
  readonly prefersDark: boolean;
  readonly text: string;
  readonly link: string;
  readonly selection: string;
};

function pageScheme(declared: string, prefersDark: boolean): PageScheme {
  const named = declared.split(/\s+/u);
  const light = named.includes('light');
  const dark = named.includes('dark');

  if (light && dark) return prefersDark ? 'dark' : 'light';
  return dark ? 'dark' : 'light';
}

function pageInk(reading: InkReading): PageInk {
  return {
    scheme: pageScheme(reading.declaredScheme, reading.prefersDark),
    text: reading.text,
    link: reading.link,
    selection: reading.selection,
    selectionText: reading.text,
  };
}

export { pageInk, pageScheme };
export type { InkReading };
