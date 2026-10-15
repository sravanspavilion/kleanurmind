import { DemoRequestList } from '@/components/demo-requests';
import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { getDashboardOrders } from '@/lib/data';
import { isDemoMode } from '@/lib/demo/mode';
import { dateTime, human, money } from '@/lib/domain';

export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const user = await pageUser(undefined, '/dashboard');
  const orders = await getDashboardOrders(user.id);
  const pending = orders.filter(order => order.quotes[0]?.status === 'SENT');
  const upcoming = orders.filter(order => !['CANCELLED', 'COMPLETED'].includes(order.status));
  return <div className="container page stack">
    <div className="row"><div><div className="eyebrow">Your customer dashboard</div><h1>Hello, {user.name?.split(' ')[0] || 'there'}!</h1><p>Manage your home cleaning and laundry care.</p></div><Link className="btn" href="/book">Book a service</Link></div>
    <div className="actions"><Link className="btn secondary" href="/bookings">My bookings &amp; history</Link><Link className="btn ghost" href="/account">Profile &amp; service address</Link>{user.role==='ADMIN'&&<Link className="btn ghost" href="/admin">Admin workspace</Link>}{!['CUSTOMER','ADMIN'].includes(user.role)&&<Link className="btn ghost" href="/staff">Assigned jobs</Link>}</div>
    {isDemoMode() && <DemoRequestList/>}
    {!orders.length && <div className="card empty"><h2>A little care starts here</h2><p>Your bookings, quotes and appointments will appear here.</p><Link className="btn" href="/book">Book your first service</Link></div>}
    {pending.length>0&&<section className="card"><h2>Quotes awaiting your approval</h2>{pending.map(order=><div className="row" key={order.id}><p>Quote version {order.quotes[0].version} · {money(order.quotes[0].totalPaise)}</p><Link className="btn secondary" href={`/bookings/${order.id}`}>Review scope and quote</Link></div>)}</section>}
    {upcoming.length>0&&<section className="stack"><h2>Upcoming care</h2>{upcoming.map(order=><article className="card" key={order.id}><div className="row"><h3>{order.cleaning&&order.laundry?'Cleaning + laundry':order.cleaning?'Home cleaning':'Laundry pickup & return'}</h3><span className="badge">{human(order.status)}</span></div>{order.appointments.map(appointment=><p key={appointment.id}><strong>{human(appointment.kind)}</strong> · {appointment.confirmed?'Confirmed':'Requested'}<br/>{dateTime(appointment.confirmed&&appointment.start?appointment.start:appointment.requestedStart)}</p>)}<Link className="btn secondary" href={`/bookings/${order.id}`}>Details, progress &amp; support</Link></article>)}</section>}
  </div>;
}
