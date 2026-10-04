<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import ConjugatedFormsDemo from './ConjugatedFormsDemo.svelte';
  import { IPADIC_FIELDS, MECAB_SUMOMO } from './plan-facts';
  import { OCR_TOKENS_HREF, UNICODE_WORDS_HREF, WORD_PLAN_SECTIONS } from './plan-sections';

  const JMDICT_WORD = `type JMdictWord = {
  id: string;
  kanji: JMdictKanji[];
  kana: JMdictKana[];
  sense: JMdictSense[];
};

type JMdictKanji = { common: boolean; text: string; tags: Tag[] };

type JMdictKana = {
  common: boolean;
  text: string;
  tags: Tag[];
  appliesToKanji: string[];
};

type JMdictSense = {
  partOfSpeech: Tag[];
  appliesToKanji: string[];
  appliesToKana: string[];
  gloss: JMdictGloss[];
  // and related, antonym, field, dialect, misc, info, languageSource
};`;
</script>

<DocsSection title={WORD_PLAN_SECTIONS.learner}>
  <p>
    Dokseo reads a speech bubble with OCR and shows the recognized text as a line of Japanese or
    Korean under the page. For a fluent reader that is the end of it. A learner usually stops at a
    word they do not know and needs three things about it: where it starts and ends, how it is read,
    and what it means. The meaning comes from a dictionary, and a lookup only succeeds with the form
    of the word that the dictionary lists.
  </p>
  <p>
    In English the first two are nearly free. Words are separated by spaces, the spelling is close
    enough to the sound for a learner to look a word up, and a dictionary lists <q>walked</q> close
    to <q>walk</q>. Japanese and Korean break all three of those assumptions in different ways.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.noSpaces}>
  <p>
    Japanese is written without spaces. <span lang="ja">私は東京に住んでいます</span> (I live in Tokyo)
    is one unbroken run of characters, so splitting on spaces returns the whole sentence as one word.
  </p>
  <p>
    The kanji alone do not show how a word is read. <span lang="ja">東京</span> is
    <span lang="ja">とうきょう</span>, but the same kanji have other readings in other words, and a
    learner who does not know the word cannot work the reading out from the characters.
  </p>
  <p>
    Verbs and adjectives conjugate by changing their endings, and the endings stack.
    <span lang="ja">食べました</span> (ate, politely) is the stem <span lang="ja">食べ</span>, the
    polite <span lang="ja">まし</span>, and the past <span lang="ja">た</span>. A dictionary does
    not list <span lang="ja">食べました</span>. It lists <span lang="ja">食べる</span>, the plain
    dictionary form, also called the base form. To look up a conjugated word, a program first has to
    reduce it to that base form.
  </p>
  <p>
    The browser has a word segmenter, <code>Intl.Segmenter</code>, which the
    <a href={UNICODE_WORDS_HREF}>Unicode page</a> demonstrates. It finds plausible boundaries, but each
    segment is only a piece of the string: it has no reading and no base form.
  </p>
  <ConjugatedFormsDemo />
  <p>
    A morphological analyzer does all three jobs at once. It splits the text into morphemes, the
    smallest units with a grammatical role, and for each one it reports the part of speech, the
    conjugation, the base form and the reading, from a dictionary built for that purpose.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.output}>
  <p>
    MeCab is the classic Japanese analyzer, and most later ones read the same dictionaries. Its
    documentation shows this output for <span lang="ja">すもももももももものうち</span> (plums and
    peaches are both kinds of peach), a tongue twister made mostly of the noun
    <span lang="ja">もも</span> and the particle <span lang="ja">も</span>:
  </p>
  <Table size="sm" caption="MeCab with IPADIC, from the MeCab documentation">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Surface</TableHeaderCell>
        <TableHeaderCell>Features</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each MECAB_SUMOMO as line, index (index)}
        <TableRow>
          <TableCell><span lang="ja">{line.surface}</span></TableCell>
          <TableCell><code lang="ja">{line.features}</code></TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The documentation names the columns: surface form, then part of speech and three levels of
    subcategory, conjugation type, conjugated form, base form, reading and pronunciation. The
    surface form is the text exactly as written. The base form is what a dictionary is indexed by.
    The reading is in katakana, so a program can turn it into hiragana for furigana.
  </p>
  <p>
    Analyzer libraries name each of these units a token, and their APIs return a list of tokens.
    Dokseo does not use that word for them, because in Dokseo a token is a model token: the subword
    unit an OCR decoder generates, explained in <a href={OCR_TOKENS_HREF}>Model tokens</a>. In
    Dokseo's names, a
    <code>WordAnalyzer</code> turns text into <code>Word</code>s, and each <code>Word</code> has a
    surface form, a <code>phoneticReading</code> and a base form. The reading is called
    <code>phoneticReading</code> rather than furigana, because furigana is a Japanese word and the same
    field will hold a Korean reading.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.costs}>
  <p>
    The analyzer's dictionary is a list of surface forms with their features, plus two numbers for
    each entry. The Lindera build of IPADIC lists the fields of an entry in its
    <code>metadata.json</code>:
  </p>
  <DocsCode
    label="Fields of an IPADIC entry, from Lindera's metadata.json"
    code={IPADIC_FIELDS.join('\n')}
  />
  <p>
    The cost is how unlikely the word is on its own; MeCab's documentation says a smaller cost means
    the word appears more readily. The left and right context ids index a connection matrix, which
    gives a second cost for every pair of neighbors, so that a particle after a noun is cheap and a
    particle after a particle is expensive.
  </p>
  <p>
    To analyze a sentence, the analyzer finds every dictionary entry that matches at every position,
    which gives a graph of all possible splits, and picks the path through it with the lowest total
    of word costs and connection costs. That is why <span lang="ja">すもも も もも</span> wins over other
    ways to cut the same kana: the costs were trained on a tagged corpus, and that path is the most likely
    sentence. Text the dictionary does not contain, such as a new name, is handled by rules for unknown
    words that group characters by their kind.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.dictionaries}>
  <p>
    The analyzer's dictionary only knows forms and grammar. Meanings come from a second, separate
    dictionary for people. For Japanese to English, the standard one is JMdict, maintained by the
    Electronic Dictionary Research and Development Group (EDRDG). It is published as XML, and the
    jmdict-simplified project republishes it as JSON every week. Its TypeScript types show how an
    entry is organized:
  </p>
  <DocsCode label="An entry in jmdict-simplified, abridged" code={JMDICT_WORD} />
  <p>
    One entry is one word. It has its written forms with kanji, its kana readings, and its senses,
    each with glosses in a target language. A reading can apply to only some of the kanji forms, and
    a sense to only some forms, which is how one entry holds the variants of a word. The
    <code>common</code> flag marks forms that carry one of JMdict's priority markers, such as
    <code>news1</code> or <code>ichi1</code>, and jmdict-simplified publishes a smaller common-only
    edition built from those.
  </p>
  <p>
    A lookup goes from the analyzer's base form to the entries that have it as a kanji form or a
    kana reading. Matching both the base form and the reading narrows homographs, words written the
    same and read differently.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.licenses}>
  <p>
    JMdict is free to use under the Creative Commons Attribution-ShareAlike license, version 4.0,
    with conditions set out by the EDRDG. Attribution means acknowledging the source of the files in
    the documentation and on the website of the software that uses them, with a copy of or a link to
    the license. For a mobile app the EDRDG names the place: <q
      >a separate screen accessed from a menu, such as one labelled 'About', 'Sources', etc.</q
    >
  </p>
  <p>
    Share-alike applies to anything built from the files: <q
      >If you alter, transform, or build upon this work, you may distribute the resulting work only
      under the same, similar or compatible licence.</q
    > A compact index generated from JMdict is such a work, so if it is distributed, it is distributed
    under CC BY-SA too.
  </p>
  <p>
    The analyzer's dictionary has its own terms. The IPADIC data that Lindera packages carries a
    notice from NAIST and the ICOT conditions: it may be redistributed, in its original form or
    modified, provided the <q>NO WARRANTY</q> section always accompanies it.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.korean}>
  <p>
    Korean does put spaces in its text, but between eojeol, not between words. An eojeol is a
    content word with everything attached to it: <span lang="ko">학교에</span> (to school) is the
    noun <span lang="ko">학교</span> with the particle <span lang="ko">에</span> attached, and
    <span lang="ko">갑니다</span> (goes, politely) is the verb <span lang="ko">가다</span> with its
    <span lang="ko">다</span> replaced by a polite ending. Splitting on spaces gives eojeol, which a dictionary
    does not list.
  </p>
  <p>
    So Korean needs an analyzer too, for the same reason as Japanese: to separate particles and
    endings and to recover the base form a dictionary lists. Hangul is phonetic, so the reading is
    mostly the text itself; a <code>phoneticReading</code> matters more for Japanese.
  </p>
</DocsSection>
