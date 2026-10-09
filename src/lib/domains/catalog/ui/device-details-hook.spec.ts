import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { createDeviceDetails } from './device-details.svelte';

describe('createDeviceDetails', () => {
  it('shows the device book the navigation holds once it is connected', () => {
    const details = createDeviceDetails();
    expect(details.hooks.shown()).toBeNull();

    const asked: string[] = [];
    details.connect({
      openDetails: () => undefined,
      closeDetails: () => undefined,
      detailsOf: (tab) => {
        asked.push(tab);
        return 'book-1';
      },
    });

    expect(details.hooks.shown()).toBe(bookId('book-1'));
    expect(asked).toEqual(['device']);
  });

  it('forwards an opening and a closing to the navigation', () => {
    const details = createDeviceDetails();
    const told: string[] = [];
    details.connect({
      openDetails: (id) => void told.push(`open ${id}`),
      closeDetails: () => void told.push('close'),
      detailsOf: () => null,
    });

    details.hooks.opened(bookId('book-1'));
    details.hooks.closed();

    expect(told).toEqual(['open book-1', 'close']);
  });
});
