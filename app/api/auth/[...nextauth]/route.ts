import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/security';
const handler=NextAuth(authOptions);
export {handler as GET};
export async function POST(request:Request,context:{params:Promise<{nextauth:string[]}>}){try{await rateLimit('auth-global',100);return await handler(request,context);}catch{return Response.json({error:'Sign-in is temporarily unavailable. Please retry.'},{status:503});}}
