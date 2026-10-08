import { match } from 'ts-pattern';
import type { AcquisitionFormat } from './remote-publication';

const UNSAFE_CHARACTERS = /[\\/:*?"<>|\p{Cc}]/gu;
const LEADING_DOTS_AND_SPACES = /^[.\s]+/u;
const PARAMETER = /;\s*([^=;\s]+)\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*)/gu;
const EXTENDED_VALUE = /^([^']*)'[^']*'(.*)$/u;
const FALLBACK_STEM = 'book';

function extensionOf(format: AcquisitionFormat): string {
  return match(format)
    .with('epub', () => 'epub')
    .with('pdf', () => 'pdf')
    .with('cbz', () => 'cbz')
    .exhaustive();
}

function sanitisedFileName(name: string): string {
  return name
    .replace(UNSAFE_CHARACTERS, ' ')
    .replace(/\s+/gu, ' ')
    .replace(LEADING_DOTS_AND_SPACES, '')
    .trim();
}

function parametersOf(header: string): ReadonlyMap<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of `;${header}`.matchAll(PARAMETER)) {
    const key = (name ?? '').toLowerCase();
    if (!found.has(key)) found.set(key, value ?? '');
  }
  return found;
}

function unquoted(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('"')) return trimmed;
  return trimmed.slice(1, -1).replace(/\\(.)/gu, '$1');
}

function extendedName(value: string): string | null {
  const parts = EXTENDED_VALUE.exec(value.trim());
  if (parts === null || (parts[1] ?? '').toLowerCase() !== 'utf-8') return null;
  try {
    return decodeURIComponent(parts[2] ?? '');
  } catch {
    return null;
  }
}

function dispositionFileName(header: string | null): string | null {
  if (header === null) return null;
  const parameters = parametersOf(header);
  const extended = parameters.get('filename*');
  const plain = parameters.get('filename');
  const candidates = [
    extended === undefined ? null : extendedName(extended),
    plain === undefined ? null : unquoted(plain),
  ];
  for (const candidate of candidates) {
    const name = candidate === null ? '' : sanitisedFileName(candidate);
    if (name !== '') return name;
  }
  return null;
}

function fallbackFileName(title: string, format: AcquisitionFormat): string {
  const stem = sanitisedFileName(title);
  return `${stem === '' ? FALLBACK_STEM : stem}.${extensionOf(format)}`;
}

export { dispositionFileName, fallbackFileName, sanitisedFileName };
