import { db } from '../lib/db';
async function main(){
  const email=process.argv[2]?.trim().toLowerCase();
  if(!email)throw new Error('Usage: npm run admin:grant -- owner-email');
  const user=await db.user.findUnique({where:{email}});
  if(!user?.emailVerified||!user.active)throw new Error('The owner must sign in with a verified account first.');
  await db.user.update({where:{id:user.id},data:{role:'ADMIN'}});
  console.log('Administrator access granted to the specified verified account.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
