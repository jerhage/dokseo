import type { DiagramBox, DiagramGroup, DiagramTone } from '$lib/ui/components/diagram';
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

const newTabOpens = box(
  0,
  0,
  360,
  'Tab B on 1.1 opens the database',
  'at a higher version than the one stored',
  'primary',
);
const oldTabCloses = box(
  0,
  96,
  360,
  'Tab A on 1.0 receives versionchange',
  'and closes its connection',
);
const rowsMigrated = box(
  0,
  192,
  360,
  'The upgrade rewrites every book row',
  'each row gains newField',
  'accent',
);
const oldTabSaves = box(
  0,
  288,
  360,
  'Tab A saves a new reading place',
  'it reopens at the old, lower version',
);
const openFails = box(0, 384, 170, 'VersionError', 'nothing is written');
const oldTabReloads = box(190, 384, 170, 'Reload', 'tab A runs 1.1', 'primary');

const ROW_ACROSS_VERSIONS: DiagramSpec = {
  label:
    'Tab B, on version 1.1 of Dokseo, opens the database at a higher version than the one stored. Tab A, still on 1.0, receives versionchange and closes its connection. The upgrade rewrites every book row, and each row gains a field called newField. Tab A then saves a new reading place: it reopens the database at its old, lower version, the open fails with a VersionError, and nothing is written. After a reload, tab A runs 1.1.',
  width: 360,
  height: 436,
  nodes: [newTabOpens, oldTabCloses, rowsMigrated, oldTabSaves, openFails, oldTabReloads],
  edges: [
    { from: newTabOpens, to: oldTabCloses },
    { from: oldTabCloses, to: rowsMigrated, label: 'upgrade' },
    { from: rowsMigrated, to: oldTabSaves },
    { from: oldTabSaves, to: openFails, label: 'open' },
    { from: openFails, to: oldTabReloads },
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
