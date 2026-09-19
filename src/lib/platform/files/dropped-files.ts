function fileOf(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(
      (file) => resolve(file),
      () => resolve(null),
    );
  });
}

function batchOf(reader: FileSystemDirectoryReader): Promise<readonly FileSystemEntry[]> {
  return new Promise((resolve) => {
    reader.readEntries(
      (entries) => resolve(entries),
      () => resolve([]),
    );
  });
}

function located(file: File, path: string): File {
  if (file.webkitRelativePath.length > 0) return file;
  Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true });
  return file;
}

async function collect(entry: FileSystemEntry, prefix: string, into: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await fileOf(entry as FileSystemFileEntry);
    if (file === null) return;
    into.push(prefix === '' ? file : located(file, `${prefix}${entry.name}`));
    return;
  }
  if (!entry.isDirectory) return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const nested = `${prefix}${entry.name}/`;
  for (;;) {
    const batch = await batchOf(reader);
    if (batch.length === 0) return;
    for (const child of batch) await collect(child, nested, into);
  }
}

export async function filesFromDataTransfer(transfer: DataTransfer): Promise<readonly File[]> {
  const entries = [...transfer.items]
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (entries.length === 0) return [...transfer.files];

  const files: File[] = [];
  for (const entry of entries) await collect(entry, '', files);
  return files;
}
