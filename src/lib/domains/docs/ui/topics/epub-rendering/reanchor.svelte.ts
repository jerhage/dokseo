import { match } from 'ts-pattern';
import { DEFAULT_READING_SETTINGS } from '$lib/domains/flowing/domain/reading-settings';
import { SAMPLE_SENTENCE } from '../../../domain/sample-epub';
import type { SampleBook, SampleEdition } from '../../../domain/sample-epub';
import { BookStage } from './book-stage.svelte';
import type { CapturePassage, DemoArrival, DemoChapter, DemoPassage, OpenFlow } from './flow-kit';

type ReanchorState =
  | { readonly kind: 'reading' }
  | { readonly kind: 'captured'; readonly passage: DemoPassage }
  | { readonly kind: 'reissued'; readonly passage: DemoPassage; readonly edition: SampleEdition }
  | {
      readonly kind: 'arrived';
      readonly passage: DemoPassage;
      readonly edition: SampleEdition;
      readonly arrival: DemoArrival;
    };

type Capture =
  | { readonly kind: 'captured'; readonly passage: DemoPassage }
  | { readonly kind: 'nothing-selected' }
  | { readonly kind: 'not-open' };

const READING: ReanchorState = { kind: 'reading' };

const FIRST: SampleBook = { writingMode: 'horizontal', edition: 'first' };

const SAMPLE_CHAPTER_HREF = 'OEBPS/ch2.xhtml';

const SAMPLE_CHAPTER_INDEX = 1;

const NOTHING_SELECTED = 'Select some text in the book first, or use the sample sentence.';

const NOT_OPEN = 'The sample book is not open yet.';

function arrivalSummary(arrival: DemoArrival): string {
  return match(arrival)
    .with(
      { kind: 'cfi' },
      () =>
        'The stored CFI still resolved, so the reader went there with no notice. The ring marks whatever text that CFI reaches now.',
    )
    .with(
      { kind: 'quote' },
      () => 'The stored CFI failed, and the quote found the passage under a fresh CFI.',
    )
    .with({ kind: 'lost' }, () => 'Neither the CFI nor the quote found the passage.')
    .exhaustive();
}

function arrivalTone(arrival: DemoArrival): 'info' | 'warning' | 'danger' {
  return match(arrival)
    .with({ kind: 'cfi' }, () => 'info' as const)
    .with({ kind: 'quote' }, () => 'warning' as const)
    .with({ kind: 'lost' }, () => 'danger' as const)
    .exhaustive();
}

function captureNotice(capture: Capture): string | null {
  return match(capture)
    .with({ kind: 'captured' }, () => null)
    .with({ kind: 'nothing-selected' }, () => NOTHING_SELECTED)
    .with({ kind: 'not-open' }, () => NOT_OPEN)
    .exhaustive();
}

function selectText(doc: Document, text: string): boolean {
  const body = doc.body;
  if (body === null) return false;

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const at = (node.nodeValue ?? '').indexOf(text);
    if (at === -1) continue;

    const range = doc.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + text.length);
    const selection = doc.getSelection();
    if (selection === null) return false;

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }
  return false;
}

class Reanchor {
  state = $state.raw<ReanchorState>(READING);
  notice = $state.raw<string | null>(null);
  readonly stage: BookStage;

  #passage: CapturePassage;
  #waiting: ((chapter: DemoChapter) => void) | null = null;

  constructor(open: OpenFlow, passage: CapturePassage) {
    this.#passage = passage;
    this.stage = new BookStage(open, { chapter: (chapter) => this.#shown(chapter) });
  }

  get firstEdition(): SampleBook {
    return FIRST;
  }

  captureSelection(): void {
    const capture = this.#capture();
    this.notice = captureNotice(capture);
    if (capture.kind === 'captured') this.state = { kind: 'captured', passage: capture.passage };
  }

  async captureSample(): Promise<void> {
    const chapter = await this.#sampleChapter();
    if (chapter === null) {
      this.notice = NOT_OPEN;
      return;
    }
    selectText(chapter.doc, SAMPLE_SENTENCE);
    this.captureSelection();
  }

  async reissue(edition: SampleEdition): Promise<void> {
    const held = this.state;
    if (held.kind === 'reading') return;

    this.state = { kind: 'reissued', passage: held.passage, edition };
    this.notice = null;
    await this.stage.show({ ...FIRST, edition }, DEFAULT_READING_SETTINGS);
  }

  async goBack(): Promise<void> {
    const held = this.state;
    const surface = this.stage.surface;
    if (held.kind !== 'reissued' && held.kind !== 'arrived') return;
    if (surface === null) return;

    const arrival = await surface.goToPassage({ cfi: held.passage.cfi, quote: held.passage.quote });
    if (arrival.kind !== 'lost')
      surface.mark([arrival.cfi], { kind: 'arrived', cfi: arrival.cfi, place: null });
    this.state = { kind: 'arrived', passage: held.passage, edition: held.edition, arrival };
  }

  async restart(): Promise<void> {
    this.state = READING;
    this.notice = null;
    await this.stage.show(FIRST, DEFAULT_READING_SETTINGS);
  }

  #capture(): Capture {
    const chapter = this.stage.chapter;
    if (chapter === null) return { kind: 'not-open' };

    const passage = this.#passage(chapter.doc, chapter.index, chapter.cfis, chapter.titles);
    chapter.doc.getSelection()?.removeAllRanges();
    return passage === null ? { kind: 'nothing-selected' } : { kind: 'captured', passage };
  }

  #sampleChapter(): Promise<DemoChapter | null> {
    const shown = this.stage.chapter;
    const surface = this.stage.surface;
    if (shown?.index === SAMPLE_CHAPTER_INDEX) return Promise.resolve(shown);
    if (surface === null) return Promise.resolve(null);

    const arriving = new Promise<DemoChapter>((resolve) => {
      this.#waiting = resolve;
    });
    surface.jump(SAMPLE_CHAPTER_HREF);
    return arriving;
  }

  #shown(chapter: DemoChapter): void {
    if (chapter.index !== SAMPLE_CHAPTER_INDEX) return;

    this.#waiting?.(chapter);
    this.#waiting = null;
  }
}

export { arrivalSummary, arrivalTone, captureNotice, Reanchor, SAMPLE_CHAPTER_HREF };
export type { Capture, ReanchorState };
