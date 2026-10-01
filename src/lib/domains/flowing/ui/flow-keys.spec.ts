import { describe, expect, it } from 'vitest';
import { controlRole, controlType, isEditable, keyTarget } from './flow-keys';

function target<T extends object>(fields: T): EventTarget & T {
  return Object.assign(new EventTarget(), fields);
}

describe('keyTarget', () => {
  it('reads nothing from no target', () => {
    expect(keyTarget(null)).toBeNull();
  });

  it('reads nothing from a target without a tag name, such as the window', () => {
    expect(keyTarget(target({ type: 'text' }))).toBeNull();
  });

  it('reads nothing from a tag name that is not a string', () => {
    expect(keyTarget(target({ tagName: 7 }))).toBeNull();
  });

  it('reads the tag, type, role and editability of a control', () => {
    expect(
      keyTarget(
        target({ tagName: 'INPUT', type: 'range', role: 'slider', isContentEditable: false }),
      ),
    ).toEqual({ tagName: 'INPUT', type: 'range', role: 'slider', editable: false });
  });

  it('reads a bare element as having no type, no role and no editing', () => {
    expect(keyTarget(target({ tagName: 'DIV' }))).toEqual({
      tagName: 'DIV',
      type: null,
      role: null,
      editable: false,
    });
  });

  it('reads an editable host as editable', () => {
    expect(keyTarget(target({ tagName: 'P', isContentEditable: true }))?.editable).toBe(true);
  });
});

describe('isEditable', () => {
  it('reports only a true isContentEditable as editable', () => {
    expect(isEditable(target({ isContentEditable: true }))).toBe(true);
    expect(isEditable(target({ isContentEditable: false }))).toBe(false);
    expect(isEditable(target({ isContentEditable: 'true' }))).toBe(false);
    expect(isEditable(target({}))).toBe(false);
  });
});

describe('controlType', () => {
  it('reads a string type and nothing else', () => {
    expect(controlType(target({ type: 'checkbox' }))).toBe('checkbox');
    expect(controlType(target({ type: 3 }))).toBeNull();
    expect(controlType(target({}))).toBeNull();
  });
});

describe('controlRole', () => {
  it('reads a string role and nothing else', () => {
    expect(controlRole(target({ role: 'button' }))).toBe('button');
    expect(controlRole(target({ role: null }))).toBeNull();
    expect(controlRole(target({}))).toBeNull();
  });
});
