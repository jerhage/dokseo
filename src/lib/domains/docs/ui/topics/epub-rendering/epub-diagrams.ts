import type { DiagramBox, DiagramEdge, DiagramNode, DiagramTone } from '$lib/components/diagram';

type EpubDiagram = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

type Row = { readonly label: string; readonly detail: string; readonly tone?: DiagramTone };

const WIDTH = 360;

const BOX_X = 40;

const BOX_WIDTH = 280;

const BOX_HEIGHT = 48;

const GAP = 32;

const TOP = 8;

function column(label: string, rows: readonly Row[], edgeLabels: readonly string[]): EpubDiagram {
  const nodes = rows.map((row, index): DiagramBox => ({
    kind: 'box',
    x: BOX_X,
    y: TOP + index * (BOX_HEIGHT + GAP),
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    label: row.label,
    detail: row.detail,
    ...(row.tone === undefined ? {} : { tone: row.tone }),
  }));
  const edges = nodes.slice(1).flatMap((to, index): DiagramEdge[] => {
    const from = nodes[index];
    if (from === undefined) return [];
    const edgeLabel = edgeLabels[index];
    return [edgeLabel === undefined ? { from, to } : { from, to, label: edgeLabel }];
  });
  return {
    label,
    width: WIDTH,
    height: TOP * 2 + rows.length * BOX_HEIGHT + (rows.length - 1) * GAP,
    nodes,
    edges,
  };
}

const ARCHIVE_DIAGRAM = column(
  'The mimetype entry comes first, META-INF/container.xml names the package document, the package lists the files in its manifest and orders the chapters in its spine',
  [
    { label: 'mimetype', detail: 'first entry, stored: application/epub+zip' },
    { label: 'META-INF/container.xml', detail: 'rootfile full-path', tone: 'accent' },
    { label: 'OEBPS/package.opf', detail: 'metadata, manifest, spine', tone: 'primary' },
    { label: 'OEBPS/ch1.xhtml, ch2, ch3', detail: 'XHTML content documents' },
  ],
  ['then', 'names', 'orders'],
);

const FRAME_DIAGRAM = column(
  'The Dokseo page holds a foliate-view element, whose closed shadow root holds the paginator, whose container holds one iframe loaded from a blob URL, whose document is laid out in columns that are the pages',
  [
    { label: 'Dokseo page', detail: 'a stage element in the reader' },
    { label: '<foliate-view>', detail: 'closed shadow root', tone: 'accent' },
    { label: '<foliate-paginator>', detail: 'container with overflow hidden', tone: 'accent' },
    { label: '<iframe src="blob:…">', detail: 'sandbox, one chapter', tone: 'primary' },
    { label: 'chapter <html>', detail: 'CSS columns, one per page' },
  ],
  ['holds', 'renders with', 'loads', 'lays out'],
);

const PAGE_TOP = 40;

const PAGE_WIDTH = 96;

const PAGE_HEIGHT = 72;

const PAGE_GAP = 16;

const PAGE_LEFT = 24;

function page(index: number, detail: string, tone: DiagramTone): DiagramBox {
  return {
    kind: 'box',
    x: PAGE_LEFT + index * (PAGE_WIDTH + PAGE_GAP),
    y: PAGE_TOP,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    label: `Page ${index + 1}`,
    detail,
    tone,
  };
}

const COLUMNS_DIAGRAM: EpubDiagram = {
  label:
    'The chapter document is one wide row of columns, each column one page; the paginator scrolls so that one column at a time is on screen',
  width: WIDTH,
  height: 128,
  nodes: [
    {
      kind: 'group',
      x: 8,
      y: 8,
      width: 344,
      height: 112,
      label: 'chapter frame, as wide as all its pages',
    },
    page(0, 'scrolled past', 'neutral'),
    page(1, 'on screen', 'primary'),
    page(2, 'next', 'neutral'),
  ],
  edges: [],
};

export { ARCHIVE_DIAGRAM, COLUMNS_DIAGRAM, FRAME_DIAGRAM };
export type { EpubDiagram };
