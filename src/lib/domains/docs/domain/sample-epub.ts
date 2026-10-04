import { match } from 'ts-pattern';
import { storedZip, textEntry } from './stored-zip';
import type { ZipEntry } from './stored-zip';

type SampleWritingMode = 'horizontal' | 'vertical';

type SampleEdition =
  | 'first'
  | 'foreword'
  | 'inserted-paragraph'
  | 'edited-sentence'
  | 'restructured';

type SampleBook = {
  readonly writingMode: SampleWritingMode;
  readonly edition: SampleEdition;
};

type SampleChapter = {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
};

const SAMPLE_TITLE = '雨の日の本屋';

const SAMPLE_LANGUAGE = 'ja';

const SAMPLE_SENTENCE = 'その二つの言葉が、頭の奥の古い棚を静かに開けていく。';

const FIRST_EDITION: SampleBook = { writingMode: 'vertical', edition: 'first' };

const MIMETYPE = 'application/epub+zip';

const PACKAGE_PATH = 'OEBPS/package.opf';

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${PACKAGE_PATH}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

const FOREWORD: SampleChapter = {
  id: 'foreword',
  title: 'まえがき',
  paragraphs: ['この本は、雨の日に書かれた。'],
};

const MORNING: SampleChapter = {
  id: 'ch1',
  title: '雨の朝',
  paragraphs: [
    '朝から雨が降っていた。駅前の小さな<ruby>本屋<rt>ほんや</rt></ruby>は、まだシャッターを半分しか上げていない。',
    '店主の<ruby>佐藤<rt>さとう</rt></ruby>さんは、濡れた傘を入口に立てかけて、レジの横で湯を沸かした。',
    '棚には昨日届いた文庫本が、まだ箱に入ったまま積まれている。表紙の色だけが、薄暗い店の中で妙に明るい。',
    '「今日は誰も来ないだろうな」と佐藤さんは<ruby>呟<rt>つぶや</rt></ruby>いた。けれども、その声が終わらないうちに、戸口の鈴が鳴った。',
    '入ってきたのは、紺色の<ruby>制服<rt>せいふく</rt></ruby>を着た高校生だった。肩まで濡れているのに、鞄だけは胸に抱えて守っている。',
  ],
};

const SENTENCE_BEFORE = '灯台と手紙。';

const SENTENCE_BEFORE_EDITED = '灯台と、海と、手紙。';

const SEARCH: SampleChapter = {
  id: 'ch2',
  title: '探している本',
  paragraphs: [
    '「すみません、題名が分からない本を探しているんです」と高校生は言った。',
    '佐藤さんは湯呑みを置いて、少し笑った。題名の分からない本を探す客は、思っているより多い。',
    '「覚えていることを、何でもいいから教えてください」',
    '「表紙に灯台の絵があって、主人公が毎晩、海に向かって手紙を書くんです。祖母の家で一度だけ読みました」',
    `佐藤さんは<ruby>眼鏡<rt>めがね</rt></ruby>を外して、天井を見上げた。${SENTENCE_BEFORE}${SAMPLE_SENTENCE}`,
    '「たぶん、あの本だ。でも、もう<ruby>絶版<rt>ぜっぱん</rt></ruby>になっていますよ」',
  ],
};

const INSERTED_PARAGRAPH =
  '高校生の話し方は丁寧だったが、どこか急いでいるようにも聞こえた。店の外では、バスが水たまりを跳ね上げて走り去っていく。佐藤さんはその音が消えるまで待ってから、もう一度客の顔を見た。';

const BACK_SHELF: SampleChapter = {
  id: 'ch3',
  title: '奥の棚',
  paragraphs: [
    '店の一番奥には、売り物ではない本を並べた棚がある。佐藤さんが若い頃から集めてきた本だ。',
    '埃を払いながら背表紙を指でたどると、青い布張りの一冊が見つかった。表紙には、小さな灯台が<ruby>刺繍<rt>ししゅう</rt></ruby>されている。',
    '高校生は本を受け取ると、しばらく何も言わずに表紙を<ruby>撫<rt>な</rt></ruby>でていた。',
    '「これです。祖母の家にあったのと、同じです」',
    '「貸してあげましょう。読み終わったら、返しに来てください」',
    '外ではまだ雨が降っていた。けれども、店の中は少しだけ明るくなったように見えた。',
  ],
};

