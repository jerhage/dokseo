type WindowDrag = { readonly kind: 'idle' } | { readonly kind: 'carrying'; readonly depth: number };

const IDLE_DRAG: WindowDrag = { kind: 'idle' };

const FILES_TYPE = 'Files';

function carriesFiles(types: Iterable<string>): boolean {
  for (const type of types) if (type === FILES_TYPE) return true;
  return false;
}

function entered(drag: WindowDrag): WindowDrag {
  if (drag.kind === 'idle') return { kind: 'carrying', depth: 1 };
  return { kind: 'carrying', depth: drag.depth + 1 };
}

function left(drag: WindowDrag): WindowDrag {
  if (drag.kind === 'idle' || drag.depth <= 1) return IDLE_DRAG;
  return { kind: 'carrying', depth: drag.depth - 1 };
}

function dropped(): WindowDrag {
  return IDLE_DRAG;
}

export { IDLE_DRAG, carriesFiles, dropped, entered, left };
export type { WindowDrag };
