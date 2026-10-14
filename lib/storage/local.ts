import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StorageProvider } from './s3';

export function getLocalUploadPath(key: string): string {
  const root = path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || path.join(process.cwd(), 'private-uploads'));
  const publicRoot = path.join(process.cwd(), 'public');
  if (root === publicRoot || root.startsWith(publicRoot + path.sep)) throw new Error('Upload storage must be private.');
  if (!key || key.includes('\\') || key.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid storage key.');
  const resolved = path.resolve(/* turbopackIgnore: true */ root, key);
  if (!resolved.startsWith(root + path.sep)) throw new Error('Invalid storage key.');
  return resolved;
}
export const localStorage: StorageProvider = {
  async save(key, file) {
    const target = getLocalUploadPath(key);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(target, buffer, { mode: 0o600, flag: 'wx' });
    return { url: '', size: buffer.length };
  },
  async getSignedUrl() { throw new Error('Local files must be served by the authenticated upload route.'); },
  async read(key) { return fs.readFile(/* turbopackIgnore: true */ getLocalUploadPath(key)); },
  async delete(key) {
    try { await fs.unlink(getLocalUploadPath(key)); }
    catch(error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  },
};
export async function ensureUploadDir() { await fs.mkdir(path.dirname(getLocalUploadPath('placeholder')), { recursive: true, mode: 0o700 }); }
