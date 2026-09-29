type NamedEntry = {
  readonly name: string;
  readonly webkitRelativePath: string;
};

const NO_UPLOAD_NAME = '';

function uploadName(entries: readonly NamedEntry[]): string {
  const [first] = entries;
  if (first === undefined) return NO_UPLOAD_NAME;
  if (entries.length === 1) return first.name.normalize('NFC');
  const [folder = NO_UPLOAD_NAME] = first.webkitRelativePath.split('/');
  const shared = entries.every((entry) => entry.webkitRelativePath.startsWith(`${folder}/`));
  return shared ? folder.normalize('NFC') : NO_UPLOAD_NAME;
}

export { NO_UPLOAD_NAME, uploadName };
export type { NamedEntry };
