import type { FileLike, FileSelection } from '$lib/ui/components/file-selection';

function arrivedFiles<F extends FileLike>(selection: FileSelection<F>): readonly F[] {
  return selection.arrived.map((arrived) => arrived.file);
}

export { arrivedFiles };
