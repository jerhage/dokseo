import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { ComputeChoice } from '../../domain/engine/compute-choice';
import { GPU_UNDETECTED } from '../../domain/engine/compute-choice';
import type { EngineState } from '../../domain/engine/ocr-engine';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { DownloadState } from '../../domain/model/model-download';
import { IDLE } from '../../domain/model/model-download';
import { JAPANESE_OCR_MODEL, modelsFor } from '../../domain/model/model-footprint';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import EngineAside from './EngineAside.svelte';
import EngineSettingsScreen from './EngineSettingsScreen.svelte';

type Fake = {
  readonly download: DownloadState;
  readonly storage: ModelStorageSnapshot | null;
  readonly session: RecognizerSession | null;
  readonly compute: ComputeChoice;
  readonly stored: boolean;
  readonly resumable: boolean;
  readonly confirmingRemoval: boolean;
  readonly removing: boolean;
  readonly message: string | null;
  readonly storageMessage: string | null;
  readonly chosen: boolean;
};

const SCREEN = EngineSettingsScreen as unknown as Component<Record<string, unknown>>;
const ASIDE = EngineAside as unknown as Component<Record<string, unknown>>;

const OPENED: RecognizerSession = {
  modelId: JAPANESE_OCR_MODEL.modelId,
  device: 'webgpu',
  fellBackFrom: null,
};

const BASE: Fake = {
  download: IDLE,
  storage: null,
  session: null,
  compute: 'auto',
  stored: false,
  resumable: false,
  confirmingRemoval: false,
  removing: false,
  message: null,
  storageMessage: null,
  chosen: true,
};

function snapshot(files: number, persisted = true): ModelStorageSnapshot {
  return {
    report: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files,
      bytes: 204_600_000,
      unsized: 0,
      required: ['a', 'b'],
      weights: files > 0 ? ['a', 'b'] : [],
    },
    partial: null,
    usage: null,
    quota: null,
    persisted,
  };
}

function viewOf(over: Partial<Fake>): Record<string, unknown> {
  const fake = { ...BASE, ...over };
  const download = fake.download;
  const engine: EngineState = {
    stored: fake.stored,
    opening: download.kind === 'loading',
    load: download.kind === 'loading' ? download.load : null,
    session: download.kind === 'ready' ? download.session : fake.session,
    failure: download.kind === 'failed' ? download.cause : null,
    paused: download.kind === 'paused',
    cancelled: download.kind === 'cancelled',
    partlyDownloaded: fake.resumable,
  };
  return {
    ...fake,
    language: fake.chosen ? 'ja' : null,
    model: fake.chosen ? JAPANESE_OCR_MODEL : null,
    models: fake.chosen ? modelsFor('ja') : [],
    detection: GPU_UNDETECTED,
    partial: fake.storage?.partial ?? null,
    engine,
  };
}

function screen(over: Partial<Fake>): string {
  return render(SCREEN, { props: { view: viewOf(over) } }).body;
}

function aside(over: Partial<Fake>): string {
  return render(ASIDE, { props: { view: viewOf(over) } }).body;
}

