import {
  CONTINUOUS_BOOK_ROW,
  FLOW_BOOK_ROW,
  PAGED_BOOK_ROW,
  REMOVED_PAGED_BOOK_ROW,
  UNREADABLE_BOOK_ROW,
} from './library-rows';

const VOCABULARY_TAG_ROW = {
  id: '1a7b9e68-c134-46f0-97a1-2e0f06b70649',
  name: 'vocabulary',
  colour: 'sage',
  createdAt: 1787897000000,
} as const;

const GRAMMAR_TAG_ROW = {
  id: 'd1a711cd-d4f9-4725-b59a-09e7610aae90',
  name: '文法 grammar',
  colour: 'plum',
  createdAt: 1788600000000,
} as const;

const RECOGNIZED_CAPTURE_ROW = {
  id: 'ab1fc743-cbbf-44d3-9373-99b2546981f8',
  bookId: PAGED_BOOK_ROW.id,
  anchor: {
    kind: 'region',
    regions: [{ index: 41, rect: { x: 0.612305, y: 0.084961, width: 0.091797, height: 0.287109 } }],
  },
  text: 'とーちゃん!',
  createdAt: 1790845100000,
  editedAt: 1790845160000,
  tagIds: [VOCABULARY_TAG_ROW.id, GRAMMAR_TAG_ROW.id],
  origin: 'recognized',
  note: 'Yotsuba calling her father',
  confidence: null,
} as const;

const SCORED_CAPTURE_ROW = {
  id: '20a2a984-4963-4b43-87a1-ca4acc3bb21d',
  bookId: CONTINUOUS_BOOK_ROW.id,
  anchor: {
    kind: 'region',
    regions: [
      { index: 17, rect: { x: 0.104167, y: 0.902344, width: 0.415625, height: 0.097656 } },
      { index: 18, rect: { x: 0.104167, y: 0, width: 0.415625, height: 0.041016 } },
    ],
  },
  text: '나는 혼자서 레벨업한다',
  createdAt: 1788003500000,
  editedAt: null,
  tagIds: [],
  origin: 'recognized',
  note: null,
  confidence: 0.934218,
} as const;

const WRITTEN_CAPTURE_ROW = {
  id: '4685dfb1-a355-4a53-8848-385d9217f118',
  bookId: REMOVED_PAGED_BOOK_ROW.id,
  anchor: {
    kind: 'region',
    regions: [{ index: 23, rect: { x: 0.05, y: 0.71875, width: 0.3125, height: 0.1875 } }],
  },
  text: 'ウンディーネ = water sprite, the gondoliers of Neo-Venezia',
  createdAt: 1788950000000,
  editedAt: null,
  tagIds: [VOCABULARY_TAG_ROW.id],
  origin: 'written',
} as const;

const LIFTED_CAPTURE_ROW = {
  id: 'ad87a95f-0721-43fc-a7eb-c636ae3770cc',
  bookId: FLOW_BOOK_ROW.id,
  anchor: {
    kind: 'text',
    cfi: 'epubcfi(/6/14!/4/2/38,/1:96,/1:112)',
    quote: {
      exact: '銀河ステーション',
      prefix: 'どこかで不思議な声が、',
      suffix: '、銀河ステーションと',
    },
    chapter: '六、銀河ステーション',
  },
  text: '銀河ステーション',
  createdAt: 1790932700000,
  editedAt: null,
  tagIds: [],
  origin: 'lifted',
  note: null,
} as const;

const CAPTURE_ROWS = [
  RECOGNIZED_CAPTURE_ROW,
  SCORED_CAPTURE_ROW,
  WRITTEN_CAPTURE_ROW,
  LIFTED_CAPTURE_ROW,
] as const;

const TAG_ROWS = [VOCABULARY_TAG_ROW, GRAMMAR_TAG_ROW] as const;

const UNREADABLE_TAG_ROW = {
  id: 'b49af40d-30c9-4a26-9f71-0dff8f181f6b',
  name: 'onomatopoeia',
  colour: 'teal',
  createdAt: 1785000100000,
} as const;

const UNREADABLE_CAPTURE_ROW = {
  id: 'cb8faef5-a153-4f86-bec7-9773225f4e47',
  bookId: UNREADABLE_BOOK_ROW.id,
  regions: [{ index: 12, rect: { x: 812, y: 96, width: 140, height: 512 } }],
  text: 'ネットスフィア',
  createdAt: 1785003500000,
} as const;

export {
  CAPTURE_ROWS,
  GRAMMAR_TAG_ROW,
  LIFTED_CAPTURE_ROW,
  RECOGNIZED_CAPTURE_ROW,
  SCORED_CAPTURE_ROW,
  TAG_ROWS,
  UNREADABLE_CAPTURE_ROW,
  UNREADABLE_TAG_ROW,
  VOCABULARY_TAG_ROW,
  WRITTEN_CAPTURE_ROW,
};
