import type { TitleCandidate } from '../domain/title';

export function entryName(file: File): string {
  return file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name;
}

export function titleCandidate(file: File): TitleCandidate {
  return { name: file.name, path: file.webkitRelativePath };
}
