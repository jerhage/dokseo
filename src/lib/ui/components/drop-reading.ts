type DropReader<T, F> = (transfer: T) => Promise<readonly F[]> | readonly F[];

type Droppable<F> = { readonly files: Iterable<F> };

function readDropped<T extends Droppable<F>, F>(
  transfer: T,
  reader: DropReader<T, F> | undefined,
): Promise<readonly F[]> {
  const read = reader === undefined ? [...transfer.files] : reader(transfer);
  return Promise.resolve(read);
}

export { readDropped };
export type { DropReader, Droppable };
