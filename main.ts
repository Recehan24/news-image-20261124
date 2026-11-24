// news-image-20261124 entry (Node 22, standard library only): the program copies
// the entry image beside this file to /output/entry.png. The image sums up the
// world news of Tuesday 24 November 2026: the ICJ's historic genocide verdict
// against Myanmar over the Rohingya, NATO vowing to defend space as Russia is
// reported to be preparing a nuclear-armed satellite, Jensen Huang reinstated
// as Nvidia CEO with the Nasdaq surging 6.5%, Ukraine sinking a Russian
// warship off Libya, the capture of El Chapo Isidro in Mexico, the factory
// fire in Indonesia that killed 26, and the M5.6 Nepal earthquake.
// Second edition of the artwork: a bolder front page — an oversized masthead,
// one dominant hero panel for the ICJ verdict, and far larger headline type in
// every panel, so the whole page stays legible at thumbnail size.
// The gate takes a whole PNG or JPEG of at most 1 MiB and 1024 by 1024 pixels,
// so before copying, this program validates the image's own header and size and
// refuses to emit an out-of-spec file instead of silently altering it.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1024;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

// Read width/height from the image header without decoding the pixels.
function dimensions(buf) {
  // PNG: 8-byte signature, then IHDR chunk (width/height as big-endian uint32
  // at offsets 16 and 20).
  if (buf.length >= 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    if (buf.toString('ascii', 12, 16) !== 'IHDR') fail('PNG file has no IHDR chunk');
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
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
        return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
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

const source = fileURLToPath(new URL('./entry.png', import.meta.url));
const size = statSync(source).size;
if (size > MAX_BYTES) {
  fail(`entry.png is ${size} bytes, over the 1 MiB limit`);
}
const { width, height } = dimensions(readFileSync(source));
if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
  fail(`entry.png is ${width}x${height}, over the 1024x1024 limit`);
}
// The artwork is composed as a square front page; a non-square file means the
// wrong asset was bundled, so refuse it rather than emit a cropped surprise.
if (width !== height) {
  fail(`entry.png is ${width}x${height}, not the square front page expected`);
}

const dest = join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png');
copyFileSync(source, dest);
console.log(`wrote ${dest} (${width}x${height}, ${size} bytes)`);
