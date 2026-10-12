import { createHash } from 'node:crypto';
import { db } from './db';
import { DomainError } from './domain';
export async function rateLimit(key:string,limit=30){const slot=Math.floor(Date.now()/60000);const hash=createHash('sha256').update(`${key}:${slot}`).digest('hex');const row=await db.rateLimit.upsert({where:{key:hash},create:{key:hash,count:1,expiresAt:new Date((slot+2)*60000)},update:{count:{increment:1}}});if(row.count>limit)throw new DomainError('Too many requests. Try again in a minute.',429);}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');const expected=new URL(process.env.NEXTAUTH_URL??request.url).origin;if(origin!==expected)throw new DomainError('Invalid request origin.',403);}
