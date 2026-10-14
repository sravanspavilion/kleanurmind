import { after } from 'next/server';
import { processOutbox } from '@/lib/outbox';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { sameOrigin, rateLimit } from '@/lib/security';
import { DomainError } from '@/lib/domain';
import { createOrder, prepareQuote, approveQuote, assignStaff, updateJob, recordWeight, supportRequest, cancelOrder, recordPayment, recordRefund, handover } from '@/lib/orders';
import { configure } from '@/lib/admin';
import { updateProfile } from '@/lib/profile';
import { isDemoMode } from '@/lib/demo/mode';
export async function POST(request:Request){if(isDemoMode())return Response.json({error:'This action is disabled in the public demo. Sample interactions stay in your browser only.'},{status:403});try{sameOrigin(request);const actor=await requireUser();await rateLimit(`mutation:${actor.id}`);if(Number(request.headers.get('content-length')??0)>100000)throw new DomainError('Request too large.',413);const body=z.object({action:z.enum(['book','quote','approve','assign','status','weight','support','cancel','payment','refund','handover','configure','profile']),data:z.unknown()}).parse(await request.json());
 let result:unknown;switch(body.action){
 case 'book':{const order=await createOrder(actor,body.data);result=order;after(async()=>{try{await processOutbox(2,order.id);}catch{console.error('[operations] background delivery deferred to retry worker');}});break;}
 case 'quote':result=await prepareQuote(actor,body.data);break;
 case 'approve':{const v=z.object({orderId:z.string(),quoteId:z.string()}).parse(body.data);result=await approveQuote(actor,v.orderId,v.quoteId);break;}
 case 'assign':result=await assignStaff(actor,body.data);break;
 case 'status':result=await updateJob(actor,body.data);break;
 case 'weight':result=await recordWeight(actor,body.data);break;
 case 'support':result=await supportRequest(actor,body.data);break;
 case 'cancel':result=await cancelOrder(actor,z.object({orderId:z.string()}).parse(body.data).orderId);break;
 case 'payment':result=await recordPayment(actor,body.data);break;
 case 'refund':result=await recordRefund(actor,body.data);break;
 case 'handover':result=await handover(actor,body.data);break;
 case 'configure':result=await configure(actor,body.data);break;
 case 'profile':result=await updateProfile(actor,body.data);break;
 }return Response.json({ok:true,result});
 }catch(e){if(e instanceof z.ZodError)return Response.json({error:e.issues.map(i=>i.message).join(' ')},{status:400});if(e instanceof DomainError)return Response.json({error:e.message},{status:e.status});console.error('[operations] request failed',{type:e instanceof Error?e.name:'unknown'});return Response.json({error:'We could not save your request. Your entered details are still available; please retry.'},{status:500});}}
