<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { fitsOneAsset, mebibytes } from '../../../domain/asset-limit';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { IPADIC_ARCHIVE, KO_DIC_ARCHIVE } from './plan-facts';
  import { WHERE_IT_RUNS } from './plan-diagrams';
  import {
    ACCESSIBILITY_TEXT_HREF,
    BUILD_LAZY_HREF,
    BUILD_RUNTIME_HREF,
    OCR_DOWNLOAD_HREF,
    OFFLINE_MODELS_HREF,
    SECURITY_DIRECTIVES_HREF,
    SECURITY_DOWNLOADS_HREF,
    STORAGE_ACCOUNT_HREF,
    STORAGE_ASKING_HREF,
    UNICODE_RUBY_HREF,
    WORD_PLAN_SECTIONS,
  } from './plan-sections';

  const ARCHIVES = [IPADIC_ARCHIVE, KO_DIC_ARCHIVE];

  const LINDERA_OPFS = `import { downloadDictionary, loadDictionaryFiles } from 'lindera-wasm/opfs';

await downloadDictionary(url, "ipadic");
const files = await loadDictionaryFiles("ipadic");`;
</script>

<DocsSection title={WORD_PLAN_SECTIONS.timing}>
  <p>
    Analysis runs when the capture panel shows a card, not when the capture is taken. The result is
    kept in memory for as long as the panel needs it and never written to IndexedDB, so the capture
    record stays exactly as it is today.
  </p>
  <p>
    The reason is that words are derived data with inputs that change. If the analysis were stored,
    installing the full dictionary or importing a Yomitan ZIP would leave every stored result out of
    date, and the stored data would need a rule for when to redo it. A result computed on display
    from the current dictionary is never out of date.
  </p>
  <p>
    The analyzer runs in a worker, so loading tens of megabytes of dictionary and analyzing text
    never blocks the page while the reader turns pages.
  </p>
  <Figure>
    <Diagram {...WHERE_IT_RUNS} />
    {#snippet caption()}
      Where each planned piece runs. Where the dictionary lookup itself runs is settled when it is
      built.
    {/snippet}
  </Figure>
  <p>
    The whole step sits behind a preference, <code>showWordBreakdown</code>. Some readers want only
    the recognized text, and Dokseo 1.0's capture card is exactly that, so it stays as the off state
    rather than being replaced. Off means no download: the analyzer and dictionary load only when
    the preference is on and a card is shown. Turning it on in the middle of a session shows
    progress while they load. It is one preference for all books, since nothing in reading calls for
    word breakdowns in one book and not another.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.display}>
  <p>
    Tapping or clicking a word opens a popover with its dictionary entries. A reading line, rendered
    as
    <code>&lt;ruby&gt;</code> with the <code>phoneticReading</code> of each word, can be turned on above
    the text.
  </p>
  <p>
    By default the recognized text stays one plain, selectable text node, as it is in 1.0. Many
    readers already run a dictionary extension in the browser, and those extensions read ordinary
    selectable text; Dokseo 1.0 shipped without a dictionary for that reason. Splitting the text
    into one element per word, or mixing readings into it, would change what a selection and a copy
    return: the
    <a href={UNICODE_RUBY_HREF}>Unicode page</a> shows that a ruby element's text includes its
    readings. The same text node is what a screen reader reaches (<a href={ACCESSIBILITY_TEXT_HREF}
      >Recognized text in Dokseo</a
    >).
  </p>
  <p>
    Yomitan also has a local API for other programs to look words up through. The first version does
    not use it: whether it accepts requests from Dokseo's origin is not confirmed, and it would need
    setup outside Dokseo before it did anything.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.downloads}>
  <p>
    Dictionaries are downloads of the same order as the OCR models, so they get the same treatment.
    Dokseo asks before downloading, per language, in a dialog that states the size (<a
      href={OCR_DOWNLOAD_HREF}>Consent and the download</a
    >); agreeing requests persistent storage, at the moment it is earned (<a
      href={STORAGE_ASKING_HREF}>When Dokseo asks for persistence</a
    >); progress shows while the files arrive; and the storage account in Settings gets a part for
    dictionaries, with a way to remove them (<a href={STORAGE_ACCOUNT_HREF}>The storage account</a
    >). Once stored, they work offline the way the model files do (<a href={OFFLINE_MODELS_HREF}
      >Model files offline</a
    >).
  </p>
  <p>
    The analyzer's dictionary files go in the Cache API or the origin private file system. Lindera's
    WebAssembly package has a helper for the second:
  </p>
  <DocsCode label="lindera-wasm/opfs, from its README" code={LINDERA_OPFS} />
  <p>
    The meaning dictionary goes in a new IndexedDB database, as an index for lookup by base form.
  </p>
  <p>
    Dokseo is served by Cloudflare, which refuses any static file over 25 MiB (<a
      href={BUILD_RUNTIME_HREF}>Model weights and WASM at run time</a
    >). Both Lindera archives fit as zips. Unpacked, each has one file over the limit, so the files
    must be served zipped and unpacked in the browser:
  </p>
  <Table size="sm" caption="Lindera 6.2.0 dictionary archives, measured">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Archive</TableHeaderCell>
        <TableHeaderCell>Zip</TableHeaderCell>
        <TableHeaderCell>Unpacked</TableHeaderCell>
        <TableHeaderCell>Largest file</TableHeaderCell>
        <TableHeaderCell>One asset?</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each ARCHIVES as archive (archive.name)}
        {@const largest = archive.files[0]}
        <TableRow>
          <TableCell><code class="text-xs">{archive.name}</code></TableCell>
          <TableCell>{mebibytes(archive.zipBytes)} MiB</TableCell>
          <TableCell>{mebibytes(archive.unpackedBytes)} MiB</TableCell>
          <TableCell
            >{#if largest !== undefined}<code class="text-xs">{largest.name}</code>, {mebibytes(
                largest.bytes,
              )} MiB{/if}</TableCell
          >
          <TableCell
            >{fitsOneAsset({ name: archive.name, bytes: archive.zipBytes })
              ? 'Zipped, yes'
              : 'No'}{largest !== undefined && !fitsOneAsset(largest)
              ? '; unpacked, no'
              : ''}</TableCell
          >
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    Hosting the files beside Dokseo also keeps the security headers as they are. Lindera publishes
    its dictionaries as GitHub release files, and when I requested one with an
    <code>Origin</code> header, neither the redirect from <code>github.com</code> nor the file
    response carried <code>Access-Control-Allow-Origin</code>, so a page cannot read them with
    <code>fetch</code>. Fetching from another host would need a CORS response to pass COEP (<a
      href={SECURITY_DOWNLOADS_HREF}>Model downloads under COEP</a
    >), since <code>connect-src</code> already allows any HTTPS origin (<a
      href={SECURITY_DIRECTIVES_HREF}>Dokseo's policy, directive by directive</a
    >). A file on Dokseo's own origin needs neither. The policy already allows
    <code>'wasm-unsafe-eval'</code>, which ONNX Runtime needs and Lindera's WebAssembly needs too.
  </p>
  <p>
    The code stays out of the first load. The adapters load through dynamic imports, like pdf.js and
    the recognizers (<a href={BUILD_LAZY_HREF}>pdf.js and the recognizers load on demand</a>). One
    detail to watch: Dokseo's service worker precaches every file in the build and every static file
    ending in <code>.wasm</code>, so Lindera's WebAssembly binary has to be kept out of that list,
    or every install downloads it whether the preference is on or not.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.open}>
  <ul>
    <li>
      KRDict's license: CC BY-SA 2.0 KR according to a secondary source. It has to be confirmed from
      the National Institute of Korean Language before the dump is used.
    </li>
    <li>
      Yomitan's local API: whether it answers cross-origin requests from Dokseo. It decides whether
      a later adapter can use it.
    </li>
    <li>
      English: <code>Language</code> also has <code>'en'</code>, and the plan names no English
      analyzer or dictionary. What <code>wordAnalyzerFor('en')</code> returns is not yet decided.
    </li>
    <li>
      The precache: keeping Lindera's WebAssembly file out of the service worker's list, as above.
    </li>
  </ul>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.order}>
  <StepList>
    <StepItem title="The ports and Word">
      <p>
        The <code>lexicon</code> domain with <code>Word</code>, <code>WordAnalyzer</code> and
        <code>Dictionary</code>, and <code>composition/lexicon.ts</code>.
      </p>
    </StepItem>
    <StepItem title="The Japanese analyzer and the reading line">
      <p>Lindera with IPADIC in a worker, behind <code>showWordBreakdown</code>.</p>
    </StepItem>
    <StepItem title="The Japanese dictionary and the popover">
      <p>The JMdict download, common edition first, the lookup and the attribution screen.</p>
    </StepItem>
    <StepItem title="Storage account and consent">
      <p>Consent per language, the persistence request and the storage account part.</p>
    </StepItem>
    <StepItem title="Korean">
      <p>Lindera with ko-dic, and the KRDict index once its license is confirmed.</p>
    </StepItem>
    <StepItem title="Yomitan ZIP import">
      <p>Dictionaries the reader brings, such as Jitendex.</p>
    </StepItem>
  </StepList>
  <p>
    The reading line comes first because it needs only the analyzer, and Japanese is finished before
    Korean starts.
  </p>
</DocsSection>
