import type { DiagramBox } from '$lib/ui/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

const STEP_ROWS = [0, 80, 160, 240, 320] as const;

type StepRow = 0 | 1 | 2 | 3 | 4;

function leftBox(row: StepRow, label: string, detail: string): DiagramBox {
  return { kind: 'box', x: 0, y: STEP_ROWS[row], width: 180, height: 50, label, detail };
}

function rightBox(row: StepRow, label: string, detail: string): DiagramBox {
  return { kind: 'box', x: 210, y: STEP_ROWS[row], width: 150, height: 50, label, detail };
}

const phone = { ...leftBox(0, 'Phone', 'Harbor Lights is 9a1c6f04…'), tone: 'primary' } as const;
const file = { ...leftBox(2, 'The file', 'book-1: hash, name, title'), tone: 'accent' } as const;
const laptop = { ...leftBox(4, 'Laptop', 'Harbor Lights is 2c84e1f6…'), tone: 'primary' } as const;
const exportStep = rightBox(1, 'Export', 'local id → book-1');
const importStep = rightBox(3, 'Import', 'book-1 → local id');

const ROUND_TRIP: DiagramSpec = {
  label:
    'The phone exports a file. Its local book id 9a1c6f04 becomes the key book-1, described by the content hash, file name and title. The laptop imports the file and matches book-1 to its own local id for the same book, 2c84e1f6. Capture ids are copied unchanged. The same path runs the other way.',
  width: 360,
  height: 370,
  nodes: [phone, file, laptop, exportStep, importStep],
  edges: [
    { from: phone, to: file, label: 'export' },
    { from: file, to: laptop, label: 'import' },
  ],
};

const read = { ...leftBox(0, 'Read', 'readCapturesFile'), tone: 'primary' } as const;
const plan = { ...leftBox(1, 'Plan', 'planCapturesImport'), tone: 'primary' } as const;
const preview = leftBox(2, 'Preview', 'counts, nothing written');
const choose = leftBox(3, 'Choose', 'a rule, or review each');
const apply = { ...leftBox(4, 'Apply', 'applyCapturesImport'), tone: 'accent' } as const;
const rejected = rightBox(0, 'Rejected', 'not-an-export, newer-version');
const local = rightBox(1, "This device's holdings", 'shelf, removed, tags, captures');
const cancelled = rightBox(2, 'Cancel', 'nothing was written');

const IMPORT_PIPELINE: DiagramSpec = {
  label:
    "The file is read first; a file that is not an export, or comes from a newer version, is rejected there. The read file and this device's holdings are planned together. The preview shows the plan's counts and writes nothing, and Cancel leaves the device as it was. The reader chooses how conflicts resolve, and only then does apply write.",
  width: 360,
  height: 370,
  nodes: [read, plan, preview, choose, apply, rejected, local, cancelled],
  edges: [
    { from: read, to: plan },
    { from: plan, to: preview },
    { from: preview, to: choose },
    { from: choose, to: apply, label: 'Import' },
    { from: read, to: rejected },
    { from: local, to: plan },
    { from: preview, to: cancelled },
  ],
};

export { IMPORT_PIPELINE, ROUND_TRIP };
