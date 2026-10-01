import type { KeyTarget } from './flow-turn';

function isEditable(target: EventTarget): boolean {
  if (!('isContentEditable' in target)) return false;

  const editable = target.isContentEditable;
  return typeof editable === 'boolean' && editable;
}

function controlType(target: EventTarget): string | null {
  if (!('type' in target)) return null;

  const kind = target.type;
  return typeof kind === 'string' ? kind : null;
}

function controlRole(target: EventTarget): string | null {
  if (!('role' in target)) return null;

  const named = target.role;
  return typeof named === 'string' ? named : null;
}

function keyTarget(target: EventTarget | null): KeyTarget | null {
  if (target === null) return null;
  if (!('tagName' in target)) return null;

  const tagName = target.tagName;
  if (typeof tagName !== 'string') return null;

  return {
    tagName,
    type: controlType(target),
    role: controlRole(target),
    editable: isEditable(target),
  };
}

export { controlRole, controlType, isEditable, keyTarget };
