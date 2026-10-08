import { fallbackFileName } from '../domain/download-file-name';
import type { ClientFailure, DownloadProgress } from '../domain/catalog-source';
import type { Acquisition, RemotePublication } from '../domain/remote-publication';
import { catalogAccess } from './catalog-access';
import type { CatalogAccessDeps, CatalogAccessFailure } from './catalog-access';

type AcquisitionDownload =
  | {
      readonly kind: 'success';
      readonly file: File;
      readonly acquisition: Acquisition;
    }
  | { readonly kind: 'unsupported' }
  | ClientFailure
  | CatalogAccessFailure;

type DownloadAcquisitionDeps = CatalogAccessDeps;

async function downloadAcquisition(
  deps: DownloadAcquisitionDeps,
  publication: RemotePublication,
  onProgress: DownloadProgress,
  signal?: AbortSignal,
): Promise<AcquisitionDownload> {
  const { acquisition } = publication;
  if (acquisition === null) return { kind: 'unsupported' };

  const access = await catalogAccess(deps, publication.catalogId);
  if (access.kind !== 'success') return access;

  const downloaded = await access.source.download(
    acquisition,
    access.credentials,
    fallbackFileName(publication.title, acquisition.format),
    onProgress,
    signal,
  );
  if (downloaded.kind !== 'success') return downloaded;

  return { kind: 'success', file: downloaded.file, acquisition };
}

export { downloadAcquisition };
export type { AcquisitionDownload, DownloadAcquisitionDeps };
