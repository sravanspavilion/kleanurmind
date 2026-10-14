import { timingSafeEqual } from 'node:crypto';
import { processOutbox } from '@/lib/outbox';
import { isDemoMode } from '@/lib/demo/mode';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){
  if(isDemoMode())return Response.json({ok:true,demo:true});
  const expected=process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:'';
  const supplied=request.headers.get('authorization')||'';
  if(!expected||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return Response.json({error:'Unauthorized'},{status:401});
  await processOutbox(5);
  return Response.json({ok:true});
}
