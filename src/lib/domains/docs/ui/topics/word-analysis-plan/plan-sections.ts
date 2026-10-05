import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { ACCESSIBILITY_SECTIONS } from '../accessibility/accessibility-sections';
import { ARCHITECTURE_SECTIONS } from '../architecture/architecture-sections';
import { OCR_SECTIONS } from '../ocr/ocr-sections';
import { OFFLINE_SECTIONS } from '../offline/sections';
import { BUILD_SECTIONS } from '../production-builds/build-sections';
import { SECTIONS as SECURITY_SECTIONS } from '../security-headers/sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';
import { UNICODE_SECTIONS } from '../unicode/unicode-sections';

const WORD_PLAN_SECTIONS = {
  learner: 'What a learner wants from a sentence',
  noSpaces: 'Why Japanese needs a morphological analyzer',
  output: 'What an analyzer produces',
  costs: 'How an analyzer chooses a split',
  dictionaries: 'How a dictionary such as JMdict is organized',
  licenses: 'Dictionary licenses and attribution',
  korean: 'Korean: spaces, with particles and endings attached',
  pipeline: 'Where words join the pipeline',
  domain: 'A lexicon domain with two ports',
  composition: 'An analyzer and a dictionary per book language',
  analyzer: 'Choosing the analyzer',
  japaneseDictionary: 'The Japanese dictionary',
  koreanParts: 'The Korean analyzer and dictionary',
  timing: 'When analysis runs',
  display: 'The popover and the reading line',
  downloads: 'Downloads, consent and storage',
  open: 'Open checks',
  order: 'Order of work',
} as const;

type WordPlanSectionKey = keyof typeof WORD_PLAN_SECTIONS;

function wordPlanHref(key: WordPlanSectionKey): string {
  return `#${anchorSlug(WORD_PLAN_SECTIONS[key])}`;
}

const OCR_TOKENS_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.tokens)}`;

const OCR_DOWNLOAD_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.download)}`;

const OCR_CAPTURE_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.capture)}`;

const ARCHITECTURE_PORTS_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.ports)}`;

const ARCHITECTURE_ROOT_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.root)}`;

const ARCHITECTURE_GRAPH_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.graph)}`;

const ARCHITECTURE_LANGUAGES_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.languages)}`;

const UNICODE_WORDS_HREF = `/docs/unicode#${anchorSlug(UNICODE_SECTIONS.words)}`;

const UNICODE_RUBY_HREF = `/docs/unicode#${anchorSlug(UNICODE_SECTIONS.ruby)}`;

const ACCESSIBILITY_TEXT_HREF = `/docs/accessibility#${anchorSlug(ACCESSIBILITY_SECTIONS.dokseoText)}`;

const STORAGE_ASKING_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.asking)}`;

const STORAGE_ACCOUNT_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.account)}`;

const OFFLINE_MODELS_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.models)}`;

const SECURITY_DIRECTIVES_HREF = `/docs/security-headers#${anchorSlug(SECURITY_SECTIONS.directives)}`;

const SECURITY_DOWNLOADS_HREF = `/docs/security-headers#${anchorSlug(SECURITY_SECTIONS.downloads)}`;

const BUILD_LAZY_HREF = `/docs/production-builds#${anchorSlug(BUILD_SECTIONS.dokseoLazy)}`;

const BUILD_RUNTIME_HREF = `/docs/production-builds#${anchorSlug(BUILD_SECTIONS.dokseoRuntime)}`;

export {
  ACCESSIBILITY_TEXT_HREF,
  ARCHITECTURE_GRAPH_HREF,
  ARCHITECTURE_LANGUAGES_HREF,
  ARCHITECTURE_PORTS_HREF,
  ARCHITECTURE_ROOT_HREF,
  BUILD_LAZY_HREF,
  BUILD_RUNTIME_HREF,
  OCR_CAPTURE_HREF,
  OCR_DOWNLOAD_HREF,
  OCR_TOKENS_HREF,
  OFFLINE_MODELS_HREF,
  SECURITY_DIRECTIVES_HREF,
  SECURITY_DOWNLOADS_HREF,
  STORAGE_ACCOUNT_HREF,
  STORAGE_ASKING_HREF,
  UNICODE_RUBY_HREF,
  UNICODE_WORDS_HREF,
  WORD_PLAN_SECTIONS,
  wordPlanHref,
};
export type { WordPlanSectionKey };
