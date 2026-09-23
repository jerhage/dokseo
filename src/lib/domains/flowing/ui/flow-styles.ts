import { lineSpacingHeight, textSizePercent } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';

const READABLE_ON_A_DARK_PAGE = `
  @namespace epub "http://www.idpf.org/2007/ops";

  html {
    color-scheme: dark;
  }

  html, body {
    background: transparent !important;
  }

  a:link,
  a:visited {
    color: #8fb8d8;
  }

  rt {
    font-size: 0.6em;
  }
`;

const OVERRIDES_A_BOOK_THAT_FORCES_ITS_OWN_INK = `
  html, body, p, div, span, li, dd, dt, blockquote, h1, h2, h3, h4, h5, h6 {
    color: inherit;
  }

  body {
    color: #d9d6d0;
  }
`;

const A_SELECTION_IS_SEEN_WHEREVER_FOCUS_IS = `
  ::selection {
    background: rgba(79, 178, 134, 0.35) !important;
    color: #f2efe9 !important;
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

function flowStyles(settings: ReadingSettings): readonly [string, string] {
  return [
    READABLE_ON_A_DARK_PAGE,
    `${OVERRIDES_A_BOOK_THAT_FORCES_ITS_OWN_INK}${A_SELECTION_IS_SEEN_WHEREVER_FOCUS_IS}${sizedForTheReader(settings)}`,
  ];
}

export { flowStyles };