describe('EngineSettingsScreen', () => {
  it('says no model is chosen and draws no engine when the view has none', () => {
    const html = screen({ chosen: false });

    expect(html).toContain('No recognition model has been chosen for any language yet.');
    expect(html).not.toContain('aria-labelledby');
  });

  it('lists all three engines, and only the on-device one can be picked', () => {
    const html = screen({});

    expect(html.match(/type="radio" name="[^"]*-engine-choice"/gu)).toHaveLength(3);
    expect(html.match(/-engine-choice" value="[^"]*" disabled/gu)).toHaveLength(2);
    expect(html.match(/aria-label="About the /gu)).toHaveLength(6);
  });

  it('offers a download when nothing is stored', () => {
    const html = screen({ storage: snapshot(0) });

    expect(html).toContain('Not downloaded');
    expect(html).toContain('Download now');
    expect(html).not.toContain('Delete the model');
  });

  it('shows the progress bar with its figure and the pause and cancel buttons while loading', () => {
    const load = { fraction: 0.5, source: 'network', loadedBytes: 60e6, totalBytes: 120e6 };
    const html = screen({ download: { kind: 'loading', load } as DownloadState });

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain('aria-label="Downloading the recognition model"');
    expect(html).toContain('60 / 120 MB · 50%');
    expect(html).toContain('>Pause<');
    expect(html).toContain('>Cancel<');
    expect(html).not.toContain('Download now');
  });

  it('offers a resume and a discard when part of the weights is here', () => {
    const html = screen({ resumable: true, download: { kind: 'paused', load: null } });

    expect(html).toContain('Paused');
    expect(html).toContain('Resume the download');
    expect(html).toContain('Discard what was fetched');
  });

  it('names the device and offers the delete once the engine is ready', () => {
    const html = screen({ stored: true, storage: snapshot(7), session: OPENED });

    expect(html).toContain('Ready');
    expect(html).toContain('This session opened on the GPU.');
    expect(html).toContain('205 MB in 7 files');
    expect(html).toContain('Delete the model');
  });

  it('asks before deleting, with the measured size and both answers', () => {
    const html = screen({ stored: true, storage: snapshot(7), confirmingRemoval: true });

    expect(html).toContain('Delete about 205 MB of weights?');
    expect(html).toContain('Keep it');
    expect(html.match(/Delete the model/gu)).toHaveLength(1);
  });

  it('disables the delete and says so while the model is being removed', () => {
    const html = screen({ stored: true, storage: snapshot(7), removing: true });

    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:<!---->)?Deleting…/u);
  });

  it('announces a failed load as an alert', () => {
    const html = screen({ download: { kind: 'failed', cause: 'no memory' } });

    expect(html).toContain('Not available');
    expect(html).toMatch(/role="alert"[^]*The model could not be loaded: no memory/u);
  });

  it('warns about the GPU as an alert only when the GPU is chosen', () => {
    expect(screen({ compute: 'gpu' })).toMatch(/role="alert"[^]*Browser support for the GPU/u);
    expect(screen({ compute: 'cpu' })).not.toContain('Browser support for the GPU');
    expect(screen({ compute: 'cpu' })).not.toContain('role="alert"');
    expect(screen({ compute: 'cpu' })).toContain('The CPU is the stable choice');
  });

  it('presses exactly the chosen language and the chosen compute', () => {
    const html = screen({ compute: 'cpu' });

    expect(html.match(/aria-pressed="true"/gu)).toHaveLength(2);
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:<!---->)?CPU/u);
  });

  it('says when the browser may reclaim the model', () => {
    expect(screen({ storage: snapshot(7, false) })).toContain('has not granted persistence');
    expect(screen({ storage: snapshot(7, true) })).not.toContain('has not granted persistence');
  });

  it('shows the storage failure in place of the figure', () => {
    expect(screen({ storageMessage: 'The cache could not be read: x' })).toContain(
      'The cache could not be read: x',
    );
  });

  it('reports the outcome of a removal as a status', () => {
    expect(screen({ message: 'Freed 205 MB.' })).toMatch(/role="status"[^>]*>Freed 205 MB\./u);
  });

  it('links to the storage section it is given', () => {
    expect(screen({})).toContain('href="/settings/storage"');
    const html = render(SCREEN, {
      props: { view: viewOf({}), storageHref: '/elsewhere/storage' },
    }).body;
    expect(html).toContain('href="/elsewhere/storage"');
  });
});

describe('EngineAside', () => {
  it('names the engine and the status word before a session opens', () => {
    const html = aside({});

    expect(html).toContain(`On-device · ${JAPANESE_OCR_MODEL.engine}`);
    expect(html).toContain('Not downloaded');
  });

  it('names the device once a session is open', () => {
    expect(aside({ session: OPENED })).toContain('running on the GPU');
  });

  it('names no engine when no model is chosen', () => {
    expect(aside({ chosen: false })).toContain('None');
  });
});
