import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { ComputeChoice } from '../../domain/engine/compute-choice';
import { GPU_UNDETECTED } from '../../domain/engine/compute-choice';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { DownloadState } from '../../domain/model/model-download';
import { IDLE } from '../../domain/model/model-download';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import { offeredModels } from '../../queries/engine-queries';
import type { LanguageSetupRead, OfferedModels } from '../../queries/engine-queries';
import type {
  ModelStorageSnapshot,
  ReadModelStorageResult,
} from '../../use-cases/model/read-model-storage';
import { createEngineLanguage } from './engine-language.svelte';
import { EngineSetup } from './engine-setup-writes.svelte';
import EngineAside from './EngineAside.svelte';
import EngineSettingsScreen from './EngineSettingsScreen.svelte';
import { createRemovalConfirm } from './removal-confirm.svelte';

const reads = vi.hoisted(() => ({ answers: new Map<string, unknown>() }));

vi.mock('$lib/shared/read-query.svelte', () => ({
  readQuery: (options: () => { readonly queryKey: readonly unknown[] }) => ({
    state: reads.answers.get(String(options().queryKey[1])),
    reload: () => undefined,
  }),
}));

vi.mock('$lib/shared/write-query.svelte', () => ({
  writeQuery: () => ({
    state: { kind: 'idle' },
    submit: () => undefined,
    run: () => new Promise(() => undefined),
    reset: () => undefined,
  }),
}));

type Fake = {
  readonly download: DownloadState;
  readonly storage: ModelStorageSnapshot | null;
  readonly session: RecognizerSession | null;
  readonly compute: ComputeChoice;
  readonly confirmingRemoval: boolean;
  readonly removing: boolean;
  readonly message: string | null;
  readonly storageMessage: string | null;
  readonly setup: 'loading' | 'failed' | 'ready';
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
  confirmingRemoval: false,
  removing: false,
  message: null,
  storageMessage: null,
  setup: 'ready',
};

function snapshot(files: number, persisted = true, partialBytes = 0): ModelStorageSnapshot {
  return {
    report: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files,
      bytes: 204_600_000,
      unsized: 0,
      required: ['a', 'b'],
      weights: files > 0 ? ['a', 'b'] : [],
    },
    partial: { modelId: JAPANESE_OCR_MODEL.modelId, files: 1, bytes: partialBytes },
    usage: null,
    quota: null,
    persisted,
  };
}

function setupOf(fake: Fake): ReadState<LanguageSetupRead> {
  if (fake.setup === 'loading') return LOADING;
  if (fake.setup === 'failed') return readFailed('Local storage failed: locked');
  return readReady({
    kind: 'success',
    setup: {
      language: 'ja',
      models: offeredModels('ja') as OfferedModels,
      selected: null,
      compute: fake.compute,
    },
  });
}

function storageOf(fake: Fake): ReadState<ReadModelStorageResult> {
  if (fake.storageMessage !== null) return readFailed(fake.storageMessage);
  return fake.storage === null ? LOADING : readReady({ kind: 'success', snapshot: fake.storage });
}

function propsOf(over: Partial<Fake>) {
  const fake = { ...BASE, ...over };
  reads.answers.set('setup', setupOf(fake));
  reads.answers.set('compute', readReady(GPU_UNDETECTED));
  reads.answers.set('model-storage', storageOf(fake));

  const view = new EngineSetup({} as Container, () => undefined, createTestQueryClient());
  view.download.state = fake.download;
  view.download.session = fake.session;
  view.removal.removing = fake.removing;
  view.removal.message = fake.message;
  const removalConfirm = createRemovalConfirm();
  if (fake.confirmingRemoval) removalConfirm.ask(true);
  return {
    recognition: {},
    view,
    languageChoice: createEngineLanguage(() => undefined),
    removalConfirm,
  };
}

function screen(over: Partial<Fake>): string {
  return render(SCREEN, { props: propsOf(over) }).body;
}

function aside(over: Partial<Fake>): string {
  return render(ASIDE, { props: propsOf(over) }).body;
}

describe('EngineSettingsScreen', () => {
  it('draws the header and a reading note while the engine settings are read', () => {
    const html = screen({ setup: 'loading' });

    expect(html).toContain('OCR engine');
    expect(html).toContain('Reading your engine settings…');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('aria-labelledby');
  });

  it('draws the failure with its cause and a retry in place of the engines', () => {
    const html = screen({ setup: 'failed' });

    expect(html).toContain('Engine settings could not be read');
    expect(html).toContain('Local storage failed: locked');
    expect(html).toContain('Try again');
    expect(html).not.toContain('aria-labelledby');
  });

  it('lists all three engines, and only the on-device one can be picked', () => {
    const html = screen({});

    const engines = html.match(/<input [^>]*name="[^"]*-engine-choice"[^>]*>/gu) ?? [];

    expect(engines).toHaveLength(3);
    expect(engines.filter((input) => input.includes('type="radio"'))).toHaveLength(3);
    expect(engines.filter((input) => / disabled[ =/>]/u.test(input))).toHaveLength(2);
    expect(html.match(/<span class="visually-hidden">About the /gu)).toHaveLength(3);
    expect(html.match(/aria-label="About the /gu)).toHaveLength(3);
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
    const html = screen({
      storage: snapshot(0, true, 50_000_000),
      download: { kind: 'paused', load: null },
    });

    expect(html).toContain('Paused');
    expect(html).toContain('Resume the download');
    expect(html).toContain('Discard what was fetched');
  });

  it('names the device and offers the delete once the engine is ready', () => {
    const html = screen({ storage: snapshot(7), session: OPENED });

    expect(html).toContain('Ready');
    expect(html).toContain('This session opened on the GPU.');
    expect(html).toContain('205 MB in 7 files');
    expect(html).toContain('Delete the model');
  });

  it('asks before deleting, with the measured size and both answers', () => {
    const html = screen({ storage: snapshot(7), confirmingRemoval: true });

    expect(html).toContain('Delete about 205 MB of weights?');
    expect(html).toContain('Keep it');
    expect(html.match(/Delete the model/gu)).toHaveLength(1);
  });

  it('disables the delete and says so while the model is being removed', () => {
    const html = screen({ storage: snapshot(7), removing: true });

    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:<!---->)?Deleting…/u);
  });

  it('shows a failed load in the status badge and its note, leaving the alert to a toast', () => {
    const html = screen({ download: { kind: 'failed', cause: 'no memory' } });

    expect(html).toContain('Not available');
    expect(html).toContain('The engine could not be opened: no memory');
    expect(html).not.toContain('The model could not be loaded');
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

  it('says the storage is read until it answers', () => {
    const html = screen({});

    expect(html).toContain('Reading what is stored…');
    expect(html).toContain('Download now');
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
      props: { ...propsOf({}), storageHref: '/elsewhere/storage' },
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
    expect(aside({ setup: 'loading' })).toContain('None');
    expect(aside({ setup: 'failed' })).toContain('None');
  });

  it('names the stored status once the storage is read', () => {
    expect(aside({ storage: snapshot(7) })).toContain('Downloaded');
  });
});
