<script lang="ts">
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import { bookTitle, plausibleTitle, suggestTitle } from '$lib/domains/library/domain/book/title';
  import { readEpubPackage } from '$lib/domains/library/domain/ingest/epub-package';
  import { escapeXmlText } from '../../../domain/byte-rows';
  import {
    FIRST_EDITION,
    PACKAGE_PATH,
    SAMPLE_TITLE,
    sampleEpubEntries,
  } from '../../../domain/sample-epub';
  import DocsDemo from '../../DocsDemo.svelte';

  const FILE_NAME = 'rainy-day-bookshop.epub';

  const SAMPLE_TITLE_ELEMENT = `<dc:title>${SAMPLE_TITLE}</dc:title>`;

  const opf = new TextDecoder().decode(
    sampleEpubEntries(FIRST_EDITION).find((entry) => entry.path === PACKAGE_PATH)?.bytes,
  );

  const fileTitle = suggestTitle('epub', [{ name: FILE_NAME, path: FILE_NAME }]);

  let declared = $state(SAMPLE_TITLE);

  const read = $derived(
    readEpubPackage(
      opf.replace(SAMPLE_TITLE_ELEMENT, `<dc:title>${escapeXmlText(declared)}</dc:title>`),
    ),
  );
  const accepted = $derived(
    read?.title === null || read === null ? null : plausibleTitle(read.title),
  );
  const title = $derived(bookTitle(accepted, fileTitle));
</script>

<DocsDemo label="The import reading the sample package">
  {#snippet caption()}
    <code>readEpubPackage</code>, <code>plausibleTitle</code> and <code>bookTitle</code> from the
    library domain, run on the sample's <code>package.opf</code> with the title you type. The file
    is named <code>{FILE_NAME}</code>.
  {/snippet}
  <div class="stack-md">
    <Field label="dc:title in the package">
      {#snippet children(control)}
        <Input {...control} bind:value={declared} lang="ja" />
      {/snippet}
    </Field>
    {#if read !== null}
      <dl class="stack-sm text-sm">
        <div>
          <dt class="text-muted">Layout, direction, language</dt>
          <dd class="m-0">
            <code>{read.layout}</code>, <code>{read.direction}</code>,
            <code>{read.language ?? 'none'}</code>
          </dd>
        </div>
        <div>
          <dt class="text-muted">Title the book is stored under</dt>
          <dd class="m-0" lang="ja"><strong>{title}</strong></dd>
        </div>
      </dl>
    {/if}
  </div>
</DocsDemo>
