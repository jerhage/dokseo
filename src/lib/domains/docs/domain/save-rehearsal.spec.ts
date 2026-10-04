import { describe, expect, it } from 'vitest';
import { saveFile } from '$lib/platform/files/save-file';
import type { FileToSave } from '$lib/platform/files/save-file';
import { rehearsedSaving, shareEnding, stepText } from './save-rehearsal';
import type { SaveRehearsal, SaveStep } from './save-rehearsal';

const FILE: FileToSave = { text: '{}', name: 'captures.json', type: 'application/json' };

function rehearse(rehearsal: SaveRehearsal) {
  const steps: SaveStep[] = [];
  const saving = rehearsedSaving(() => rehearsal, { add: (step) => steps.push(step) });
  return { saving, steps };
}

describe('rehearsedSaving', () => {
  it('downloads on a desktop without asking canShare', async () => {
    const { saving, steps } = rehearse({ touchDevice: false, support: 'files', ending: 'saved' });

    expect(await saveFile(saving, FILE)).toEqual({ kind: 'downloaded' });
    expect(steps.map(stepText)).toEqual(['download(captures.json): a link with download clicked']);
  });

  it('downloads on a touch device when canShare refuses the file', async () => {
    const { saving, steps } = rehearse({ touchDevice: true, support: 'no-files', ending: 'saved' });

    expect(await saveFile(saving, FILE)).toEqual({ kind: 'downloaded' });
    expect(steps.map((step) => step.kind)).toEqual(['can-share', 'download']);
  });

  it('reports a dismissed sheet as cancelled', async () => {
    const { saving } = rehearse({ touchDevice: true, support: 'files', ending: 'dismissed' });

    expect(await saveFile(saving, FILE)).toEqual({ kind: 'cancelled' });
  });

  it('asks for another tap once, then shares on the second tap', async () => {
    const { saving, steps } = rehearse({
      touchDevice: true,
      support: 'files',
      ending: 'activation-lost',
    });

    expect(await saveFile(saving, FILE)).toEqual({ kind: 'needs-another-tap' });
    expect(await saveFile(saving, FILE)).toEqual({ kind: 'shared' });
    expect(steps.filter((step) => step.kind === 'share').map(stepText)).toEqual([
      'share({ files: [captures.json] }) rejected with NotAllowedError',
      'share({ files: [captures.json] }) resolved',
    ]);
  });

  it('names the ending of each sheet choice', () => {
    expect(shareEnding('saved', false)).toBe('resolved');
    expect(shareEnding('dismissed', true)).toBe('AbortError');
    expect(shareEnding('activation-lost', false)).toBe('NotAllowedError');
  });
});