function chaptersOf(edition: SampleEdition): readonly SampleChapter[] {
  return match(edition)
    .with('first', 'restructured', () => [MORNING, SEARCH, BACK_SHELF])
    .with('foreword', () => [FOREWORD, MORNING, SEARCH, BACK_SHELF])
    .with('inserted-paragraph', () => [
      MORNING,
      { ...SEARCH, paragraphs: [INSERTED_PARAGRAPH, ...SEARCH.paragraphs] },
      BACK_SHELF,
    ])
    .with('edited-sentence', () => [
      MORNING,
      {
        ...SEARCH,
        paragraphs: SEARCH.paragraphs.map((text) =>
          text.replace(SENTENCE_BEFORE, SENTENCE_BEFORE_EDITED),
        ),
      },
      BACK_SHELF,
    ])
    .exhaustive();
}

function styleSheet(mode: SampleWritingMode): string {
  const vertical =
    mode === 'vertical'
      ? 'html {\n  writing-mode: vertical-rl;\n  -epub-writing-mode: vertical-rl;\n}\n'
      : '';
  return `${vertical}h2 {\n  font-size: 1.3em;\n}\np {\n  margin: 0;\n  text-indent: 1em;\n}\n`;
}

function paragraphsOf(chapter: SampleChapter, edition: SampleEdition): string {
  const paragraphs = chapter.paragraphs.map((text) => `<p>${text}</p>`).join('');
  return edition === 'restructured' ? `<section>${paragraphs}</section>` : paragraphs;
}

function chapterDocument(chapter: SampleChapter, edition: SampleEdition): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${SAMPLE_LANGUAGE}" xml:lang="${SAMPLE_LANGUAGE}"><head><meta charset="UTF-8"/><title>${chapter.title}</title><link rel="stylesheet" href="style.css"/></head><body><h2>${chapter.title}</h2>${paragraphsOf(chapter, edition)}</body></html>
`;
}

function navigationDocument(chapters: readonly SampleChapter[]): string {
  const links = chapters
    .map((chapter) => `<li><a href="${chapter.id}.xhtml">${chapter.title}</a></li>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${SAMPLE_LANGUAGE}" xml:lang="${SAMPLE_LANGUAGE}"><head><meta charset="UTF-8"/><title>目次</title></head><body><nav epub:type="toc"><ol>${links}</ol></nav></body></html>
`;
}

function packageDocument(chapters: readonly SampleChapter[], mode: SampleWritingMode): string {
  const items = chapters
    .map(
      (chapter) =>
        `    <item id="${chapter.id}" href="${chapter.id}.xhtml" media-type="application/xhtml+xml"/>`,
    )
    .join('\n');
  const itemrefs = chapters
    .map((chapter) => `    <itemref idref="${chapter.id}" id="ref-${chapter.id}"/>`)
    .join('\n');
  const direction = mode === 'vertical' ? 'rtl' : 'ltr';
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${SAMPLE_LANGUAGE}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:5f0c2a64-7a51-4c1e-9d3b-2f6d0c8e1a47</dc:identifier>
    <dc:title>${SAMPLE_TITLE}</dc:title>
    <dc:language>${SAMPLE_LANGUAGE}</dc:language>
    <meta property="dcterms:modified">2026-10-03T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
${items}
  </manifest>
  <spine page-progression-direction="${direction}">
${itemrefs}
  </spine>
</package>
`;
}

function sampleEpubEntries(book: SampleBook): readonly ZipEntry[] {
  const chapters = chaptersOf(book.edition);
  return [
    textEntry('mimetype', MIMETYPE),
    textEntry('META-INF/container.xml', CONTAINER),
    textEntry(PACKAGE_PATH, packageDocument(chapters, book.writingMode)),
    textEntry('OEBPS/nav.xhtml', navigationDocument(chapters)),
    textEntry('OEBPS/style.css', styleSheet(book.writingMode)),
    ...chapters.map((chapter) =>
      textEntry(`OEBPS/${chapter.id}.xhtml`, chapterDocument(chapter, book.edition)),
    ),
  ];
}

function sampleEpub(book: SampleBook): Uint8Array<ArrayBuffer> {
  return storedZip(sampleEpubEntries(book));
}

export {
  FIRST_EDITION,
  PACKAGE_PATH,
  SAMPLE_LANGUAGE,
  SAMPLE_SENTENCE,
  SAMPLE_TITLE,
  sampleEpub,
  sampleEpubEntries,
};
export type { SampleBook, SampleEdition, SampleWritingMode };
