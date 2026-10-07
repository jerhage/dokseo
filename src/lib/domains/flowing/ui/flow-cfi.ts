const CFI_WRAPPER = /^epubcfi\((.*)\)$/s;

const ESCAPE = '^';

const RANGE_SEPARATOR = ',';

function rangeParts(inner: string): readonly string[] {
  const parts: string[] = [];
  let part = '';
  let escaped = false;
  for (const char of inner) {
    if (escaped) {
      part += char;
      escaped = false;
    } else if (char === ESCAPE) {
      part += char;
      escaped = true;
    } else if (char === RANGE_SEPARATOR) {
      parts.push(part);
      part = '';
    } else part += char;
  }
  parts.push(part);

  return parts;
}

function collapsedCfi(cfi: string): boolean {
  const inner = CFI_WRAPPER.exec(cfi.trim())?.[1];
  if (inner === undefined) return false;

  const parts = rangeParts(inner);
  if (parts.length !== 3) return false;

  return parts[1] === parts[2];
}

export { collapsedCfi };
