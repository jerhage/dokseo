export function basename(name: string): string {
	const cut = name.lastIndexOf('/');
	return cut === -1 ? name : name.slice(cut + 1);
}

export function extensionOf(name: string): string {
	const last = basename(name);
	const dot = last.lastIndexOf('.');
	if (dot < 1) return '';
	return last.slice(dot + 1).toLowerCase();
}

export function withoutExtension(name: string): string {
	const last = basename(name);
	const dot = last.lastIndexOf('.');
	return dot < 1 ? last : last.slice(0, dot);
}
