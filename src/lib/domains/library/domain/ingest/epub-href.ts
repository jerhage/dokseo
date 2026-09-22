function directoryOf(entry: string): string {
  const cut = entry.lastIndexOf('/');
  return cut === -1 ? '' : entry.slice(0, cut);
}

function withoutFragment(href: string): string {
  const hash = href.indexOf('#');
  return hash === -1 ? href : href.slice(0, hash);
}

function decodedStep(step: string): string {
  try {
    return decodeURIComponent(step);
  } catch {
    return step;
  }
}

function normalized(steps: readonly string[]): readonly string[] {
  const kept: string[] = [];
  for (const step of steps) {
    if (step === '' || step === '.') continue;
    if (step === '..') {
      kept.pop();
      continue;
    }
    kept.push(step);
  }
  return kept;
}

function resolveHref(baseEntry: string, href: string): string {
  const target = withoutFragment(href.trim());
  if (target === '') return '';
  const directory = target.startsWith('/') ? '' : directoryOf(baseEntry);
  const joined = directory === '' ? target : `${directory}/${target}`;
  return normalized(joined.split('/').map(decodedStep)).join('/');
}

export { resolveHref };
