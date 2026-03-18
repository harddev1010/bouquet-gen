import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get __dirname that works in both ESM (import.meta.url) and CJS bundles.
 * When bundled to CJS, import.meta.url is undefined, so we fall back to process.argv[1].
 */
export function getDirname(importMetaUrl: string | undefined): string {
  if (importMetaUrl) {
    return path.dirname(fileURLToPath(importMetaUrl));
  }
  // Bundled CJS: use the entry script path (e.g. dist/index.cjs)
  const entry = process.argv[1] || '.';
  return path.dirname(path.resolve(process.cwd(), entry));
}
