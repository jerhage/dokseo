import type { PackedFile } from '../../../domain/asset-limit';

type LinderaArchive = {
  readonly name: string;
  readonly zipBytes: number;
  readonly unpackedBytes: number;
  readonly files: readonly PackedFile[];
};

type AnalyzerOption = {
  readonly name: string;
  readonly form: string;
  readonly license: string;
  readonly activity: string;
  readonly dictionaries: string;
  readonly languages: string;
};

type MecabLine = {
  readonly surface: string;
  readonly features: string;
};

const IPADIC_ARCHIVE: LinderaArchive = {
  name: 'lindera-ipadic-6.2.0.zip',
  zipBytes: 10_519_550,
  unpackedBytes: 47_528_940,
  files: [
    { name: 'dict.words', bytes: 32_674_733 },
    { name: 'dict.trie', bytes: 4_587_532 },
    { name: 'dict.vals', bytes: 3_921_250 },
    { name: 'matrix.mtx', bytes: 3_463_718 },
    { name: 'dict.wordsidx', bytes: 1_568_504 },
    { name: 'dict.valsidx', bytes: 1_303_480 },
    { name: 'NOTICE.txt', bytes: 4_092 },
    { name: 'unk.bin', bytes: 2_492 },
    { name: 'char_def.bin', bytes: 2_360 },
    { name: 'metadata.json', bytes: 779 },
  ],
};

const KO_DIC_ARCHIVE: LinderaArchive = {
  name: 'lindera-ko-dic-6.2.0.zip',
  zipBytes: 19_876_022,
  unpackedBytes: 85_610_469,
  files: [
    { name: 'dict.words', bytes: 39_527_479 },
    { name: 'matrix.mtx', bytes: 20_585_298 },
    { name: 'dict.trie', bytes: 10_878_988 },
    { name: 'dict.vals', bytes: 8_162_830 },
    { name: 'dict.wordsidx', bytes: 3_265_132 },
    { name: 'dict.valsidx', bytes: 3_098_332 },
    { name: 'metadata.json', bytes: 77_254 },
    { name: 'NOTICE.txt', bytes: 11_956 },
    { name: 'char_def.bin', bytes: 2_484 },
    { name: 'unk.bin', bytes: 716 },
  ],
};

const IPADIC_FIELDS = [
  'surface',
  'left_context_id',
  'right_context_id',
  'cost',
  'part_of_speech',
  'part_of_speech_subcategory_1',
  'part_of_speech_subcategory_2',
  'part_of_speech_subcategory_3',
  'conjugation_form',
  'conjugation_type',
  'base_form',
  'reading',
  'pronunciation',
] as const;

const MECAB_SUMOMO: readonly MecabLine[] = [
  { surface: 'すもも', features: '名詞,一般,*,*,*,*,すもも,スモモ,スモモ' },
  { surface: 'も', features: '助詞,係助詞,*,*,*,*,も,モ,モ' },
  { surface: 'もも', features: '名詞,一般,*,*,*,*,もも,モモ,モモ' },
  { surface: 'も', features: '助詞,係助詞,*,*,*,*,も,モ,モ' },
  { surface: 'もも', features: '名詞,一般,*,*,*,*,もも,モモ,モモ' },
  { surface: 'の', features: '助詞,連体化,*,*,*,*,の,ノ,ノ' },
  { surface: 'うち', features: '名詞,非自立,副詞可能,*,*,*,うち,ウチ,ウチ' },
];

const ANALYZER_OPTIONS: readonly AnalyzerOption[] = [
  {
    name: 'Lindera (lindera-wasm 6.2.0)',
    form: 'Rust compiled to WebAssembly',
    license: 'MIT',
    activity: 'Released 2026-09-26',
    dictionaries:
      'Loaded at run time: IPADIC 10.5 MB, UniDic 46.4 MB, ko-dic 19.9 MB, SudachiDict 131.5 MB (zips)',
    languages: 'Japanese and Korean',
  },
  {
    name: 'kuromoji.js 0.1.2',
    form: 'Pure JavaScript',
    license: 'Apache-2.0',
    activity: 'Last release 2018-03-19',
    dictionaries: 'IPADIC, bundled',
    languages: 'Japanese',
  },
  {
    name: 'Sudachi',
    form: 'No official WebAssembly build; community builds',
    license: 'SudachiDict: Apache-2.0',
    activity: 'Browser builds come from third parties',
    dictionaries: 'SudachiDict, about 71 MB',
    languages: 'Japanese',
  },
];

export { ANALYZER_OPTIONS, IPADIC_ARCHIVE, IPADIC_FIELDS, KO_DIC_ARCHIVE, MECAB_SUMOMO };
export type { AnalyzerOption, LinderaArchive, MecabLine };
