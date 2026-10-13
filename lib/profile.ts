import { db, serial } from './db';
import { type Actor, DomainError } from './domain';
import { profileSchema } from './validation';

// Customers may edit their own contact details and service address. Identity
// (verified email), role and account status are never editable here.
export async function updateProfile(actor: Actor, input: unknown) {
  const v = profileSchema.parse(input);
  return serial(async (tx) => {
    const phone = v.phone ? v.phone.trim() : null;
    if (phone) {
      const clash = await tx.user.findFirst({ where: { phone, NOT: { id: actor.id } }, select: { id: true } });
      if (clash) throw new DomainError('That mobile number is already linked to another account.', 409);
    }

    await tx.user.update({ where: { id: actor.id }, data: { name: v.name, phone: phone ?? undefined } });

    const profile = await tx.customerProfile.upsert({ where: { userId: actor.id }, update: {}, create: { userId: actor.id } });
    if (v.locality && v.fullAddress) {
      const existing = await tx.address.findFirst({ where: { profileId: profile.id }, orderBy: { id: 'desc' }, select: { id: true } });
      const data = {
        locality: v.locality,
        fullAddress: v.fullAddress,
        landmark: v.landmark || null,
        accessContact: v.accessContact || v.name,
        floorLift: v.floorLift || 'Not specified',
        utilities: v.utilities || 'Not specified',
      };
      if (existing) await tx.address.update({ where: { id: existing.id }, data });
      else await tx.address.create({ data: { profileId: profile.id, ...data } });
    }

    await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PROFILE_UPDATED', entityId: actor.id, metadata: {} } });
    return { id: actor.id };
  });
}

export async function readProfile(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, phone: true, role: true } });
  const profile = await db.customerProfile.findUnique({ where: { userId }, include: { addresses: { orderBy: { id: 'desc' }, take: 1 } } });
  return { user, address: profile?.addresses[0] ?? null };
}
