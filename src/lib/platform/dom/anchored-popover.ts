const GAP = 8;

const EDGE = 8;

type Anchor = () => HTMLElement | null;

function anchoredTo(
  sheet: HTMLElement,
  anchor: Anchor,
): { update(next: Anchor): void; destroy(): void } {
  let trigger = anchor;
  let shown = false;

  function place(): void {
    const at = trigger()?.getBoundingClientRect();
    if (at === undefined) return;

    const box = sheet.getBoundingClientRect();
    const below = window.innerHeight - at.bottom - GAP - EDGE;
    const above = at.top - GAP - EDGE;
    const flips = box.height > below && above > below;
    const top = flips ? at.top - GAP - box.height : at.bottom + GAP;
    const lowest = window.innerHeight - box.height - EDGE;
    const rightmost = window.innerWidth - box.width - EDGE;

    sheet.style.top = `${Math.max(EDGE, Math.min(top, lowest))}px`;
    sheet.style.left = `${Math.max(EDGE, Math.min(at.left, rightmost))}px`;
  }

  function onToggle(event: Event): void {
    shown = (event as ToggleEvent).newState === 'open';
    if (shown) place();
  }

  function onMove(): void {
    if (shown) place();
  }

  sheet.addEventListener('toggle', onToggle);
  window.addEventListener('scroll', onMove, true);
  window.addEventListener('resize', onMove);

  return {
    update(next: Anchor): void {
      trigger = next;
    },
    destroy(): void {
      sheet.removeEventListener('toggle', onToggle);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    },
  };
}

export { anchoredTo };
