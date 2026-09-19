import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { at } from '$lib/shared/testing/at';
import UploadTile from './UploadTile.svelte';

function filePickerIn(container: HTMLElement): HTMLInputElement {
	const input = container.querySelector<HTMLInputElement>(
		'input[type="file"]:not([webkitdirectory])'
	);
	if (input === null) throw new Error('The tile rendered no file picker');
	return input;
}

function choose(input: HTMLInputElement, ...files: readonly File[]): void {
	const transfer = new DataTransfer();
	for (const file of files) transfer.items.add(file);
	input.files = transfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

test('passes the chosen file to onfiles even though the input is cleared afterwards', async () => {
	const onfiles = vi.fn();
	const { container } = await render(UploadTile, { props: { busy: false, onfiles } });
	const input = filePickerIn(container);

	choose(input, new File(['zip bytes'], 'chapter.cbz', { type: 'application/zip' }));

	expect(onfiles).toHaveBeenCalledTimes(1);
	const received = at(onfiles.mock.calls, 0)[0] as readonly File[];
	expect(received.map((file) => file.name)).toEqual(['chapter.cbz']);
});

test('clears the picker so the same file can be chosen twice', async () => {
	const onfiles = vi.fn();
	const { container } = await render(UploadTile, { props: { busy: false, onfiles } });
	const input = filePickerIn(container);

	choose(input, new File(['zip bytes'], 'chapter.cbz', { type: 'application/zip' }));
	expect(input.value).toBe('');

	choose(input, new File(['zip bytes'], 'chapter.cbz', { type: 'application/zip' }));
	expect(onfiles).toHaveBeenCalledTimes(2);
});

test('delivers several chosen files together', async () => {
	const onfiles = vi.fn();
	const { container } = await render(UploadTile, { props: { busy: false, onfiles } });
	const input = filePickerIn(container);

	choose(
		input,
		new File(['a'], 'page001.jpg', { type: 'image/jpeg' }),
		new File(['b'], 'page002.jpg', { type: 'image/jpeg' })
	);

	const received = at(onfiles.mock.calls, 0)[0] as readonly File[];
	expect(received.map((file) => file.name)).toEqual(['page001.jpg', 'page002.jpg']);
});

test('ignores a selection of nothing', async () => {
	const onfiles = vi.fn();
	const { container } = await render(UploadTile, { props: { busy: false, onfiles } });
	const input = filePickerIn(container);

	choose(input);

	expect(onfiles).not.toHaveBeenCalled();
});
