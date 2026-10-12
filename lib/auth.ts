import { getServerSession, type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { timingSafeEqual } from 'node:crypto';
import { redirect } from 'next/navigation';
import { db } from './db';
import { DomainError } from './domain';
export const demoEnabled=process.env.NODE_ENV==='development'&&process.env.ENABLE_DEMO_AUTH==='true'&&!!process.env.DEMO_AUTH_KEY;
export const authOptions:NextAuthOptions={adapter:PrismaAdapter(db),secret:process.env.NEXTAUTH_SECRET,session:{strategy:'jwt',maxAge:8*3600},pages:{signIn:'/sign-in'},providers:[
 ...(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET?[GoogleProvider({clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET})]:[]),
 ...(demoEnabled?[CredentialsProvider({name:'Local development',credentials:{email:{label:'Fictional email',type:'email'},key:{label:'Development key',type:'password'}},async authorize(credentials){
 const key=credentials?.key??'';const expected=process.env.DEMO_AUTH_KEY??'';
 if(!demoEnabled||Buffer.byteLength(key)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(key),Buffer.from(expected)))return null;
 const user=await db.user.findUnique({where:{email:credentials?.email??''}});
 return user?.active&&user.email?.endsWith('@example.test')?user:null;
 }})]:[])
 ],callbacks:{async signIn({account,profile}){if(account?.provider==='google')return !!(profile as {email_verified?:boolean})?.email_verified;return demoEnabled;},async jwt({token,user}){if(user)token.sub=user.id;return token;},async session({session,token}){if(session.user)Object.assign(session.user,{id:token.sub});return session;}}};
export async function currentUser(){const session=await getServerSession(authOptions);const id=(session?.user as {id?:string}|undefined)?.id;if(!id)return null;const user=await db.user.findUnique({where:{id}});return user?.active?user:null;}
export async function requireUser(){const user=await currentUser();if(!user)throw new DomainError('Sign in to continue.',401);return user;}
export async function pageUser(roles?:string[]){const user=await currentUser();if(!user)redirect('/sign-in');if(roles&&!roles.includes(user.role))redirect('/bookings');return user;}
