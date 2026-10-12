'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function Navigation(){const path=usePathname();return <nav className="nav" aria-label="Main navigation">{[['/','Home'],['/book','Book a Service'],['/bookings','My Bookings'],['/admin','Admin']].map(([href,label])=><Link key={href} href={href} className={path===href?'active':''} aria-current={path===href?'page':undefined}>{label}</Link>)}</nav>;}
