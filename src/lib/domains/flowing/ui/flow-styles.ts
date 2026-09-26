import { lineSpacingHeight, textSizePercent } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';

type PageScheme = 'light' | 'dark';

type PageInk = {
  readonly scheme: PageScheme;
  readonly text: string;
  readonly link: string;
  readonly selection: string;
  readonly selectionText: string;
};

const INK_FOR_THE_DARK_PAGE: PageInk = {
  scheme: 'dark',
  text: '#d9d6d0',
  link: '#8fb8d8',
  selection: 'rgba(79, 178, 134, 0.35)',
  selectionText: '#f2efe9',
};

function readableOnThePage(ink: PageInk): string {
  return `
  @namespace epub "http://www.idpf.org/2007/ops";

  html {
    color-scheme: ${ink.scheme};
  }

  html, body {
    background: transparent !important;
  }

  a:link,
  a:visited {
    color: ${ink.link};
  }

  rt {
    font-size: 0.6em;
  }
`;
}

function overridesABookThatForcesItsOwnInk(ink: PageInk): string {
  return `
  html, body, p, div, span, li, dd, dt, blockquote, h1, h2, h3, h4, h5, h6 {
    color: inherit;
  }

  body {
    color: ${ink.text};
  }
`;
}

function aSelectionIsSeenWhereverFocusIs(ink: PageInk): string {
  return `
  ::selection {
    background: ${ink.selection} !important;
    color: ${ink.selectionText} !important;
  }
`;
}

const THE_READINGS_ARE_PUT_AWAY = `
  rt, rp {
    display: none !important;
  }
`;

function sizedForTheReader(settings: ReadingSettings): string {
  return `
  html {
    font-size: ${textSizePercent(settings.textSize)}% !important;
  }

  p, li, dd, blockquote {
    line-height: ${lineSpacingHeight(settings.lineSpacing)} !important;
  }
`;
}

function flowStyles(
  settings: ReadingSettings,
  ink: PageInk = INK_FOR_THE_DARK_PAGE,
): readonly [string, string] {
  const readings = settings.showPhoneticReadings ? '' : THE_READINGS_ARE_PUT_AWAY;

  return [
    readableOnThePage(ink),
    `${overridesABookThatForcesItsOwnInk(ink)}${aSelectionIsSeenWhereverFocusIs(ink)}${sizedForTheReader(settings)}${readings}`,
  ];
}

function sameInk(one: PageInk, other: PageInk): boolean {
  return (
    one.scheme === other.scheme &&
    one.text === other.text &&
    one.link === other.link &&
    one.selection === other.selection &&
    one.selectionText === other.selectionText
  );
}

export { flowStyles, INK_FOR_THE_DARK_PAGE, sameInk };
export type { PageInk, PageScheme };
