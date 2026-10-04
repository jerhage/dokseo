type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};

const RECOGNIZER_PORT: SourceSnippet = {
  label: 'The recognizer port',
  file: 'src/lib/domains/recognition/domain/engine/text-recognizer.ts',
  code: `interface TextRecognizer {
  readonly id: string;
  prepare(): Promise<RecognizerOpening>;
  cancel(): void;
  recognize(image: ImageBitmap): Promise<Recognition>;
}`,
};

const RECOGNIZER_FOR: SourceSnippet = {
  label: 'Choosing an adapter in the composition root',
  file: 'src/lib/composition/recognizers.ts',
  code: `function recognizerFor(language: Language): Promise<TextRecognizer> {
  const held = recognizers.get(language);
  if (held !== undefined) return held;

  const loading = runtimeFor(language)
    .then((runtime) =>
      match(runtime)
        .with('manga-ocr', () => loadMangaOcrRecognizer(language))
        .with('paddle-ocr', () => loadPaddleOcrRecognizer(language))
        .exhaustive(),
    )
    .catch((cause: unknown): never => {
      recognizers.delete(language);
      throw cause;
    });

  recognizers.set(language, loading);
  return loading;
}`,
};

const DECODE_LOOP: SourceSnippet = {
  label: 'The greedy decode loop in the manga-ocr worker',
  file: 'src/workers/ocr.worker.ts',
  code: `async read(image: ImageBitmap): Promise<string> {
  const inputs = await processor(RawImage.fromCanvas(canvasOf(image)));
  const encoded = await encoder.run({ pixel_values: inputs.pixel_values });
  const tokens = [DECODER_START_TOKEN];

  while (tokens.length < MAX_TOKENS) {
    const step = await decoder.run({
      input_ids: new Tensor('int64', BigInt64Array.from(tokens, BigInt), [1, tokens.length]),
      encoder_hidden_states: encoded.last_hidden_state,
    });

    const next = mostLikelyToken(logitsOf(step.logits));
    if (next === END_OF_TEXT_TOKEN) break;
    tokens.push(next);
  }

  const decoded: string = tokenizer.decode(tokens, { skip_special_tokens: true });
  return japaneseOcrText(decoded);
},`,
};

const WORKER_REQUESTS: SourceSnippet = {
  label: 'What the page sends the worker',
  file: 'src/workers/ocr-worker-protocol.ts',
  code: `type OcrRequest =
  | { readonly kind: 'open'; readonly id: number; readonly setup: RecognizerSetup }
  | { readonly kind: 'recognize'; readonly id: number; readonly image: ImageBitmap };`,
};

const DICTIONARY_CACHE_FIRST: SourceSnippet = {
  label: 'The PaddleOCR dictionary, cache first',
  file: 'src/workers/paddle-ocr.worker.ts',
  code: `async function dictionaryText(
  cacheName: string,
  url: string,
  fetched: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<string> {
  const cache = await caches.open(cacheName);
  const held = await cache.match(url);
  if (held !== undefined) return await held.text();

  const answer = checkedResponse(await fetched(url), 'GET', url);
  await cache.put(url, answer.clone());
  return await answer.text();
}`,
};

const OCR_SNIPPETS: readonly SourceSnippet[] = [
  RECOGNIZER_PORT,
  RECOGNIZER_FOR,
  DECODE_LOOP,
  WORKER_REQUESTS,
  DICTIONARY_CACHE_FIRST,
];

export {
  DECODE_LOOP,
  DICTIONARY_CACHE_FIRST,
  OCR_SNIPPETS,
  RECOGNIZER_FOR,
  RECOGNIZER_PORT,
  WORKER_REQUESTS,
};
export type { SourceSnippet };
