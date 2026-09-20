const DICTIONARY_KEY = 'character_dict:';

const ENTRY_PREFIX = '  - ';

const QUOTE = "'";

const BLANK_LABEL = '';

const SPACE_LABEL = ' ';

function unquoted(value: string): string {
  if (value.length < 2 || !value.startsWith(QUOTE) || !value.endsWith(QUOTE)) return value;
  return value.slice(1, -1).replaceAll(`${QUOTE}${QUOTE}`, QUOTE);
}

export function characterDictionary(config: string): readonly string[] {
  const lines = config.split('\n').map((line) => line.replace(/\r$/u, ''));
  const opened = lines.findIndex((line) => line.trim() === DICTIONARY_KEY);
  if (opened < 0) return [];

  const entries: string[] = [];
  for (const line of lines.slice(opened + 1)) {
    if (!line.startsWith(ENTRY_PREFIX)) break;
    entries.push(unquoted(line.slice(ENTRY_PREFIX.length)));
  }

  return entries;
}

export function ctcLabels(entries: readonly string[]): readonly string[] {
  return [BLANK_LABEL, ...entries, SPACE_LABEL];
}
