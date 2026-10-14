import { requireUser } from '@/lib/auth';
import { readOrder } from '@/lib/orders';
import { db } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage/index';
import { sameOrigin } from '@/lib/security';
import { DomainError } from '@/lib/domain';
import { isDemoMode } from '@/lib/demo/mode';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isDemoMode()) return new Response('Not found', { status: 404 });
  try {
    const user = await requireUser();
    const { id } = await params;

    const file = await db.upload.findUnique({ where: { id } });
    if (!file) {
      return new Response('Not found', { status: 404 });
    }

    await readOrder(user, file.orderId);

    const storage = getStorageProvider();
    if(storage.read){const bytes=await storage.read(file.storageKey);return new Response(new Uint8Array(bytes),{headers:{'Content-Type':file.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});}
    const signedUrl = await storage.getSignedUrl(file.storageKey, 300); // 5 minutes

    // Redirect to signed URL
    return new Response(null,{status:302,headers:{Location:signedUrl,'Cache-Control':'private, no-store'}});
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isDemoMode()) return Response.json({ error: 'Photo changes are disabled in the public demo.' }, { status: 403 });
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { id } = await params;

    const file = await db.upload.findUnique({ where: { id } });
    if (!file) {
      return new Response('Not found', { status: 404 });
    }

    const order=await readOrder(user, file.orderId);if(user.role!=='ADMIN'&&order.userId!==user.id)throw new DomainError('Only the customer or administrator may delete photos.',403);

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