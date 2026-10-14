import { getSettings } from '@/lib/data';
export const dynamic='force-dynamic';
export default async function Policies(){
  const settings=await getSettings(['cancellationPolicy','reschedulingPolicy','contactDetails']);
  return <div className="container page stack"><h1>Service policies &amp; contact</h1>{[['cancellationPolicy','Cancellation'],['reschedulingPolicy','Rescheduling'],['contactDetails','Contact our team']].map(([key,title])=><section className="card" key={key}><h2>{title}</h2><p style={{whiteSpace:'pre-wrap'}}>{settings.find(s=>s.key===key)?.value||'Please use support within your booking to ask our team. Any applicable terms will be explained before you approve your service.'}</p></section>)}</div>;
}
