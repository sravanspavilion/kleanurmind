import { requireUser } from '@/lib/auth';
import { readOrder } from '@/lib/orders';
import { db } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';
import { DomainError } from '@/lib/domain';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const file = await db.upload.findUnique({ where: { id } });
    if (!file) {
      return new Response('Not found', { status: 404 });
    }

    await readOrder(user, file.orderId);

    const storage = getStorageProvider();
    const signedUrl = await storage.getSignedUrl(file.storageKey, 300); // 5 minutes

    // Redirect to signed URL
    return Response.redirect(signedUrl, 302);
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const file = await db.upload.findUnique({ where: { id } });
    if (!file) {
      return new Response('Not found', { status: 404 });
    }

    await readOrder(user, file.orderId);

    const storage = getStorageProvider();
    await storage.delete(file.storageKey);

    await db.upload.delete({ where: { id } });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof DomainError ? e.message : 'Failed to delete photo' },
      { status: e instanceof DomainError ? e.status : 500 }
    );
  }
}