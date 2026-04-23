import * as fs from 'fs';
import { PNG } from 'pngjs';

/** Flat #b4b4b4 for opaque / antialiased logo pixels (poster spec). */
const LOGO_R = 0xb4;
const LOGO_G = 0xb4;
const LOGO_B = 0xb4;

/**
 * Reads a PNG logo and returns a new PNG buffer with RGB set to #b4b4b4
 * while preserving alpha. Non-PNG files return null (caller uses original).
 */
export function tintLogoToMamaGrayPng(logoPath: string): Buffer | null {
  if (!fs.existsSync(logoPath)) return null;
  let buf: Buffer;
  try {
    buf = fs.readFileSync(logoPath);
  } catch {
    return null;
  }
  if (buf.length < 8 || buf.toString('ascii', 1, 4) !== 'PNG') {
    return null;
  }
  try {
    const png = PNG.sync.read(buf);
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const i = (png.width * y + x) << 2;
        if (png.data[i + 3] === 0) continue;
        png.data[i] = LOGO_R;
        png.data[i + 1] = LOGO_G;
        png.data[i + 2] = LOGO_B;
      }
    }
    return PNG.sync.write(png);
  } catch {
    return null;
  }
}
