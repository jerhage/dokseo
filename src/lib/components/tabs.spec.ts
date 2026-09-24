import { describe, expect, it } from 'vitest';
import { shownTab } from './tabs';

const TABS = [
  { id: 'billing', label: 'Billing', disabled: true },
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
];

describe('shownTab', () => {
  it('shows the selected tab', () => {
    expect(shownTab(TABS, 'activity')).toBe('activity');
  });

  it('shows the first enabled tab when nothing is selected', () => {
    expect(shownTab(TABS, undefined)).toBe('overview');
  });

  it('shows the first enabled tab in place of a selection that names no tab', () => {
    expect(shownTab(TABS, 'gone')).toBe('overview');
  });

  it('refuses to show a disabled tab even when it is selected', () => {
    expect(shownTab(TABS, 'billing')).toBe('overview');
  });

  it('shows nothing when every tab is disabled', () => {
    expect(shownTab([{ id: 'a', label: 'A', disabled: true }], 'a')).toBeUndefined();
  });
});
