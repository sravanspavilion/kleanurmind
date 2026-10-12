import { currentUser,demoEnabled } from '@/lib/auth';
import { SignIn } from '@/components/sign-in';
export const dynamic='force-dynamic';
export default async function Page(){let user=null;try{user=await currentUser();}catch{}return <div className="container page"><div className="card" style={{maxWidth:560,margin:'auto'}}><div className="eyebrow">Your Klean Ur Mind account</div><h1>{user?'Account':'Welcome back'}</h1><p className="muted">Sign in with a verified Google email to request services and manage your bookings.</p>{user&&<p>Signed in as {user.name} · {user.role.toLowerCase()}</p>}<SignIn signedIn={!!user} demo={demoEnabled} google={!!process.env.GOOGLE_CLIENT_ID&&!!process.env.GOOGLE_CLIENT_SECRET}/></div></div>;}
