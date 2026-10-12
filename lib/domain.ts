export class DomainError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type Actor = { id: string; role: string; providerId?: string | null };
export const cleaningSteps = ['REQUESTED','CONFIRMED','ASSIGNED','ON_THE_WAY','IN_PROGRESS','COMPLETED'] as const;
export const laundrySteps = ['REQUESTED','PICKUP_SCHEDULED','COLLECTED','AWAITING_PRICE_APPROVAL','PROCESSING','QUALITY_CHECKED','OUT_FOR_DELIVERY','DELIVERED'] as const;
export function transition(track: 'cleaning'|'laundry', from: string, to: string) {
 const steps: readonly string[] = track === 'cleaning' ? cleaningSteps : laundrySteps;
 const terminal = ['COMPLETED','DELIVERED','CANCELLED'];
 if (terminal.includes(from)) throw new DomainError('This job is already closed.');
 const next = steps[steps.indexOf(from)+1];
 if (to !== next && to !== 'ISSUE' && to !== 'CANCELLED') throw new DomainError(`Cannot move from ${from} to ${to}.`);
 if (from === 'ISSUE' && to !== 'CANCELLED') throw new DomainError('Resolve the issue with an administrator before continuing.');
}
export function orderFinished(cleaning?: string|null, laundry?: string|null) { return !!(cleaning || laundry) && (!cleaning || cleaning === 'COMPLETED') && (!laundry || laundry === 'DELIVERED'); }
export function canRead(actor: Actor, ownerId: string, assignedIds: string[] = []) { return actor.role === 'ADMIN' || (actor.role === 'CUSTOMER' && actor.id === ownerId) || assignedIds.includes(actor.id); }
export function requireAdmin(actor: Actor) { if(actor.role !== 'ADMIN') throw new DomainError('Administrator access required.',403); }
export function calculateQuote(items: {quantity:number;unitPaise:number}[], deliveryPaise:number, taxBps:number|null) {
 if (!items.length || items.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<1||!Number.isSafeInteger(i.unitPaise)||i.unitPaise<0) || !Number.isSafeInteger(deliveryPaise)||deliveryPaise<0 || (taxBps!==null && (!Number.isInteger(taxBps)||taxBps<0||taxBps>10000))) throw new DomainError('Invalid quote amounts.');
 const subtotal = items.reduce((sum,i)=>sum+i.quantity*i.unitPaise,deliveryPaise);
 const taxPaise = taxBps === null ? 0 : Math.round(subtotal*taxBps/10000);
 const totalPaise = subtotal+taxPaise;
 if(!Number.isSafeInteger(totalPaise)||totalPaise>2_000_000_000) throw new DomainError('Quote exceeds supported amount.');
 return {subtotal,taxPaise,totalPaise};
}
export function refundAvailable(paid:number, refunds:number[], amount:number) { if(!Number.isSafeInteger(amount)||amount<=0||amount>paid-refunds.reduce((a,b)=>a+b,0)) throw new DomainError('Refund exceeds the remaining paid amount.'); return amount; }
export function exactQuote(latest:{id:string;status:string},id:string) { if(latest.id!==id||latest.status!=='SENT') throw new DomainError('This quote has changed. Refresh and review the latest version.',409); }
export const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(paise/100);
export const human=(value:string)=>value.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export const dateTime=(date:Date|string)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(date));
export function localToISO(value:string) { return new Date(`${value}:00+05:30`).toISOString(); }
