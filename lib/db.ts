import { PrismaClient, Prisma } from '@prisma/client';
const globalDb=globalThis as unknown as {prisma?:PrismaClient};
export const db=globalDb.prisma??new PrismaClient();
if(process.env.NODE_ENV!=='production')globalDb.prisma=db;
export async function serial<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<4;attempt++){
  try{return await db.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});}
  catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2034'&&attempt<3)continue;throw e;}
 }
 throw new Error('Transaction retry exhausted.');
}
