import { pageUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { dateTime, human } from '@/lib/domain';
import { StaffJobControls } from '@/components/staff-controls';
export const dynamic='force-dynamic';
const STAFF_ROLES=['CLEANER','LAUNDRY','DELIVERY','PARTNER'];
export default async function Page(){const user=await pageUser(STAFF_ROLES);const orders=await db.order.findMany({where:{status:{notIn:['COMPLETED','CANCELLED']},appointments:{some:{assignments:{some:{staffId:user.id,active:true}}}}},include:{address:true,cleaning:true,laundry:{include:{bags:true}},user:{select:{phone:true}},appointments:{include:{assignments:{where:{active:true},include:{staff:{select:{id:true,name:true}}}}}}},orderBy:{updatedAt:'desc'},take:50});
 return <div className="container page"><div className="row"><div><div className="eyebrow">Staff workspace / Kozhikode</div><h1>My assigned jobs</h1><p className="muted">Only jobs assigned to you appear here, with the contact details you need to complete them.</p></div><span className="badge">{user.name} · {human(user.role)}</span></div>
 {orders.length===0&&<div className="card"><h2>No jobs assigned right now</h2><p className="muted">When operations assign you to a cleaning, pickup or return it will appear here. Check back later or ask the dispatch team.</p></div>}
 <div className="stack">{orders.map(order=>{const mine=(kind:string)=>order.appointments.some(a=>a.kind===kind&&a.assignments.some(s=>s.staffId===user.id));const cleaningAssigned=mine('CLEANING');const pickupAssigned=mine('PICKUP');const returnAssigned=mine('RETURN');const allowedTracks:Array<'cleaning'|'laundry'>=[...(cleaningAssigned?['cleaning' as const]:[]),...(pickupAssigned||returnAssigned?['laundry' as const]:[])];const appointments=order.appointments.filter(a=>a.assignments.some(s=>s.staffId===user.id));return <div className="card" key={order.id}>
  <div className="row"><h2>{order.customerName} · {order.address.locality}</h2><span className="badge yellow">{human(order.status)}</span></div>
  <p className="muted">{order.address.fullAddress}{order.address.landmark?` · ${order.address.landmark}`:''}</p>
  <p><strong>Access:</strong> {order.address.accessContact}{order.user.phone?<> · <strong>Mobile:</strong> {order.user.phone}</>:null}<br/><strong>Floor / lift:</strong> {order.address.floorLift}<br/><strong>Utilities:</strong> {order.address.utilities}</p>
  <div className="grid2">{appointments.map(a=><div className="soft" key={a.id}><strong>{human(a.kind)}</strong><p>{dateTime(a.confirmed?(a.start??a.requestedStart):a.requestedStart)}<br/><small>{a.confirmed?'Confirmed appointment':'Requested time — not yet confirmed'}</small></p></div>)}</div>
  <StaffJobControls orderId={order.id} cleaningStatus={order.cleaning?.status} laundryStatus={order.laundry?.status} bags={order.laundry?.bags.map(b=>({id:b.id,label:b.label}))??[]} allowedTracks={allowedTracks} canPickup={pickupAssigned} canReturn={returnAssigned}/>
 </div>;})}</div>
 <p className="muted">Need a change to a job? Ask dispatch from the operations team.</p>
 </div>;}
