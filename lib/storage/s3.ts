import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import sharp, { ResizeOptions } from 'sharp';

export interface StorageProvider {
  read?(key: string): Promise<Buffer>;
  save(key: string, file: File): Promise<{ url: string; size: number }>;
  getSignedUrl(key: string, expirySec: number): Promise<string>;
  delete(key: string): Promise<void>;
}

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || 'us-east-1';

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    return null;
  }

  return { endpoint, accessKey, secretKey, bucket, region };
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getS3Config();
    if (!config) {
      throw new Error('S3 not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET.');
    }
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }
  return s3Client;
}

export const s3Storage: StorageProvider = {
  async save(key, file) {
    const config = getS3Config();
    if (!config) {
      throw new Error('S3 not configured');
    }

    const client = getS3Client();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    return { url: `${config.endpoint}/${config.bucket}/${key}`, size: buffer.length };
  },

  async getSignedUrl(key, expirySec) {
    const config = getS3Config();
    if (!config) {
      throw new Error('S3 not configured');
    }

    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    return getSignedUrl(client, command, { expiresIn: expirySec });
  },

  async delete(key) {
    const config = getS3Config();
    if (!config) return;

    const client = getS3Client();
    await client.send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
  },
};

export async function optimizeImage(file: File, options: { maxWidth?: number; maxHeight?: number; quality?: number; format?: 'webp' | 'avif' | 'jpeg' | 'png' } = {}) {
  const { maxWidth = 1920, maxHeight = 1080, quality = 80, format = 'webp' } = options;
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  const resizeOptions: ResizeOptions = {};
  if (metadata.width && metadata.width > maxWidth) {
    resizeOptions.width = maxWidth;
  }
  if (metadata.height && metadata.height > maxHeight) {
    resizeOptions.height = maxHeight;
  }
  if (Object.keys(resizeOptions).length > 0) {
    resizeOptions.fit = 'inside';
    resizeOptions.withoutEnlargement = true;
  }
  
  let pipeline = image;
  if (Object.keys(resizeOptions).length > 0) {
    pipeline = pipeline.resize(resizeOptions);
  }
  
  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality });
      break;
    case 'png':
      pipeline = pipeline.png({ quality });
      break;
  }
  
  const optimizedBuffer = await pipeline.toBuffer();
  return new File([optimizedBuffer], file.name.replace(/\.[^.]+$/, `.${format}`), { type: `image/${format}` });
}

export function generateStorageKey(userId: string, orderId: string, originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const uuid = randomUUID();
  return `uploads/${userId}/${orderId}/${uuid}.${ext}`;
}

export function isS3Configured(): boolean {
  return getS3Config() !== null;
}
