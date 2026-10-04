import {
  cascadeOrder,
  compareSpecificity,
  specificity,
  splitSelectorList,
} from '../domain/cascade';
import type { CascadeEntry } from '../domain/cascade';

type SheetRule = {
  readonly layer: string | null;
  readonly rule: CSSStyleRule;
  readonly order: number;
};

type PageStyles = {
  readonly layerOrder: readonly string[];
  readonly rules: readonly SheetRule[];
};

function childLayer(parent: string | null, name: string): string {
  return parent === null ? name : `${parent}.${name}`;
}

function conditionHolds(rule: CSSRule): boolean {
  if (rule instanceof CSSMediaRule) return window.matchMedia(rule.media.mediaText).matches;
  if (rule instanceof CSSSupportsRule) return CSS.supports(rule.conditionText);
  return false;
}

function readPageStyles(target: Document): PageStyles {
  const rules: SheetRule[] = [];
  let layerOrder: readonly string[] = [];

  function walk(list: CSSRuleList, layer: string | null): void {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSLayerStatementRule) {
        if (layer === null && layerOrder.length === 0) layerOrder = Array.from(rule.nameList);
      } else if (rule instanceof CSSLayerBlockRule)
        walk(rule.cssRules, childLayer(layer, rule.name));
      else if (rule instanceof CSSStyleRule) rules.push({ layer, rule, order: rules.length });
      else if (rule instanceof CSSGroupingRule && conditionHolds(rule)) walk(rule.cssRules, layer);
    }
  }

  for (const sheet of Array.from(target.styleSheets)) walk(sheet.cssRules, null);
  return { layerOrder, rules };
}

function matches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

function entriesFor(element: Element, property: string, styles: PageStyles): CascadeEntry[] {
  return styles.rules.flatMap(({ layer, rule, order }) => {
    const value = rule.style.getPropertyValue(property).trim();
    if (value === '') return [];
    const matched = splitSelectorList(rule.selectorText)
      .filter((selector) => matches(element, selector))
      .map((selector) => ({ selector, specificity: specificity(selector) }))
      .toSorted((left, right) => compareSpecificity(right.specificity, left.specificity));
    const best = matched[0];
    if (best === undefined) return [];
    return [{ layer, selector: best.selector, specificity: best.specificity, value, order }];
  });
}

function cascadeFor(
  element: Element,
  property: string,
  styles: PageStyles,
): readonly CascadeEntry[] {
  return cascadeOrder(entriesFor(element, property, styles), styles.layerOrder);
}

function winnerFor(element: Element, property: string, styles: PageStyles): CascadeEntry | null {
  return cascadeFor(element, property, styles).at(-1) ?? null;
}

export { cascadeFor, readPageStyles, winnerFor };
export type { PageStyles, SheetRule };
