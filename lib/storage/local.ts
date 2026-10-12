import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { StorageProvider } from './s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(__dirname, '../../private-uploads');
}

export const localStorage: StorageProvider = {
  async save(key, file) {
    const uploadDir = getUploadDir();
    const fullPath = path.join(uploadDir, key);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(fullPath, buffer);
    
    return { url: `/api/uploads/${key}`, size: buffer.length };
  },

  async getSignedUrl(key, expirySec) {
    // For local storage, we return a direct URL with a token
    // In production, you'd want to implement proper signed URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const token = Buffer.from(`${key}:${Date.now() + expirySec * 1000}`).toString('base64');
    return `${baseUrl}/api/uploads/${key}?token=${token}`;
  },

  async delete(key) {
    const uploadDir = getUploadDir();
    const fullPath = path.join(uploadDir, key);
    
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  },
};

export function getLocalUploadPath(key: string): string {
  const uploadDir = getUploadDir();
  return path.join(uploadDir, key);
}

export async function ensureUploadDir(): Promise<void> {
  const uploadDir = getUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });
}

export function isLocalStorageConfigured(): boolean {
  return true; // Always available
}