type ModalHeading<Header> =
  | { readonly kind: 'title'; readonly title: string }
  | { readonly kind: 'custom'; readonly header: Header }
  | { readonly kind: 'none' };

function modalHeading<Header>(
  title: string | undefined,
  header: Header | undefined,
): ModalHeading<Header> {
  if (title !== undefined) return { kind: 'title', title };
  if (header !== undefined) return { kind: 'custom', header };

  return { kind: 'none' };
}

function modalLabelledBy<Header>(
  heading: ModalHeading<Header>,
  titleId: string,
  given: string | null | undefined,
): string | undefined {
  if (heading.kind === 'title') return titleId;

  return given ?? undefined;
}

export { modalHeading, modalLabelledBy };
export type { ModalHeading };
