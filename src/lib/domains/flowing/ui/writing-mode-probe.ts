import type { BookSection, FoliateBook } from 'foliate-js/view.js';
import { OUT_OF_THE_READING_ORDER } from './flow-spine';
import { chapterDirection, PRIMARY_WRITING_MODE } from './flow-writing-mode';
import type { ChapterProbe, MeasuredChapter } from './flow-writing-mode';

type Probed = Pick<FoliateBook, 'sections' | 'resources'>;

const ANY_NAMESPACE = '*';

const OFF_SCREEN = 'visually-hidden';

const READ_ONLY_FRAME = 'allow-same-origin';

function declaredWritingMode(book: Probed): string | null {
  const opf = book.resources.opf;
  if (opf === null || opf === undefined) return null;

  const meta = Array.from(opf.getElementsByTagNameNS(ANY_NAMESPACE, 'meta')).find(
    (element) => element.getAttribute('name') === PRIMARY_WRITING_MODE,
  );
  return meta?.getAttribute('content') ?? null;
}

async function hasText(section: BookSection | undefined): Promise<boolean> {
  if (section === undefined || section.linear === OUT_OF_THE_READING_ORDER) return false;

  const open = section.createDocument;
  if (open === undefined) return false;

  try {
    const doc = await open();
    return (doc.body?.textContent ?? '').trim() !== '';
  } catch {
    return false;
  }
}

function framed(host: HTMLElement, src: string): Promise<HTMLIFrameElement> {
  const frame = document.createElement('iframe');
  frame.className = OFF_SCREEN;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', READ_ONLY_FRAME);

  const loaded = new Promise<HTMLIFrameElement>((resolve) => {
    frame.addEventListener('load', () => resolve(frame), { once: true });
  });
  frame.src = src;
  host.append(frame);
  return loaded;
}

async function measure(
  host: HTMLElement,
  section: BookSection | undefined,
): Promise<MeasuredChapter | null> {
  const load = section?.load;
  if (section === undefined || load === undefined) return null;

  let frame: HTMLIFrameElement | null = null;
  try {
    const src = await load();
    if (src === null || src === '') return null;

    frame = await framed(host, src);
    const doc = frame.contentDocument;
    const body = doc?.body;
    const shown = frame.contentWindow;
    if (doc === null || doc === undefined || body === null || body === undefined) return null;
    if (shown === null) return null;

    const style = shown.getComputedStyle(body);
    return {
      writingMode: style.writingMode,
      direction: chapterDirection({
        bodyDir: body.dir,
        rootDir: doc.documentElement.dir,
        direction: style.direction,
      }),
    };
  } catch {
    return null;
  } finally {
    frame?.remove();
    section.unload?.();
  }
}

function chapterProbe(host: HTMLElement, book: Probed): ChapterProbe {
  return {
    chapters: book.sections.length,
    hasText: (index) => hasText(book.sections[index]),
    measure: (index) => measure(host, book.sections[index]),
  };
}

export { chapterProbe, declaredWritingMode };
