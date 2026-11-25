// news-image-20261124 entry, v2-fixed (Node 22, standard library only).
//
// The program emits the entry image beside this file to /output/entry.png.
// The artwork is a newspaper front page summing up the world news of
// Tuesday 24 November 2026: the ICJ's historic genocide verdict against
// Myanmar over the Rohingya (hero panel), NATO vowing to defend space as
// Russia is reported to be preparing a nuclear-armed satellite, Jensen Huang
// reinstated as Nvidia CEO with the Nasdaq surging 6.5%, Ukraine sinking a
// Russian warship off Libya, the capture of El Chapo Isidro in Mexico, the
// factory fire in Indonesia that killed 26, and the M5.6 Nepal earthquake.
// The image is drawn programmatically by gen-news-20261124-v2.py in this
// repository, so every glyph is crisp and spelled exactly as written.
//
// The gate takes a whole PNG or JPEG of at most 1 MiB and 1024 by 1024
// pixels. Before copying, this program validates the image's own header and
// size, refuses an out-of-spec file instead of silently altering it, and
// after copying verifies the output byte-for-byte against the source, so a
// truncated or swapped file can never slip through.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1024;
const EDITION = 'v2-fixed';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// Read width/height from the image header without decoding the pixels.
function dimensions(buf) {
  // PNG: 8-byte signature, then the IHDR chunk (width/height as big-endian
  // uint32 at offsets 16 and 20).
  if (buf.length >= 24 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    if (buf.toString('ascii', 12, 16) !== 'IHDR') fail('PNG file has no IHDR chunk');
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), kind: 'PNG' };
  }
  // JPEG: SOI marker, then walk segments until a start-of-frame (SOF0/SOF2)
  // marker, which carries height then width as big-endian uint16.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 <= buf.length) {
      if (buf[offset] !== 0xff) fail('JPEG file has a malformed segment');
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5), kind: 'JPEG' };
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2; // standalone marker, no length field
      } else {
        offset += 2 + length;
      }
    }
    fail('JPEG file has no start-of-frame marker');
  }
  fail('entry.png is neither a PNG nor a JPEG');
}

const sourcePath = fileURLToPath(new URL('./entry.png', import.meta.url));
const source = readFileSync(sourcePath);
if (source.length === 0) fail('entry.png is empty');
if (source.length > MAX_BYTES) {
  fail(`entry.png is ${source.length} bytes, over the 1 MiB limit`);
}
const { width, height, kind } = dimensions(source);
// Revision 2 (25 Nov 2026): also reject zero or negative dimensions, which
// a truncated header could otherwise smuggle past the size checks.
if (width <= 0 || height <= 0) {
  fail(`entry.png has an impossible size ${width}x${height}`);
}
if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
  fail(`entry.png is ${width}x${height}, over the 1024x1024 limit`);
}
// The artwork is composed as a square front page; a non-square file means the
// wrong asset was bundled, so refuse it rather than emit a cropped surprise.
if (width !== height) {
  fail(`entry.png is ${width}x${height}, not the square front page expected`);
}

const dest = join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png');
copyFileSync(sourcePath, dest);
// Integrity check: the emitted file must be byte-identical to the source.
const emitted = readFileSync(dest);
if (sha256(emitted) !== sha256(source)) {
  fail('output differs from entry.png after copy; refusing to emit a corrupt file');
}
console.log(`${EDITION}: wrote ${dest} (${kind} ${width}x${height}, ${source.length} bytes, sha256 ${sha256(source).slice(0, 16)}…)`);
