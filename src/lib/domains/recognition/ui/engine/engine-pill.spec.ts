import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { EngineState } from '../../domain/engine/ocr-engine';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import EnginePill from './EnginePill.svelte';

const PILL = EnginePill as unknown as Component<Record<string, unknown>>;

const IDLE: EngineState = {
  stored: false,
  opening: false,
  load: null,
  session: null,
  failure: null,
  paused: false,
  cancelled: false,
  partlyDownloaded: false,
};

const RUNNING: EngineState = {
  ...IDLE,
  stored: true,
  session: { modelId: JAPANESE_OCR_MODEL.modelId, device: 'wasm', fellBackFrom: null },
};

function markup(engine: EngineState, language: string | null): string {
  return render(PILL, { props: { engine, language } }).body;
}

function trigger(html: string): string {
  return /<button[^>]*popovertarget[^>]*>([\s\S]*?)<\/button>/u.exec(html)?.[1] ?? '';
}

function text(html: string): string {
  return html
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

describe('EnginePill', () => {
  it('renders nothing while there is no book language and no session', () => {
    expect(markup(IDLE, null)).not.toContain('popovertarget');
  });

  it('names the engine and the status of the model a book of its language would use', () => {
    expect(text(trigger(markup(IDLE, 'ja')))).toBe('On-device · manga-ocr Not downloaded');
  });

  it('names the device once a session is open, in place of the status', () => {
    expect(text(trigger(markup(RUNNING, 'ja')))).toBe('On-device · manga-ocr CPU');
  });

  it('ends the trigger with a decorative chevron', () => {
    expect(trigger(markup(IDLE, 'ja'))).toMatch(
      /<svg[^>]*aria-hidden="true"[^>]*class="lucide lucide-chevron-down btn-icon"/u,
    );
  });

  it('offers every engine and disables each one that is not installed', () => {
    const inputs = [...markup(IDLE, 'ja').matchAll(/<input[^>]*>/gu)].map((found) => found[0]);

    expect(inputs).toHaveLength(3);
    expect(inputs.filter((input) => /\sdisabled/u.test(input))).toHaveLength(2);
    expect(inputs[0]).toContain('value="on-device"');
    expect(inputs[0]).not.toMatch(/\sdisabled/u);
  });

  it('warns when the open session cannot read the book language', () => {
    expect(text(markup(RUNNING, 'ko'))).toContain('does not read Korean');
    expect(text(markup(RUNNING, 'ja'))).not.toContain('does not read');
  });
});
