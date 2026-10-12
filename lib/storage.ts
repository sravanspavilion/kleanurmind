import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { DomainError } from './domain';
export interface PrivateStorage { put(key:string,bytes:Buffer):Promise<void>;get(key:string):Promise<Buffer>;delete(key:string):Promise<void>; }
const root=path.resolve(process.env.UPLOAD_DIR??'./private-uploads');
if(root===path.resolve('public')||root.startsWith(path.resolve('public')+path.sep))throw new Error('Upload storage must be private.');
function location(key:string){if(!/^[a-f0-9-]{36}$/.test(key))throw new DomainError('Invalid file key.');return path.join(root,key);}
export const storage:PrivateStorage={async put(key,bytes){await mkdir(root,{recursive:true,mode:0o700});await writeFile(location(key),bytes,{mode:0o600,flag:'wx'});},get:key=>readFile(location(key)),delete:key=>unlink(location(key))};
export function imageMime(bytes:Buffer){if(bytes.subarray(0,3).equals(Buffer.from([255,216,255])))return 'image/jpeg';if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'image/webp';throw new DomainError('Only JPEG, PNG and WebP images are permitted.');}
