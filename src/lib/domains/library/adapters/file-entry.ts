import type { TitleCandidate } from '../domain/book/title';

function canonical(text: string): string {
  return text.normalize('NFC');
}

function entryName(file: File): string {
  const named = file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name;

  return canonical(named);
}

function titleCandidate(file: File): TitleCandidate {
  return { name: canonical(file.name), path: canonical(file.webkitRelativePath) };
}

export { entryName, titleCandidate };
