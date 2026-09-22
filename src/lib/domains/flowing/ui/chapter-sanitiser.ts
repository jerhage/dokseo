import DOMPurify from 'dompurify';
import type { Config } from 'dompurify';

type ChapterMarkup = 'application/xhtml+xml' | 'text/html' | 'image/svg+xml';

const ADMITS_A_BLOB_URL =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i;

const CHAPTER_POLICY: Config & { IN_PLACE: true } = {
  IN_PLACE: true,
  ADD_TAGS: ['link', 'meta'],
  ADD_ATTR: ['charset', 'content', 'epub:type', 'xml:lang'],
  FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'object', 'script'],
  FORBID_ATTR: ['http-equiv'],
  ALLOWED_URI_REGEXP: ADMITS_A_BLOB_URL,
};

function sanitiseChapter(markup: string, mediaType: ChapterMarkup): string {
  const chapter = new DOMParser().parseFromString(markup, mediaType);
  DOMPurify.sanitize(chapter.documentElement, CHAPTER_POLICY);
  return new XMLSerializer().serializeToString(chapter);
}

export { sanitiseChapter };
export type { ChapterMarkup };
