import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Modal from './Modal.svelte';

const MODAL = Modal as unknown as Component<Record<string, unknown>>;

const FIELD = createRawSnippet(() => ({ render: () => '<input type="search">' }));

function markup(props: Record<string, unknown>): string {
  return render(MODAL, { props })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

function header(html: string): string {
  const start = html.indexOf('<div class="modal-header');
  const end = html.indexOf('<div class="modal-body');

  return html.slice(start, end);
}

describe('Modal', () => {
  it('draws the title row with a close button by default', () => {
    const html = header(markup({ title: 'Delete?' }));

    expect(html).toMatch(
      /^<div class="modal-header"><h2 class="modal-title" id="[^"]+">Delete\?<\/h2>/u,
    );
    expect(html).toContain('class="modal-close" aria-label="Close"');
  });

  it('leaves the close button out of the title row when told to', () => {
    const html = header(markup({ title: 'Download?', closeButton: false }));

    expect(html).toMatch(
      /^<div class="modal-header"><h2 class="modal-title" id="[^"]+">Download\?<\/h2><\/div>$/u,
    );
  });

  it('renders a caller header inside its own header bar', () => {
    const html = header(markup({ 'aria-label': 'Find', header: FIELD }));

    expect(html).toBe('<div class="modal-header modal-header-bar"><input type="search"></div>');
  });

  it('names the dialog by its title when the title row has no close button', () => {
    const html = markup({ title: 'Download?', closeButton: false });
    const titleId = /<h2 class="modal-title" id="([^"]+)"/u.exec(html)?.[1];

    expect(titleId).toBeDefined();
    expect(html).toContain(`aria-labelledby="${titleId}"`);
  });
});
