import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { JAPANESE_OCR_MODEL } from '../../../domain/model/model-footprint';
import ModelConsentDialog from './ModelConsentDialog.svelte';

const DIALOG = ModelConsentDialog as unknown as Component<Record<string, unknown>>;

function text(language: string): string {
  const html = render(DIALOG, {
    props: {
      request: { language, footprint: JAPANESE_OCR_MODEL },
      onagree: () => {},
      ondecline: () => {},
    },
  }).body;

  return html
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

describe('ModelConsentDialog, variant A', () => {
  it('asks for the model of the language the request names', () => {
    expect(text('ja')).toContain('Download the Japanese recognition model?');
    expect(text('ko')).toContain('Download the Korean recognition model?');
  });

  it('states the download, then the larger figure on disk', () => {
    expect(text('ja')).toContain('Download about 123 MB On disk about 144 MB');
  });

  it('explains the weights and the runtime in their own sizes', () => {
    expect(text('ja')).toContain('The weights are 117 MB');
    expect(text('ja')).toContain(
      'The runtime is 6.6 MB to download and unpacks to as much as 27 MB',
    );
  });

  it('offers to decline before it offers to download', () => {
    const shown = text('ja');

    expect(shown.indexOf('Not now')).toBeGreaterThan(-1);
    expect(shown.indexOf('Not now')).toBeLessThan(shown.indexOf('Download and read'));
  });
});
