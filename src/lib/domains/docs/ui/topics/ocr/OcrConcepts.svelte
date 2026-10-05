<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import Stat from '$lib/ui/components/Stat.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { probabilityOf, sequenceScore } from '../../../domain/ocr-decoding';
  import { RECORDED_BUBBLE_RUN } from '../../../domain/ocr-recorded-run';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import DecodeStepper from './DecodeStepper.svelte';
  import { ENCODER_DECODER_LOOP } from './ocr-diagrams';
  import { OCR_SECTIONS } from './ocr-sections';
  import { DECODE_LOOP } from './ocr-snippets';

  const run = RECORDED_BUBBLE_RUN;
  const score = sequenceScore(run.steps);
  const firstWords = run.steps.slice(1, 4).map((step) => step.candidates[0]);
</script>

<DocsSection title={OCR_SECTIONS.jobs}>
  <p>
    Optical character recognition, OCR, turns the pixels of a picture into text. A full OCR system
    does two separate jobs. <strong>Text detection</strong> looks at a whole page and returns boxes
    around the places where text is. <strong>Text recognition</strong> takes one of those boxes, cut out
    of the page, and returns the characters in it. PaddleOCR's general pipeline, for example, is a text
    detection module followed by a text recognition module, with optional modules that straighten the
    page or turn rotated lines first.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Job</TableHeaderCell>
        <TableHeaderCell>Input</TableHeaderCell>
        <TableHeaderCell>Output</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Detection</TableCell>
        <TableCell>A whole page</TableCell>
        <TableCell>Boxes around lines or words</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Recognition</TableCell>
        <TableCell>One cropped box</TableCell>
        <TableCell>A string of characters</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    Dokseo runs only the second job. The person reading drags a rectangle over a speech bubble, and
    that rectangle is the detection. A detector would be a second model and a second download, and
    the reader already points at the bubble they want read.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.manga}>
  <p>
    Most recognizers were built for documents: horizontal lines of print on a plain background, read
    one line at a time. A manga page breaks each of those habits. Japanese dialogue is set in
    vertical columns that run right to left, and one bubble holds several columns. Small furigana,
    phonetic readings of a kanji, are printed beside the characters they gloss and are not part of
    the sentence. The text sits on screentone and on drawings, in many typefaces, often hand
    lettered, and scans are often blurry.
  </p>
  <p>
    <a href="https://github.com/kha-white/manga-ocr">manga-ocr</a> is a recognizer trained for
    exactly that. Its README lists vertical and horizontal text, text with furigana, text over
    images, many fonts and low quality images, and it reads a multi-line bubble in one pass instead
    of splitting it into lines first. On the sample page below, the first bubble has furigana beside
    two of its kanji. The model returned <q lang="ja">{run.decoded.replace(/\s+/gu, '')}</q>, with
    the readings left out.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.encoderDecoder}>
  <p>
    manga-ocr is a vision encoder-decoder: two neural networks joined in sequence. The
    <strong>encoder</strong> is a Vision Transformer, started from Facebook's DeiT base model. It takes
    the crop squashed to 224 by 224 pixels, cuts it into 16 by 16 pixel patches, which makes 14 rows of
    14, and adds one summary slot. Its output is 197 vectors of 768 numbers each, a description of the
    picture in numbers. The encoder runs once per crop.
  </p>
  <p>
    The <strong>decoder</strong> writes the text. It is a two-layer BERT network over a Japanese character
    vocabulary. Each run takes the tokens written so far, mixes in the encoder's 197 vectors through cross-attention,
    and returns one score per vocabulary entry for the next position. The highest-scoring entry is appended
    and the decoder runs again, until it produces the end token. The decoder therefore runs once per character.
  </p>
  <Figure>
    <Diagram {...ENCODER_DECODER_LOOP} />
    {#snippet caption()}
      The encoder runs once. The decoder runs in a loop, one token per pass.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={OCR_SECTIONS.tokens}>
  <p>
    A model token is one entry in the model's vocabulary, named by an integer id. A tokenizer
    converts between text and ids. In many text models a token is a piece of a word. manga-ocr's
    tokenizer is character level, so almost every token is a single character: its vocabulary has {run.vocabularySize}
    entries, and in the run below
    {#each firstWords as token, index (token.id)}{index > 0 ? ', ' : ''}<span lang="ja"
        >{token.piece}</span
      >
      is {token.id}{/each}.
  </p>
  <p>
    A few ids are special. <code>[CLS]</code> is {run.startToken}, and the decoder starts from it.
    <code>[SEP]</code> is {run.endToken}, and producing it ends the text. Neither is a character, so
    decoding drops them. The decoder's input is never text, only these ids, and its output is never
    text either, only scores for ids.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.greedy}>
  <p>
    Each decoder pass returns a score, called a logit, for every token in the vocabulary. Greedy
    decoding takes the highest one, appends it, and runs again. It is the simplest choice and it
    commits to every token at once. The model's own <code>generation_config.json</code> sets
    <code>num_beams</code> to 4, for beam search: four candidate sequences kept alive side by side, each
    extended at every step, and the best whole sequence chosen at the end. Beam search can recover from
    a token that looked best at its step but led nowhere; it costs four decoder passes per step.
  </p>
  <p>
    Dokseo decodes greedily, in its own loop, for a reason found the hard way. A decoder exported
    for fast generation keeps a key-value cache: the work done for earlier tokens is passed back in,
    so each pass needs only the newest token. transformers.js loads a vision encoder-decoder from a
    file called <code>decoder_model_merged.onnx</code> and treats that file as a cached decoder, so
    its generation code feeds it one token per pass. Every manga-ocr export I checked on the Hugging
    Face Hub, including the one Dokseo uses, has a plain decoder under that name, with no cache
    inputs at all. With
    <code>pipeline('image-to-text')</code> I got fluent Japanese that had nothing to do with the bubble.
    Logging the decoder inputs showed every pass receiving a single token, so the prefix never reached
    the model.
  </p>
  <p>
    The worker in Dokseo therefore runs the encoder once and feeds the decoder the whole prefix on
    every pass, then takes the highest score at the last position. Without a cache, each pass
    reprocesses every earlier token, so the decoder's work grows roughly with the square of the
    bubble's length. A bubble is short, and in the run below the whole decode took {run.decoderMs} ms.
  </p>
  <DocsCode label={DECODE_LOOP.label} code={DECODE_LOOP.code} />
  <p>
    Step through the real run. One detail shows up at once: the first pass predicts
    <code>[CLS]</code> again. It is a special token, so it costs one pass and disappears in decoding.
  </p>
  <DecodeStepper {run} />
</DocsSection>

<DocsSection title={OCR_SECTIONS.confidence}>
  <p>
    Logits become probabilities through softmax: raise <i>e</i> to each logit and divide by the sum,
    so the scores are positive and add up to 1. Their logarithms, log probabilities, are easier to
    combine. The log probability of a whole sequence is the sum of the log probabilities of its
    chosen tokens. Divide that by the number of tokens and raise <i>e</i> to it, and the result is the
    geometric mean probability per token, a number between 0 and 1 that drops when any single token was
    a close call.
  </p>
  <Figure>
    <dl class="layout-stats-grid m-0">
      <Stat listed size="sm" label="Sum of log probabilities" value={score.logProb.toFixed(4)} />
      <Stat listed size="sm" label="Mean per token" value={score.meanLogProb.toFixed(4)} />
      <Stat listed size="sm" label="Confidence" value={score.confidence.toFixed(4)} />
      <Stat
        listed
        size="sm"
        label="Least certain token"
        value={`${score.weakest.piece} at ${probabilityOf(score.weakest.logProb).toFixed(4)}`}
      />
    </dl>
    {#snippet caption()}
      Computed from the {run.steps.length} steps of the recorded run above.
    {/snippet}
  </Figure>
  <p>
    Dokseo does not compute this for manga-ocr. The worker keeps only the index of the highest logit
    at each step and never applies softmax, so a Japanese capture stores
    <code>confidence: null</code>. The PaddleOCR engine, described below, does report one: its model
    outputs probabilities directly, and the worker averages the probability of each character it
    keeps.
  </p>
</DocsSection>
