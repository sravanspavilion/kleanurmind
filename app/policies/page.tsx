import { getSettings } from '@/lib/data';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Policies(){
  let settings: Awaited<ReturnType<typeof getSettings>>;
  try {
    settings = await getSettings(['cancellationPolicy','reschedulingPolicy','contactDetails']);
  } catch {
    return <div className="container page stack"><h1>Service policies &amp; contact</h1><p role="status" className="notice">Our service policies and contact details are temporarily unavailable. Please try again later and review the terms before approving a service.</p><Link href="/policies" className="btn secondary">Try again</Link><Link href="/">Back to home</Link></div>;
  }
  return <div className="container page stack"><h1>Service policies &amp; contact</h1>{[['cancellationPolicy','Cancellation'],['reschedulingPolicy','Rescheduling'],['contactDetails','Contact our team']].map(([key,title])=><section className="card" key={key}><h2>{title}</h2><p style={{whiteSpace:'pre-wrap'}}>{settings.find(s=>s.key===key)?.value||'Please use support within your booking to ask our team. Any applicable terms will be explained before you approve your service.'}</p></section>)}</div>;
}
