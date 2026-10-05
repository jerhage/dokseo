import { formattedMarkup } from './format.js';

/**
 * @typedef {{ readonly kind: 'match'; readonly rendered: string; readonly fixture: string }
 *   | {
 *       readonly kind: 'mismatch';
 *       readonly rendered: string;
 *       readonly fixture: string;
 *       readonly line: number;
 *       readonly message: string;
 *     }} MarkupComparison
 */

/**
 * @param {readonly string[]} left
 * @param {readonly string[]} right
 * @returns {number}
 */
function firstDifferentLine(left, right) {
  const longer = Math.max(left.length, right.length);
  for (let index = 0; index < longer; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return longer;
}

/**
 * @param {string | undefined} line
 * @returns {string}
 */
function shown(line) {
  return line === undefined ? '(nothing)' : line.trim();
}

/**
 * @param {string} rendered
 * @param {string} fixture
 * @returns {MarkupComparison}
 */
function compareMarkup(rendered, fixture) {
  const fromComponent = formattedMarkup(rendered);
  const fromFixture = formattedMarkup(fixture);
  if (fromComponent === fromFixture) {
    return { kind: 'match', rendered: fromComponent, fixture: fromFixture };
  }
  const componentLines = fromComponent.split('\n');
  const fixtureLines = fromFixture.split('\n');
  const index = firstDifferentLine(componentLines, fixtureLines);
  const message = [
    `The rendered markup differs from the fixture at line ${index + 1}.`,
    `  fixture:  ${shown(fixtureLines[index])}`,
    `  rendered: ${shown(componentLines[index])}`,
  ].join('\n');
  return {
    kind: 'mismatch',
    rendered: fromComponent,
    fixture: fromFixture,
    line: index + 1,
    message,
  };
}

export { compareMarkup };
