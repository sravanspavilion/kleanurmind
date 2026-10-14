import { db } from '../lib/db';
async function main(){
  await db.city.upsert({where:{name:'Kozhikode'},update:{},create:{name:'Kozhikode',timezone:'Asia/Kolkata'}});
  await db.service.upsert({where:{code:'CLEANING'},update:{},create:{code:'CLEANING',name:'Home Cleaning',prices:{create:{amountPaise:500000,note:'Advertised starting price; final scope requires an approved quote.'}}}});
  await db.service.upsert({where:{code:'LAUNDRY'},update:{},create:{code:'LAUNDRY',name:'Laundry Pickup & Return',prices:{create:{amountPaise:null,note:'Quote required. No laundry rate assumed.'}}}});
  console.log('Service catalogue initialized without changing existing records. Configure coverage and policies in Admin.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
