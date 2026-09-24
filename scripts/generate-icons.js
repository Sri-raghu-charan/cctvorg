import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createCctvPng(size) {
  const width = size;
  const height = size;
  const buffer = Buffer.alloc(width * height * 4);

  const cx = width / 2;
  const cy = height / 2;
  const r = width / 2 - 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        const factor = (y / height);
        const red = Math.round(2 * (1 - factor) + 15 * factor);
        const green = Math.round(132 * (1 - factor) + 23 * factor);
        const blue = Math.round(199 * (1 - factor) + 42 * factor);

        const inCamBody = Math.abs(dx) <= r * 0.45 && Math.abs(dy) <= r * 0.3;
        const inCamLens = dx >= r * 0.4 && dx <= r * 0.7 && Math.abs(dy) <= r * 0.22 * ((dx - r * 0.4) / (r * 0.3) + 0.6);
        const inLensCircle = Math.sqrt((dx + r * 0.1) * (dx + r * 0.1) + dy * dy) <= r * 0.18;

        if (inCamLens) {
          buffer[idx] = 56;
          buffer[idx + 1] = 189;
          buffer[idx + 2] = 248;
          buffer[idx + 3] = 255;
        } else if (inLensCircle) {
          buffer[idx] = 2;
          buffer[idx + 1] = 132;
          buffer[idx + 2] = 199;
          buffer[idx + 3] = 255;
        } else if (inCamBody) {
          buffer[idx] = 248;
          buffer[idx + 1] = 250;
          buffer[idx + 2] = 252;
          buffer[idx + 3] = 255;
        } else {
          buffer[idx] = red;
          buffer[idx + 1] = green;
          buffer[idx + 2] = blue;
          buffer[idx + 3] = 255;
        }
      } else {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let rawIdx = 0;
  for (let y = 0; y < height; y++) {
    rawData[rawIdx++] = 0;
    for (let x = 0; x < width * 4; x++) {
      rawData[rawIdx++] = buffer[y * width * 4 + x];
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(__dirname, '..', 'extension', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const png = createCctvPng(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
});
