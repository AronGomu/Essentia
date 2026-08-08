/**
 * Minimal PNG chunk reader, for provenance metadata that image libraries do
 * not surface.
 *
 * `sharp().metadata()` reports exif/icc/iptc/xmp but knows nothing about C2PA,
 * which PNG carries in a `caBX` chunk. A C2PA manifest embeds the signing
 * account and generation timestamps, so a file carrying one must never ship in
 * `dist/`. The stream is parsed chunk by chunk rather than searched for the
 * literal bytes: `caBX` occurs in compressed pixel data often enough that a
 * substring match would fail the build on innocent images.
 */

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** JUMBF box holding a C2PA manifest store, per the C2PA PNG binding. */
export const C2PA_CHUNK = 'caBX';

/**
 * @param {Buffer} buffer file contents
 * @returns {string[]} chunk types in stream order, [] when this is not a PNG
 */
export function pngChunkTypes(buffer) {
  if (buffer.length < PNG_SIGNATURE.length) return [];
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE))
    return [];

  const types = [];
  // 8-byte signature, then repeating: length (4) + type (4) + data + CRC (4).
  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    types.push(type);
    if (type === 'IEND') break;
    const next = offset + 12 + length;
    // A truncated or malformed stream must not loop forever or read past the
    // end; stop and report what was readable.
    if (next <= offset || next > buffer.length) break;
    offset = next;
  }
  return types;
}

/**
 * @param {Buffer} buffer file contents
 * @returns {boolean} true when the PNG carries an embedded C2PA manifest
 */
export function hasC2paManifest(buffer) {
  return pngChunkTypes(buffer).includes(C2PA_CHUNK);
}
