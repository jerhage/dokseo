type ZipEntry = {
  readonly path: string;
  readonly bytes: Uint8Array;
};

type PlacedEntry = ZipEntry & {
  readonly name: Uint8Array;
  readonly crc: number;
  readonly offset: number;
};

const LOCAL_FILE_SIGNATURE = 0x04034b50;

const CENTRAL_FILE_SIGNATURE = 0x02014b50;

const END_OF_DIRECTORY_SIGNATURE = 0x06054b50;

const VERSION_FOR_STORED_FILES = 10;

const STORED = 0;

const NAMES_IN_UTF8 = 0x0800;

const MIDNIGHT = 0;

const FIRST_OF_JANUARY_1980 = (1 << 5) | 1;

const LOCAL_HEADER_BYTES = 30;

const CENTRAL_HEADER_BYTES = 46;

const END_RECORD_BYTES = 22;

const CRC_POLYNOMIAL = 0xedb88320;

const BYTE_VALUES = 256;

const CRC_TABLE = Array.from({ length: BYTE_VALUES }, (_, byte) => {
  let value = byte;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? CRC_POLYNOMIAL ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function textEntry(path: string, text: string): ZipEntry {
  return { path, bytes: new TextEncoder().encode(text) };
}

function placed(entries: readonly ZipEntry[]): readonly PlacedEntry[] {
  const encoder = new TextEncoder();
  let offset = 0;
  return entries.map((entry) => {
    const name = encoder.encode(entry.path);
    const at = offset;
    offset += LOCAL_HEADER_BYTES + name.length + entry.bytes.length;
    return { ...entry, name, crc: crc32(entry.bytes), offset: at };
  });
}

function writeLocalHeader(view: DataView, at: number, entry: PlacedEntry): void {
  view.setUint32(at, LOCAL_FILE_SIGNATURE, true);
  view.setUint16(at + 4, VERSION_FOR_STORED_FILES, true);
  view.setUint16(at + 6, NAMES_IN_UTF8, true);
  view.setUint16(at + 8, STORED, true);
  view.setUint16(at + 10, MIDNIGHT, true);
  view.setUint16(at + 12, FIRST_OF_JANUARY_1980, true);
  view.setUint32(at + 14, entry.crc, true);
  view.setUint32(at + 18, entry.bytes.length, true);
  view.setUint32(at + 22, entry.bytes.length, true);
  view.setUint16(at + 26, entry.name.length, true);
  view.setUint16(at + 28, 0, true);
}

function writeCentralHeader(view: DataView, at: number, entry: PlacedEntry): void {
  view.setUint32(at, CENTRAL_FILE_SIGNATURE, true);
  view.setUint16(at + 4, VERSION_FOR_STORED_FILES, true);
  view.setUint16(at + 6, VERSION_FOR_STORED_FILES, true);
  view.setUint16(at + 8, NAMES_IN_UTF8, true);
  view.setUint16(at + 10, STORED, true);
  view.setUint16(at + 12, MIDNIGHT, true);
  view.setUint16(at + 14, FIRST_OF_JANUARY_1980, true);
  view.setUint32(at + 16, entry.crc, true);
  view.setUint32(at + 20, entry.bytes.length, true);
  view.setUint32(at + 24, entry.bytes.length, true);
  view.setUint16(at + 28, entry.name.length, true);
  view.setUint32(at + 42, entry.offset, true);
}

function storedZip(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  const files = placed(entries);
  const directoryAt = files.reduce(
    (size, file) => size + LOCAL_HEADER_BYTES + file.name.length + file.bytes.length,
    0,
  );
  const directorySize = files.reduce(
    (size, file) => size + CENTRAL_HEADER_BYTES + file.name.length,
    0,
  );
  const archive = new Uint8Array(directoryAt + directorySize + END_RECORD_BYTES);
  const view = new DataView(archive.buffer);

  for (const file of files) {
    writeLocalHeader(view, file.offset, file);
    archive.set(file.name, file.offset + LOCAL_HEADER_BYTES);
    archive.set(file.bytes, file.offset + LOCAL_HEADER_BYTES + file.name.length);
  }

  let at = directoryAt;
  for (const file of files) {
    writeCentralHeader(view, at, file);
    archive.set(file.name, at + CENTRAL_HEADER_BYTES);
    at += CENTRAL_HEADER_BYTES + file.name.length;
  }

  view.setUint32(at, END_OF_DIRECTORY_SIGNATURE, true);
  view.setUint16(at + 8, files.length, true);
  view.setUint16(at + 10, files.length, true);
  view.setUint32(at + 12, directorySize, true);
  view.setUint32(at + 16, directoryAt, true);
  return archive;
}

export { crc32, LOCAL_HEADER_BYTES, storedZip, textEntry };
export type { ZipEntry };
