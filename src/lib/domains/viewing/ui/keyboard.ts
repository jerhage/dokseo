function handlesOwnKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

function handlesOwnSpace(target: EventTarget | null): boolean {
  if (handlesOwnKeys(target)) return true;
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'BUTTON' || target.getAttribute('role') === 'button';
}

export { handlesOwnKeys, handlesOwnSpace };
