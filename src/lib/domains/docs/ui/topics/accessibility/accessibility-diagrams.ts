import type { DiagramBox, DiagramTone } from '$lib/ui/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width, height: 52, label, detail, tone };
}

const dom = box(0, 0, 360, 'DOM', '<button>Save</button> and its CSS');
const tree = box(
  0,
  100,
  360,
  'Accessibility tree',
  'role button, name "Save", focusable',
  'primary',
);
const platform = box(
  0,
  200,
  360,
  'Platform accessibility API',
  'UIA, AX API, AT-SPI, IAccessible2',
);
const reader = box(0, 300, 112, 'Screen reader', 'speaks it', 'accent');
const voice = box(124, 300, 112, 'Voice control', 'says "Save"', 'accent');
const switches = box(248, 300, 112, 'Switch access', 'steps to it', 'accent');

const DOM_TO_ASSISTIVE: DiagramSpec = {
  label:
    'The browser builds an accessibility tree from the DOM and its CSS. Each node in the tree has a role, a name and states, such as role button, name Save, focusable. The browser exposes the tree through the platform accessibility API, UI Automation, the macOS AX API, AT-SPI or IAccessible2, and assistive technology reads it from there: a screen reader speaks it, voice control matches a spoken word against the name, and switch access steps through the focusable nodes.',
  width: 360,
  height: 352,
  nodes: [dom, tree, platform, reader, voice, switches],
  edges: [
    { from: dom, to: tree, label: 'built by the browser' },
    { from: tree, to: platform, label: 'exposed' },
    { from: platform, to: reader },
    { from: platform, to: voice },
    { from: platform, to: switches },
  ],
};

const keydown = box(0, 0, 360, 'keydown', 'one listener for the reader');
const field = box(0, 104, 112, 'Text field', 'leave every key');
const space = box(124, 104, 112, 'Space', 'what has focus?', 'primary');
const arrow = box(248, 104, 112, 'Arrow key', 'any focus');
const pressed = box(0, 208, 170, 'On a button', 'leave it, the button presses', 'accent');
const turned = box(190, 208, 170, 'Turn the page', 'and cancel the key', 'primary');

const KEY_DECISION: DiagramSpec = {
  label:
    'A keydown listener for the reader first checks where focus is. In a text field it leaves every key alone. For Space, if a button has focus it leaves the key alone so the browser presses the button; anywhere else it turns the page and cancels the key. For an arrow key it turns the page and cancels the key whatever has focus, because an arrow does nothing on a button.',
  width: 360,
  height: 260,
  nodes: [keydown, field, space, arrow, pressed, turned],
  edges: [
    { from: keydown, to: field },
    { from: keydown, to: space },
    { from: keydown, to: arrow },
    { from: space, to: pressed, label: 'button' },
    { from: space, to: turned, label: 'else' },
    { from: arrow, to: turned },
  ],
};

export { DOM_TO_ASSISTIVE, KEY_DECISION };
