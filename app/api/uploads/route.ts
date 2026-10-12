import { requireUser } from '@/lib/auth';
import { readOrder } from '@/lib/orders';
import { db } from '@/lib/db';
import { getStorageProvider, generateStorageKey, optimizeImage, isS3Configured } from '@/lib/storage';
import { rateLimit, sameOrigin } from '@/lib/security';
import { DomainError } from '@/lib/domain';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_UPLOADS_PER_ORDER = 12;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    await rateLimit(`upload:${user.id}`, 10);

    if (Number(request.headers.get('content-length') ?? 0) > 6 * 1024 * 1024) {
      throw new DomainError('Maximum photo size is 5 MB.');
    }

    const form = await request.formData();
    const orderId = String(form.get('orderId'));
    const order = await readOrder(user, orderId);
    const file = form.get('file');

    if (!(file instanceof File) || file.size === 0 || file.size > MAX_SIZE) {
      throw new DomainError('Choose a photo up to 5 MB.');
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      throw new DomainError('Only JPEG, PNG, and WebP images are allowed.');
    }

    if (order.uploads.length >= MAX_UPLOADS_PER_ORDER) {
      throw new DomainError(`Maximum ${MAX_UPLOADS_PER_ORDER} photos per booking.`);
    }

    // Optimize image if it's an image
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await optimizeImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          format: 'webp',
        });
      } catch {
        // If optimization fails, use original file
      }
    }

    const storage = getStorageProvider();
    const key = generateStorageKey(user.id, order.id, fileToUpload.name);

    // Convert file to buffer
    const arrayBuffer = await fileToUpload.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    await storage.save(key, new File([buffer], fileToUpload.name, { type: fileToUpload.type }));

    // Save to database
    const row = await db.upload.create({
      data: {
        orderId: order.id,
        userId: user.id,
        storageKey: key,
        mime: fileToUpload.type,
        size: buffer.length,
      },
    });

    return Response.json({ id: row.id, key });
  } catch (e) {
    return Response.json(
      { error: e instanceof DomainError ? e.message : 'Photo upload failed. Please retry.' },
      { status: e instanceof DomainError ? e.status : 500 }
    );
  }
}