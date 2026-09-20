import type { TitleCandidate } from '../domain/book/title';

function entryName(file: File): string {
  return file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name;
}

function titleCandidate(file: File): TitleCandidate {
  return { name: file.name, path: file.webkitRelativePath };
}

export { entryName, titleCandidate };
