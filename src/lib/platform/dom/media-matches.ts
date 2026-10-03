function mediaMatches(query: string): boolean {
  if (typeof matchMedia !== 'function') return false;

  return matchMedia(query).matches;
}

export { mediaMatches };
