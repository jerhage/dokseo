<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { MAX_MODEL_INPUT_EDGE } from '$lib/domains/recognition/domain/engine/model-input';
  import {
    ENGLISH_OCR_MODEL,
    JAPANESE_FULL_DECODER_MODEL,
    JAPANESE_OCR_MODEL,
    KOREAN_OCR_MODEL,
    weightsMb,
  } from '$lib/domains/recognition/domain/model/model-footprint';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { PageSource } from '$lib/shared/page-source';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import CropDemo from './CropDemo.svelte';
  import { CAPTURE_PIPELINE } from './ocr-diagrams';
  import { OCR_SECTIONS } from './ocr-sections';
  import { RECOGNIZER_FOR, RECOGNIZER_PORT } from './ocr-snippets';

  type Props = {
    source: PageSource;
    src: string;
    regions: readonly ImageRegion[];
    onregions: (regions: readonly ImageRegion[]) => void;
  };

  let { source, src, regions, onregions }: Props = $props();
</script>

<DocsSection title={OCR_SECTIONS.pipeline}>
  <p>
    In Dokseo, one capture runs from the rectangle a reader drags to a record kept in IndexedDB. Two
    threads take part: the page, which owns the screen and the storage, and a worker, which owns the
    model.
  </p>
  <Figure>
    <Diagram {...CAPTURE_PIPELINE} />
    {#snippet caption()}One capture, from the page to the worker and back.{/snippet}
  </Figure>
  <StepList>
    <StepItem title="The selection becomes an image region">
      <p>
        The rectangle arrives in screen pixels. <code>regionsIn</code> in
        <code>viewing/domain/placement.ts</code> intersects it with each page image under it and
        rescales the overlap into that image's own pixels, then states it as fractions of the
        image's natural size. The result is an <code>ImageRegion</code>: an image index and a rect
        from 0 to 1, independent of zoom, screen size and render scale.
      </p>
    </StepItem>
    <StepItem title="The use case crops the page">
      <p>
        <code>recognizeRegion</code> hands the regions to the cropper port. The canvas cropper
        decodes each image from the book's <code>PageSource</code>, turns the fractions into pixels
        of that bitmap, cuts the rect out with
        <code>createImageBitmap</code>, and stitches the pieces of a selection that spans two pages
        side by side, or stacked for a continuous book, on a white ground.
      </p>
    </StepItem>
    <StepItem title="The adapter prepares the input">
      <p>
        The recognizer adapter scales the crop down if its long edge is over
        {MAX_MODEL_INPUT_EDGE} pixels, then turns it gray for manga-ocr with the same luma weights as
        Pillow's <code>convert("L")</code>, which is what manga-ocr's own Python code does. The
        PaddleOCR engine keeps color. The prepared bitmap is posted to the worker.
      </p>
    </StepItem>
    <StepItem title="The worker reads it">
      <p>
        The model's processor squashes the bitmap to 224 by 224, divides each value by 255 and maps
        it to the range -1 to 1. The encoder and the greedy decode loop produce token ids, the
        tokenizer turns them into text, and the worker removes the spaces the tokenizer puts between
        characters.
      </p>
    </StepItem>
    <StepItem title="The page keeps the capture">
      <p>
        The text comes back to the page, is trimmed, and is saved as a capture. A reading with no
        text is reported as <code>no-text</code> and saves nothing.
      </p>
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={OCR_SECTIONS.crop}>
  <p>
    The demo runs the page side of that pipeline for real: <code>regionsIn</code> for the selection,
    the same pixel functions the cropper and the adapter call, and a final 224 by 224 draw that
    matches what transformers.js does in a browser. Its resize draws onto a canvas without setting
    <code>imageSmoothingQuality</code>, so the browser's default quality applies.
  </p>
  <CropDemo {source} {src} {regions} {onregions} />
  <p>
    The squash is the surprise. A tall bubble and a wide caption box both become a square, so the
    caption box's characters come out about four times taller, relative to their width, than on the
    page. manga-ocr's own Python code passes the crop to the same processor with the same settings,
    so Dokseo reproduces the squash rather than padding the crop to a square.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.port}>
  <p>
    The recognition domain declares what it needs from a recognizer as a port, a TypeScript
    interface in <code>recognition/domain/engine/text-recognizer.ts</code>. It takes an
    <code>ImageBitmap</code> and resolves to text or a named failure. Nothing in it mentions a language,
    a model or a worker.
  </p>
  <DocsCode label={RECOGNIZER_PORT.label} code={RECOGNIZER_PORT.code} />
  <p>
    Two adapters implement it, <code>manga-ocr.adapter.ts</code> and
    <code>paddle-ocr.adapter.ts</code>. Each is about twenty lines: an id, a model runtime, and the
    URL of its worker script. Everything else, pairing requests with replies, preparing the input
    and tearing a dead worker down, is shared in <code>worker-recognizer.ts</code>.
  </p>
  <p>
    The composition root picks the adapter. A book records its language, the stored engine settings
    choose a model for that language, and the model names its runtime.
    <code>recognizerFor</code> matches on the runtime and loads the adapter with a dynamic import, so
    an engine's code is fetched only when a book needs it. The recognizer is kept per language, and a
    failed load is dropped from the map so the next capture tries again.
  </p>
  <DocsCode label={RECOGNIZER_FOR.label} code={RECOGNIZER_FOR.code} />
  <p>
    The use case, <code>recognizeRegion</code>, receives the recognizer and never branches on the
    language. Adding a language means a model row and, if it needs one, an adapter.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.engines}>
  <p>
    The two runtimes read text in different ways. PaddleOCR's recognizer is a CTC model,
    connectionist temporal classification: it slides along one line of text and returns, for each
    narrow slice, a probability for every character in its dictionary plus a blank. Decoding takes
    the most likely class per slice, merges a run of the same class and drops the blanks, so
    <code>가 가 blank 가</code> reads as two characters. It makes no sequence of guesses and needs no
    decoder loop, but it reads one line, so the Paddle worker first splits the crop into horizontal bands
    by counting dark pixels per row.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell></TableHeaderCell>
        <TableHeaderCell>manga-ocr</TableHeaderCell>
        <TableHeaderCell>PP-OCRv5 mobile</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row">Languages in Dokseo</TableHeaderCell>
        <TableCell>Japanese</TableCell>
        <TableCell>Korean, English (one model each)</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Model</TableHeaderCell>
        <TableCell>ViT encoder and BERT decoder, one token per pass</TableCell>
        <TableCell>One graph, one probability row per slice (CTC)</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Reads</TableHeaderCell>
        <TableCell>A whole bubble, any number of columns</TableCell>
        <TableCell>One line, so the crop is split into bands first</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Input</TableHeaderCell>
        <TableCell>Gray, squashed to 224 × 224, values -1 to 1</TableCell>
        <TableCell>Color in BGR order, 48 high, padded to at least 320 wide</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Weights</TableHeaderCell>
        <TableCell>{weightsMb(JAPANESE_OCR_MODEL)} MB</TableCell>
        <TableCell>
          {weightsMb(KOREAN_OCR_MODEL)} MB Korean, {weightsMb(ENGLISH_OCR_MODEL)} MB English
        </TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Confidence</TableHeaderCell>
        <TableCell><code>null</code></TableCell>
        <TableCell>Mean probability of the kept characters</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    The Japanese default is <code>{JAPANESE_OCR_MODEL.modelId}</code>, an export of manga-ocr I made
    with both halves quantized to 8-bit integers. No export on the Hub paired a quantized decoder,
    under the merged name transformers.js loads, with a complete tokenizer, and the full-precision
    decoder is
    {weightsMb(JAPANESE_FULL_DECODER_MODEL) - weightsMb(JAPANESE_OCR_MODEL)} MB more to download. Its
    merged decoder is still the plain decoder under that name, so the greedy loop above stays. Nobody
    has compared its readings against full precision on the same bubbles, so the engine settings keep
    <code>{JAPANESE_FULL_DECODER_MODEL.modelId}</code>, with the full-precision decoder, as a second
    choice.
  </p>
  <p>
    The PaddleOCR models are published as two files, <code>inference.onnx</code> and
    <code>inference.yml</code>. The second holds the character dictionary: 11,945 entries for
    Korean, which with the blank and a space make the 11,947 classes the graph returns per slice.
  </p>
</DocsSection>
