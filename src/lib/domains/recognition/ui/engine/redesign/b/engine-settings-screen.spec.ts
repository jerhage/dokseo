import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { ComputeChoice } from '../../../../domain/engine/compute-choice';
import { GPU_UNDETECTED } from '../../../../domain/engine/compute-choice';
import type { EngineState } from '../../../../domain/engine/ocr-engine';
import type { RecognizerSession } from '../../../../domain/engine/recognizer-session';
import type { DownloadState } from '../../../../domain/model/model-download';
import { IDLE } from '../../../../domain/model/model-download';
import type { ModelLoad } from '../../../../domain/model/model-load';
import type { PartialReport } from '../../../../domain/model/model-partial';
import { JAPANESE_OCR_MODEL, modelsFor } from '../../../../domain/model/model-footprint';
import type { ModelStorageSnapshot } from '../../../../use-cases/model/read-model-storage';
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

function snapshot(files: number, persisted = true, partial: PartialReport | null = null) {
  const stored: ModelStorageSnapshot = {
    report: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files,
      bytes: 204_600_000,
      unsized: 0,
      required: ['a', 'b'],
      weights: files > 0 ? ['a', 'b'] : [],
    },
    partial,
    usage: null,
    quota: null,
    persisted,
  };
  return stored;
}

function loading(source: ModelLoad['source']): DownloadState {
  return {
    kind: 'loading',
    load: { fraction: 0.5, source, loadedBytes: 60e6, totalBytes: 120e6 },
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

function screen(over: Partial<Fake>, storageHref?: string): string {
  const props =
    storageHref === undefined ? { view: viewOf(over) } : { view: viewOf(over), storageHref };
  return render(SCREEN, { props }).body;
}

describe('EngineSettingsScreen, variant B', () => {
  it('says no model is chosen and draws no group when the view has none', () => {
    const html = screen({ chosen: false });

    expect(html).toContain('No recognition model has been chosen for any language yet.');
    expect(html).not.toContain('aria-labelledby');
  });

  it('says it is reading the storage until a figure arrives', () => {
    expect(screen({})).toContain('Reading what is stored…');
  });

  it('offers a download and warns about eviction when nothing is stored or persisted', () => {
    const html = screen({ storage: snapshot(0, false) });

    expect(html).toContain('Not downloaded');
    expect(html).toContain('Download now');
    expect(html).toContain('May be cleared');
    expect(html).toContain('has not granted persistence');
    expect(html).not.toContain('Delete the model');
  });

  it('says nothing about eviction once the browser has granted persistence', () => {
    const html = screen({ storage: snapshot(0, true) });

    expect(html).not.toContain('May be cleared');
    expect(html).not.toContain('has not granted persistence');
  });

  it('shows an indeterminate bar while the engine opens before any progress', () => {
    const html = screen({ download: { kind: 'loading', load: null } });

    expect(html).toContain('Opening');
    expect(html).toContain('starting…');
    expect(html).toContain('progress-indeterminate');
    expect(html).not.toContain('aria-valuenow');
  });

  it('shows the network figure with pause and cancel while downloading', () => {
    const html = screen({ download: loading('network') });

    expect(html).toContain('aria-label="Downloading the recognition model"');
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain('60 / 120 MB · 50%');
    expect(html).toContain('Pausing keeps every byte already fetched');
    expect(html).toContain('>Pause<');
    expect(html).toContain('>Cancel<');
    expect(html).not.toContain('Download now');
  });

  it('says nothing is fetched while loading weights from this device', () => {
    const html = screen({ download: loading('cache'), stored: true, storage: snapshot(7) });

    expect(html).toContain('aria-label="Loading the recognition model"');
    expect(html).toContain('Cancelling only stops opening them.');
  });

  it('offers a resume naming what is kept, and a discard, when part of the weights is here', () => {
    const partial = { modelId: JAPANESE_OCR_MODEL.modelId, files: 1, bytes: 50e6 };
    const html = screen({
      resumable: true,
      download: { kind: 'paused', load: null },
      storage: snapshot(0, true, partial),
    });

    expect(html).toContain('Paused');
    expect(html).toContain('Resume the download');
    expect(html).toContain('50 MB already here');
    expect(html).toContain('50 MB of 1 file part-downloaded, kept for a resume');
    expect(html).toContain('Discard what was fetched');
  });

  it('names the device and offers the delete once the engine is ready', () => {
    const html = screen({ stored: true, storage: snapshot(7), session: OPENED });

    expect(html).toContain('Ready');
    expect(html).toContain('running on the GPU');
    expect(html).toContain('This session opened on the GPU.');
    expect(html).toContain('205 MB in 7 files');
    expect(html.match(/<button[^>]*>(?:<!---->)?Delete the model/gu)).toHaveLength(2);
  });

  it('asks before deleting with the measured size, or the published one before measuring', () => {
    expect(screen({ stored: true, storage: snapshot(7), confirmingRemoval: true })).toContain(
      'Delete about 205 MB of weights?',
    );
    expect(screen({ stored: true, confirmingRemoval: true })).toContain(
      'Delete about 123 MB of weights?',
    );
    expect(screen({ stored: true, confirmingRemoval: true })).toContain('Keep it');
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

  it('says so when the GPU would not run the model and the CPU took over', () => {
    const session: RecognizerSession = { ...OPENED, device: 'wasm', fellBackFrom: 'webgpu' };
    const html = screen({ compute: 'gpu', stored: true, session });

    expect(html).toContain('This session opened on the CPU.');
    expect(html).toContain('The GPU would not run this model, so the CPU is doing the work.');
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
    expect(screen({}, '/preview/b/settings/storage')).toContain(
      'href="/preview/b/settings/storage"',
    );
  });

  it('lists all three engines, only the on-device one can be picked, and each has its costs', () => {
    const html = screen({});

    expect(html.match(/name="[^"]*-engine-choice"/gu)).toHaveLength(3);
    expect(html.match(/-engine-choice"[^>]*disabled/gu)).toHaveLength(2);
    expect(html.match(/aria-label="About the /gu)).toHaveLength(3);
  });

  it('selects the chosen language and offers every model for it', () => {
    const html = screen({});

    expect(html).toMatch(/<option value="ja" selected/u);
    expect(html.match(/name="[^"]*-model-choice"/gu)).toHaveLength(modelsFor('ja').length);
  });
});
