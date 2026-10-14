import { getServerSession, type NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { safeReturnPath } from './return-path';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { timingSafeEqual } from 'node:crypto';
import { redirect } from 'next/navigation';
import { db } from './db';
import { authenticatePassword } from './password-auth';
import { DomainError } from './domain';
import { isDemoMode } from './demo/mode';
import { demoActorFor } from './demo/actor';
export const demoEnabled=process.env.NODE_ENV==='development'&&process.env.ENABLE_DEMO_AUTH==='true'&&!!process.env.DEMO_AUTH_KEY;
export const googleEnabled=!!process.env.GOOGLE_CLIENT_ID&&!!process.env.GOOGLE_CLIENT_SECRET;
export const emailEnabled=!!process.env.SMTP_HOST&&!!process.env.SMTP_USER&&!!process.env.SMTP_PASS&&!!process.env.EMAIL_FROM;
export const authOptions:NextAuthOptions={adapter:PrismaAdapter(db),secret:process.env.NEXTAUTH_SECRET,session:{strategy:'jwt',maxAge:8*3600},pages:{signIn:'/sign-in'},providers:[
 ...(emailEnabled?[EmailProvider({server:{host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_PORT==='465',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}},from:process.env.EMAIL_FROM,maxAge:15*60})]:[]),
 CredentialsProvider({id:'email-password',name:'Email and password',credentials:{email:{label:'Email',type:'email'},password:{label:'Password',type:'password'}},authorize:authenticatePassword}),
 ...(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET?[GoogleProvider({clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET})]:[]),
 ...(demoEnabled?[CredentialsProvider({name:'Local development',credentials:{email:{label:'Fictional email',type:'email'},key:{label:'Development key',type:'password'}},async authorize(credentials){
 const key=credentials?.key??'';const expected=process.env.DEMO_AUTH_KEY??'';
 if(!demoEnabled||Buffer.byteLength(key)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(key),Buffer.from(expected)))return null;
 const user=await db.user.findUnique({where:{email:credentials?.email??''}});
 return user?.active&&user.email?.endsWith('@example.test')?user:null;
 }})]:[])
 ],callbacks:{async signIn({account,profile,user}){const existing=user.email?await db.user.findUnique({where:{email:user.email},select:{active:true}}):null;if(existing&&!existing.active)return false;if(account?.provider==='google')return !!(profile as {email_verified?:boolean})?.email_verified;return account?.provider==='email'||account?.provider==='email-password'||(account?.provider==='credentials'&&demoEnabled);},async jwt({token,user}){if(user)token.sub=user.id;return token;},async session({session,token}){if(session.user)Object.assign(session.user,{id:token.sub});return session;}},events:{async signIn({user,account,profile}){if(account?.provider==='google'&&(profile as {email_verified?:boolean})?.email_verified)await db.user.update({where:{id:user.id},data:{emailVerified:new Date()}});await db.customerProfile.upsert({where:{userId:user.id},update:{},create:{userId:user.id}});},async createUser({user}){try{await db.customerProfile.upsert({where:{userId:user.id},update:{},create:{userId:user.id}});}catch(error){console.error('[auth] Could not create customer profile',{userId:user.id,error});}}}};
export async function currentUser(){if(isDemoMode())return demoActorFor() as never;const session=await getServerSession(authOptions);const id=(session?.user as {id?:string}|undefined)?.id;if(!id)return null;const user=await db.user.findUnique({where:{id},select:{id:true,name:true,email:true,emailVerified:true,phone:true,image:true,role:true,active:true,providerId:true}});return user?.active?user:null;}
export async function requireUser(){const user=await currentUser();if(!user)throw new DomainError('Sign in to continue.',401);return user;}
export async function pageUser(roles?:string[],returnTo='/dashboard'){if(isDemoMode())return demoActorFor(roles) as never;const user=await currentUser();if(!user)redirect(`/sign-in?callbackUrl=${encodeURIComponent(safeReturnPath(returnTo))}`);if(roles&&!roles.includes(user.role))redirect('/bookings');return user;}
