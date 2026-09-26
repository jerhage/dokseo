type LibrarySection = {
  readonly href: string;
  readonly name: string;
  readonly title?: string;
  readonly current: boolean;
};

const LIBRARY_SECTIONS: readonly LibrarySection[] = [
  { href: '/', name: 'Library', current: true },
  { href: '/tags', name: 'Tags', title: 'Tags across your documents', current: false },
  { href: '/settings', name: 'Settings', title: 'OCR engine settings', current: false },
];

export { LIBRARY_SECTIONS };
export type { LibrarySection };
