import type { BrowserCommand, BrowserCommandContext } from 'vitest/node';

type Page = BrowserCommandContext['page'];

type Frame = Awaited<ReturnType<BrowserCommandContext['frame']>>;

type CDPSession = Awaited<ReturnType<ReturnType<Page['context']>['newCDPSession']>>;

type PointerKind = 'mouse' | 'touch';

type PointerAction = 'down' | 'move' | 'up' | 'cancel';

type PointerInput = {
  readonly kind: PointerKind;
  readonly action: PointerAction;
  readonly x: number;
  readonly y: number;
};

type PagePoint = { readonly x: number; readonly y: number };

type FrameBox = {
  readonly frame: Frame;
  readonly box: { x: number; y: number; width: number; height: number };
};

type TouchType = 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel';

const TOUCH_EVENTS: Readonly<Record<PointerAction, TouchType>> = {
  down: 'touchStart',
  move: 'touchMove',
  up: 'touchEnd',
  cancel: 'touchCancel',
};

const sessions = new WeakMap<Page, Promise<CDPSession>>();

function sessionOf(page: Page): Promise<CDPSession> {
  const known = sessions.get(page);
  if (known !== undefined) return known;
  const opened = page.context().newCDPSession(page);
  sessions.set(page, opened);
  return opened;
}

async function frameBox(context: BrowserCommandContext): Promise<FrameBox> {
  const frame = await context.frame();
  const owner = await frame.frameElement();
  const box = await owner.boundingBox();
  if (box === null) throw new Error('The test frame has no box on the page');
  return { frame, box };
}

async function onPage(context: BrowserCommandContext, input: PointerInput): Promise<PagePoint> {
  const { frame, box } = await frameBox(context);
  const width = await frame.evaluate(() => window.innerWidth);
  const scale = box.width / width;
  return { x: box.x + input.x * scale, y: box.y + input.y * scale };
}

async function mouse(page: Page, action: PointerAction, at: PagePoint): Promise<void> {
  await page.mouse.move(at.x, at.y);
  if (action === 'down') await page.mouse.down();
  if (action === 'up' || action === 'cancel') await page.mouse.up();
}

async function touch(page: Page, action: PointerAction, at: PagePoint): Promise<void> {
  const session = await sessionOf(page);
  const lifted = action === 'up' || action === 'cancel';
  await session.send('Input.dispatchTouchEvent', {
    type: TOUCH_EVENTS[action],
    touchPoints: lifted ? [] : [{ x: at.x, y: at.y, id: 0 }],
  });
}

const rulePointer: BrowserCommand<[PointerInput]> = async (context, input) => {
  const at = await onPage(context, input);
  if (input.kind === 'touch') await touch(context.page, input.action, at);
  else await mouse(context.page, input.action, at);
};

const rulePointerAway: BrowserCommand<[]> = async (context) => {
  const { box } = await frameBox(context);
  const page = context.page.viewportSize();
  if (page === null) throw new Error('The page has no viewport size');
  const right = box.x + box.width + 1;
  const below = box.y + box.height + 1;
  if (right < page.width) await context.page.mouse.move(right, box.y);
  else if (below < page.height) await context.page.mouse.move(box.x, below);
  else throw new Error('The test frame fills the page, so the mouse has nowhere else to rest');
};

const ruleCoarsePointer: BrowserCommand<[boolean]> = async (context, coarse) => {
  const session = await sessionOf(context.page);
  await session.send(
    'Emulation.setTouchEmulationEnabled',
    coarse ? { enabled: true, maxTouchPoints: 1 } : { enabled: false },
  );
};

declare module 'vitest/browser' {
  interface BrowserCommands {
    rulePointer: (input: PointerInput) => Promise<void>;
    rulePointerAway: () => Promise<void>;
    ruleCoarsePointer: (coarse: boolean) => Promise<void>;
  }
}

export { ruleCoarsePointer, rulePointer, rulePointerAway };
export type { PointerAction, PointerInput, PointerKind };
