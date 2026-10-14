import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/security';
import { isDemoMode } from '@/lib/demo/mode';
const handler=NextAuth(authOptions);
function blocked(){return Response.json({error:'Authentication is disabled in the public demo.'},{status:403});}
export async function GET(request:Request,context:{params:Promise<{nextauth:string[]}>}){if(isDemoMode())return blocked();return handler(request,context);}
export async function POST(request:Request,context:{params:Promise<{nextauth:string[]}>}){if(isDemoMode())return blocked();try{await rateLimit('auth-global',100);return await handler(request,context);}catch{return Response.json({error:'Sign-in is temporarily unavailable. Please retry.'},{status:503});}}
