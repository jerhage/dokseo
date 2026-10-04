function evaluates(): boolean {
  try {
    return new Function('return true')() === true;
  } catch {
    return false;
  }
}

postMessage({ isolated: crossOriginIsolated, evaluates: evaluates() });
