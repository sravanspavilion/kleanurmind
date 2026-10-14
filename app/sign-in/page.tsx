import { redirect } from 'next/navigation';
import { currentUser, demoEnabled, googleEnabled, emailEnabled } from '@/lib/auth';
import { isDemoMode } from '@/lib/demo/mode';
import { safeReturnPath } from '@/lib/return-path';
import { SignIn } from '@/components/sign-in';
export const dynamic='force-dynamic';
// Only ever return to a path on this site. Never trust an absolute or protocol-relative URL.

export default async function Page({searchParams}:{searchParams:Promise<{callbackUrl?:string;error?:string}>}){if(isDemoMode())redirect('/');const params=await searchParams;let user=null;try{user=await currentUser();}catch(error){console.error('[sign-in] Could not load session',error);}return <div className="container page"><div className="card" style={{maxWidth:560,margin:'auto'}}><div className="eyebrow">Your Klean Ur Mind account</div><h1>{user?'Account':'Welcome back'}</h1><p className="muted">Sign in with your email and password, or create an account to book services and manage your bookings.</p>{user&&<p>Signed in as {user.name} · {user.role.toLowerCase()}</p>}<SignIn signedIn={!!user} demo={demoEnabled} google={googleEnabled} email={emailEnabled} callbackUrl={safeReturnPath(params.callbackUrl)} authError={params.error}/></div></div>;}
