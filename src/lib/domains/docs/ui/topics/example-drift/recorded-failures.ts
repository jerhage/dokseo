import { DECODE_LOOP } from '../ocr/ocr-snippets';

const QUOTED_LINE_NOW = 'return jaOcrText(decoded);';

const QUOTED_LINE_BEFORE = 'return japaneseOcrText(decoded);';

const DECODE_LOOP_BEFORE = DECODE_LOOP.code.replace(QUOTED_LINE_NOW, QUOTED_LINE_BEFORE);

const FILE_BEFORE = 'src/lib/domains/recognition/domain/engine/japanese-ocr-text.ts';

const RENAME_REPORT_HEAD = ` ❯ |unit| src/lib/domains/docs/ui/topics/ocr/ocr-snippets.spec.ts (5 tests | 1 failed) 38ms
     × quotes The greedy decode loop in the manga-ocr worker exactly as the source file has it 35ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |unit| src/lib/domains/docs/ui/topics/ocr/ocr-snippets.spec.ts > the OCR page snippets > quotes The greedy decode loop in the manga-ocr worker exactly as the source file has it
AssertionError: expected 'import { chosenDevice } from \\'$lib/d…' to contain 'async read(image: ImageBitmap): Promi…'

- Expected
+ Received`;

const RENAME_REPORT_CHANGE = `@@ -13,7 +142,85 @@
  if (next === END_OF_TEXT_TOKEN) break;
  tokens.push(next);
  }

  const decoded: string = tokenizer.decode(tokens, { skip_special_tokens: true });
- return japaneseOcrText(decoded);
+ return jaOcrText(decoded);
  },`;

const RENAME_REPORT_END = ` ❯ src/lib/domains/docs/ui/topics/ocr/ocr-snippets.spec.ts:18:34
     16|       const source = readFileSync(snippet.file, 'utf8');
     17|
     18|       expect(unindented(source)).toContain(unindented(snippet.code));
       |                                  ^
     19|     },
     20|   );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)`;

const MOVED_FILE_REPORT = ` ❯ |unit| src/lib/domains/docs/ui/topics/unicode/unicode-snippets.spec.ts (15 tests | 1 failed) 6ms
     × quotes recognition/domain/engine/japanese-ocr-text.ts exactly as the source file has it 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |unit| src/lib/domains/docs/ui/topics/unicode/unicode-snippets.spec.ts > the Unicode page snippets > quotes recognition/domain/engine/japanese-ocr-text.ts exactly as the source file has it
Error: ENOENT: no such file or directory, open 'src/lib/domains/recognition/domain/engine/japanese-ocr-text.ts'
 ❯ src/lib/domains/docs/ui/topics/unicode/unicode-snippets.spec.ts:18:22
     16|     'quotes %s exactly as the source file has it',
     17|     (_label, snippet) => {
     18|       const source = readFileSync(snippet.file, 'utf8');
       |                      ^
     19|
     20|       expect(unindented(source)).toContain(unindented(snippet.code));

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯`;

export {
  DECODE_LOOP_BEFORE,
  FILE_BEFORE,
  MOVED_FILE_REPORT,
  QUOTED_LINE_BEFORE,
  QUOTED_LINE_NOW,
  RENAME_REPORT_CHANGE,
  RENAME_REPORT_END,
  RENAME_REPORT_HEAD,
};
