export type { StorageProvider } from './s3';
export { s3Storage } from './s3';
export { localStorage, getLocalUploadPath, ensureUploadDir } from './local';
export { generateStorageKey, optimizeImage, isS3Configured } from './s3';

import type { StorageProvider } from './s3';
import { s3Storage } from './s3';
import { localStorage } from './local';
import { isS3Configured } from './s3';

let storageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageProvider) return storageProvider;
  
  if (isS3Configured()) {
    storageProvider = s3Storage;
  } else {
    if(process.env.VERCEL)throw new Error('Private object storage is required on Vercel.');
    storageProvider = localStorage;
  }
  
  return storageProvider;
}

export function setStorageProvider(provider: StorageProvider): void {
  storageProvider = provider;
}