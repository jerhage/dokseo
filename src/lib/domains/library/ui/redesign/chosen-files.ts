import type { FileLike, FileSelection } from '$lib/components/file-selection';

type ChosenInput<F> = { readonly files: Iterable<F> | null; value: string };

function takeChosen<F>(input: ChosenInput<F>): readonly F[] {
  const chosen = input.files === null ? [] : [...input.files];
  input.value = '';
  return chosen;
}

function arrivedFiles<F extends FileLike>(selection: FileSelection<F>): readonly F[] {
  return [...selection.accepted, ...selection.rejected.map((rejected) => rejected.file)];
}

export { arrivedFiles, takeChosen };
export type { ChosenInput };
