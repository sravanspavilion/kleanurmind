import { processOutbox } from '../lib/outbox';
import { db } from '../lib/db';
processOutbox(100).catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
