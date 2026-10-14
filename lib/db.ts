import { PrismaClient, Prisma } from '@prisma/client';
const globalDb=globalThis as unknown as {prisma?:PrismaClient};
// The client is created lazily so demo mode never opens a database connection
// and never requires DATABASE_URL to be configured.
export function getDb():PrismaClient{if(!globalDb.prisma)globalDb.prisma=new PrismaClient();return globalDb.prisma;}
export const db=new Proxy({} as PrismaClient,{get(_target,property){const client=getDb() as unknown as Record<PropertyKey,unknown>;const value=client[property];return typeof value==='function'?value.bind(client):value;}});
export async function serial<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<4;attempt++){
  try{return await db.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});}
  catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2034'&&attempt<3)continue;throw e;}
 }
 throw new Error('Transaction retry exhausted.');
}
