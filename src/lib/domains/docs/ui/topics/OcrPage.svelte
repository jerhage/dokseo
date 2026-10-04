<script lang="ts">
  import type { ImageRegion } from '$lib/shared/image-region';
  import { sampleRegion } from '../../domain/ocr-sample';
  import DocsPage from '../DocsPage.svelte';
  import DocsSection from '../DocsSection.svelte';
  import CaptureRecord from './ocr/CaptureRecord.svelte';
  import LiveRecognition from './ocr/LiveRecognition.svelte';
  import OcrConcepts from './ocr/OcrConcepts.svelte';
  import OcrPipeline from './ocr/OcrPipeline.svelte';
  import OcrRuntime from './ocr/OcrRuntime.svelte';
  import { OCR_SECTIONS } from './ocr/ocr-sections';
  import samplePage from './ocr/sample-page.png';
  import { samplePageSource } from './ocr/sample-page-source';

  type Reading = { readonly text: string; readonly confidence: number | null };

  const NOT_READ_YET: Reading = { text: '(the text the model returns)', confidence: null };

  const source = samplePageSource(samplePage);

  let regions = $state.raw<readonly ImageRegion[]>([sampleRegion('bubble')]);
  let reading = $state.raw<Reading>(NOT_READ_YET);
</script>

<DocsPage slug="ocr" sections={Object.values(OCR_SECTIONS)}>
  {#snippet lead()}
    How a picture of a speech bubble becomes text, and how Dokseo does it on the device, in the
    browser, with no server.
  {/snippet}

  <OcrConcepts />

  <OcrPipeline
    {source}
    src={samplePage}
    {regions}
    onregions={(next) => {
      regions = next;
      reading = NOT_READ_YET;
    }}
  />

  <OcrRuntime />

  <DocsSection title={OCR_SECTIONS.live}>
    <p>
      This runs the real recognizer on the region selected in the crop demo, with the model your
      engine settings choose for Japanese. If the weights are already on this device it downloads
      nothing; if not, the button states the download size first.
    </p>
    <LiveRecognition
      {source}
      {regions}
      onread={(text, confidence) => {
        reading = { text, confidence };
      }}
    />
  </DocsSection>

  <DocsSection title={OCR_SECTIONS.capture}>
    <p>
      A capture keeps the text, where it came from, when it was taken, and the reader's tags and
      note. Its anchor is a list of image regions: the index of each page image in the book's <code
        >PageSource</code
      > and a rect in that image's own pixels. It holds no page number: the label a capture card shows
      is derived from the index when it is displayed. It holds no picture of the crop either. The regions
      are what Dokseo uses to return to the bubble and outline it on the page.
    </p>
    <CaptureRecord {regions} text={reading.text} confidence={reading.confidence} />
    <p>
      <code>origin</code> separates text the model read from text a reader typed or lifted from an
      EPUB. <code>confidence</code> is <code>null</code> for every Japanese capture today, and the
      field is stored anyway, so a recognizer that measures one needs no change to the record. An
      edit sets <code>editedAt</code> and keeps the region, so the capture still points at the bubble
      it came from.
    </p>
  </DocsSection>
</DocsPage>
