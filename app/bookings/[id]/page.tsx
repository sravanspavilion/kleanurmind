import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageUser } from '@/lib/auth';
import { readOrder } from '@/lib/orders';
import { DomainError } from '@/lib/domain';
import { CustomerOrder } from '@/components/order-view';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{upload?:string}>}){const user=await pageUser(['CUSTOMER','ADMIN']);let order;try{order=await readOrder(user,(await params).id);}catch(e){if(e instanceof DomainError&&e.status===404)notFound();throw e;}return <div className="container page"><p><Link href="/bookings">← My Bookings</Link></p><div className="page-title"><div className="eyebrow">Booking details</div><h1>Your Care, Step by Step</h1><small>Reference {order.id}</small></div>{(await searchParams).upload&&<p className="notice">Your booking was created, but a photo upload failed. Retry in Private photos below.</p>}<CustomerOrder order={order}/></div>;}
