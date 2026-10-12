import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { sameOrigin, rateLimit } from '@/lib/security';
import { DomainError } from '@/lib/domain';
import { createOrder, prepareQuote, approveQuote, assignStaff, updateJob, recordWeight, supportRequest, cancelOrder, recordPayment, recordRefund, handover } from '@/lib/orders';
import { configure } from '@/lib/admin';
export async function POST(request:Request){try{sameOrigin(request);const actor=await requireUser();await rateLimit(`mutation:${actor.id}`);if(Number(request.headers.get('content-length')??0)>100000)throw new DomainError('Request too large.',413);const body=z.object({action:z.enum(['book','quote','approve','assign','status','weight','support','cancel','payment','refund','handover','configure']),data:z.unknown()}).parse(await request.json());
 let result:unknown;switch(body.action){
 case 'book':result=await createOrder(actor,body.data);break;
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
 }return Response.json({ok:true,result});
 }catch(e){if(e instanceof z.ZodError)return Response.json({error:e.issues.map(i=>i.message).join(' ')},{status:400});if(e instanceof DomainError)return Response.json({error:e.message},{status:e.status});return Response.json({error:'Unable to save. Check database configuration or refresh and retry; the operation may have been interrupted.'},{status:500});}}
