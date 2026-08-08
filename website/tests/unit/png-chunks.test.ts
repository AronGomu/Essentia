import { describe, expect, it } from 'vitest';
import {
  C2PA_CHUNK,
  hasC2paManifest,
  pngChunkTypes,
} from '../../shared/png-chunks.mjs';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer = Buffer.alloc(0)): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  // The CRC is never verified by the reader, so any four bytes stand in.
  return Buffer.concat([
    length,
    Buffer.from(type, 'latin1'),
    data,
    Buffer.alloc(4),
  ]);
}

function png(...chunks: Buffer[]): Buffer {
  return Buffer.concat([SIGNATURE, ...chunks, chunk('IEND')]);
}

const IHDR = chunk('IHDR', Buffer.alloc(13));

describe('pngChunkTypes', () => {
  it('lists the chunk types in stream order', () => {
    expect(pngChunkTypes(png(IHDR, chunk('IDAT', Buffer.alloc(8))))).toEqual([
      'IHDR',
      'IDAT',
      'IEND',
    ]);
  });

  it('returns nothing for a file that is not a PNG', () => {
    expect(pngChunkTypes(Buffer.from('GIF89a and then some'))).toEqual([]);
    expect(pngChunkTypes(Buffer.alloc(0))).toEqual([]);
  });

  it('stops on a truncated stream instead of running away', () => {
    const truncated = Buffer.concat([
      SIGNATURE,
      chunk('IHDR', Buffer.alloc(13)),
      Buffer.from([0x00, 0x00, 0xff, 0xff]),
      Buffer.from('IDAT', 'latin1'),
    ]);
    expect(pngChunkTypes(truncated)).toEqual(['IHDR', 'IDAT']);
  });
});

describe('hasC2paManifest', () => {
  it('finds the caBX manifest chunk', () => {
    const manifest = chunk(C2PA_CHUNK, Buffer.from('jumbf c2pa manifest'));
    expect(hasC2paManifest(png(IHDR, manifest, chunk('IDAT')))).toBe(true);
  });

  it('passes a PNG with no provenance chunk', () => {
    expect(hasC2paManifest(png(IHDR, chunk('IDAT', Buffer.alloc(16))))).toBe(
      false,
    );
  });

  it('does not fire on the literal bytes inside pixel data', () => {
    // Compressed pixel data is arbitrary bytes; a substring search over the
    // whole file would fail the build on an innocent image.
    const data = Buffer.concat([
      Buffer.alloc(4),
      Buffer.from(C2PA_CHUNK, 'latin1'),
      Buffer.alloc(4),
    ]);
    expect(hasC2paManifest(png(IHDR, chunk('IDAT', data)))).toBe(false);
  });

  it('ignores a non-PNG that merely contains the string', () => {
    expect(hasC2paManifest(Buffer.from('not a png but caBX appears'))).toBe(
      false,
    );
  });
});
