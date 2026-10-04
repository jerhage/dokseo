import type { DiagramBox, DiagramGroup, DiagramTone } from '$lib/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

const BOX_HEIGHT = 52;

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width, height: BOX_HEIGHT, label, detail, tone };
}

function group(y: number, height: number, label: string, tone: DiagramTone): DiagramGroup {
  return { kind: 'group', x: 0, y, width: 360, height, label, tone };
}

const newTabSaves = box(
  0,
  0,
  360,
  'A tab on the new version saves',
  'the row gains newField',
  'primary',
);
const rowWithField = box(
  0,
  96,
  360,
  'The book row in IndexedDB',
  'known fields and newField',
  'accent',
);
const oldTabReads = box(
  0,
  192,
  360,
  'A tab still on the old version reads it',
  'bookFromStored: newField never reaches the app',
);
const oldTabSaves = box(
  0,
  288,
  360,
  'That tab saves a new reading place',
  'update() writes the row',
);
const builtFromBook = box(0, 384, 170, 'Row built from Book', 'newField is gone');
const storedPlusBook = box(190, 384, 170, 'Stored row, then Book', 'newField is kept', 'primary');

const ROW_ACROSS_VERSIONS: DiagramSpec = {
  label:
    'A tab on the new version of Dokseo saves a book, and the row in IndexedDB gains a field called newField. A tab still running the old version reads the same row with bookFromStored, which builds a book from the fields its Book type names, so newField never reaches the old app. That tab then saves a new reading place. If the save wrote a row built from the book alone, newField would be gone. Dokseo writes the stored row first and the checked book over it, so newField is kept.',
  width: 360,
  height: 436,
  nodes: [newTabSaves, rowWithField, oldTabReads, oldTabSaves, builtFromBook, storedPlusBook],
  edges: [
    { from: newTabSaves, to: rowWithField, label: 'put' },
    { from: rowWithField, to: oldTabReads, label: 'get' },
    { from: oldTabReads, to: oldTabSaves },
    { from: oldTabSaves, to: builtFromBook },
    { from: oldTabSaves, to: storedPlusBook },
  ],
};

const booksGroup = group(0, 116, 'books store, built', 'neutral');
const firstVolume = box(8, 40, 108, 'Volume 1', 'seriesId: s-1');
const secondVolume = box(126, 40, 108, 'Volume 2', 'seriesId: s-1');
const thirdVolume = box(244, 40, 108, 'Volume 3', 'seriesId: s-1');
const seriesRecord = box(
  60,
  200,
  240,
  'Series s-1',
  'series store, planned: id and name',
  'accent',
);

const SERIES_MODEL: DiagramSpec = {
  label:
    'Three book rows in the books store, volumes 1, 2 and 3, each hold the same seriesId, s-1, and their own volume number. The seriesId refers to one record in a planned series store, which holds the series id and its name. The books store exists today; the series store does not.',
  width: 360,
  height: 252,
  nodes: [booksGroup, firstVolume, secondVolume, thirdVolume, seriesRecord],
  edges: [
    { from: firstVolume, to: seriesRecord },
    { from: secondVolume, to: seriesRecord, label: 'seriesId' },
    { from: thirdVolume, to: seriesRecord },
  ],
};

export { ROW_ACROSS_VERSIONS, SERIES_MODEL };
