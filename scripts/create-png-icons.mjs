import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateSalonIconPNG(width, height, isMaskable = false) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw pixel data: each row begins with filter type 0x00
  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLen);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = (Math.min(width, height) / 2) * (isMaskable ? 0.95 : 0.88);
  const innerR = outerR * 0.85;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default dark luxury slate background (#0F172A)
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      // Outer gold ring
      if (Math.abs(dist - outerR) < (width > 200 ? 5 : 2.5)) {
        // Gold (#F59E0B)
        r = 245;
        g = 158;
        b = 11;
      } else if (dist < outerR && dist > innerR) {
        // Subtle amber gradient band
        r = 180;
        g = 83;
        b = 9;
      } else if (dist <= innerR) {
        // Center disc
        // Stylized scissor silhouette in center
        const inCenter = dist < innerR * 0.55;
        const onDiag1 = Math.abs(dx - dy) < (width > 200 ? 12 : 6) && dist < innerR * 0.65;
        const onDiag2 = Math.abs(dx + dy) < (width > 200 ? 12 : 6) && dist < innerR * 0.65;
        const centerPin = dist < (width > 200 ? 14 : 7);

        if (centerPin) {
          r = 254;
          g = 243;
          b = 199; // Light gold pin
        } else if (onDiag1 || onDiag2) {
          // Gold blades
          r = 245;
          g = 158;
          b = 11;
        } else if (inCenter && dy > innerR * 0.2) {
          // Scissor loop indicators
          const loopDist1 = Math.sqrt((dx - innerR * 0.25) ** 2 + (dy - innerR * 0.35) ** 2);
          const loopDist2 = Math.sqrt((dx + innerR * 0.25) ** 2 + (dy - innerR * 0.35) ** 2);
          if (loopDist1 < (width > 200 ? 22 : 11) && loopDist1 > (width > 200 ? 12 : 6)) {
            r = 217;
            g = 119;
            b = 6;
          } else if (loopDist2 < (width > 200 ? 22 : 11) && loopDist2 > (width > 200 ? 12 : 6)) {
            r = 217;
            g = 119;
            b = 6;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. 192x192 PNG
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateSalonIconPNG(192, 192, false));
console.log('✓ Generated public/pwa-192x192.png');

// 2. 512x512 PNG
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateSalonIconPNG(512, 512, false));
console.log('✓ Generated public/pwa-512x512.png');

// 3. 512x512 Maskable PNG
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateSalonIconPNG(512, 512, true));
console.log('✓ Generated public/pwa-maskable-512x512.png');

// 4. 180x180 Apple Touch Icon PNG
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateSalonIconPNG(180, 180, false));
console.log('✓ Generated public/apple-touch-icon.png');
