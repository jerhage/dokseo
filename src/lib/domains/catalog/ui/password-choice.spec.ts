import { describe, expect, it } from 'vitest';
import { passwordChoiceOf } from './password-choice';

describe('passwordChoiceOf', () => {
  it('forgets a remembered password when the catalog no longer signs in', () => {
    expect(
      passwordChoiceOf({ authKind: 'none', typed: false, remember: true, wasRemembered: true }),
    ).toEqual({ kind: 'forget' });
  });

  it('keeps everything when a catalog without sign-in remembered nothing', () => {
    expect(
      passwordChoiceOf({ authKind: 'none', typed: false, remember: false, wasRemembered: false }),
    ).toEqual({ kind: 'keep' });
  });

  it('unlocks with the checkbox value when a password was typed', () => {
    expect(
      passwordChoiceOf({ authKind: 'basic', typed: true, remember: true, wasRemembered: false }),
    ).toEqual({ kind: 'unlock', remember: true });
    expect(
      passwordChoiceOf({ authKind: 'basic', typed: true, remember: false, wasRemembered: true }),
    ).toEqual({ kind: 'unlock', remember: false });
  });

  it('forgets when no password was typed, the checkbox is off and one was remembered', () => {
    expect(
      passwordChoiceOf({ authKind: 'basic', typed: false, remember: false, wasRemembered: true }),
    ).toEqual({ kind: 'forget' });
  });

  it('keeps when no password was typed and the checkbox is on or nothing was remembered', () => {
    expect(
      passwordChoiceOf({ authKind: 'basic', typed: false, remember: true, wasRemembered: true }),
    ).toEqual({ kind: 'keep' });
    expect(
      passwordChoiceOf({ authKind: 'basic', typed: false, remember: false, wasRemembered: false }),
    ).toEqual({ kind: 'keep' });
  });
});
