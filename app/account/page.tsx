import { isDemoMode } from '@/lib/demo/mode';
import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { ProfileForm } from '@/components/account-forms';
export const dynamic='force-dynamic';
export default async function Page(){const user=await pageUser(undefined,'/account');const {user:record,address}=await getProfile(user.id);const defaults={name:record?.name??user.name??'',phone:record?.phone??'',locality:address?.locality??'',fullAddress:address?.fullAddress??'',landmark:address?.landmark??'',accessContact:address?.accessContact??'',floorLift:address?.floorLift??'',utilities:address?.utilities??''};return <div className="container page"><div className="row"><div><div className="eyebrow">Your account</div><h1>Hello, {user.name?.trim().split(/\s+/)[0] || 'there'}!</h1><p className="muted">Welcome to your client portal. Manage your bookings and update your profile and service address.</p></div><Link href="/bookings" className="btn secondary">My bookings</Link></div><div className="card" style={{maxWidth:680}}><p className="muted">{isDemoMode()?'Fictional sample profile: ':'Signed in as '}<strong>{record?.email??user.email}</strong> · {user.role.toLowerCase()}</p><ProfileForm defaults={defaults}/></div></div>;}
