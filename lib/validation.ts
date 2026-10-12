import { z } from 'zod';
const text=z.string().trim().min(1).max(2000);
const optional=z.string().trim().max(2000).default('');
const time=z.string().datetime({offset:true});
export const bookingSchema=z.object({
 requestKey:z.string().uuid(), service:z.enum(['CLEANING','LAUNDRY','BOTH']), name:text.max(100), locality:text.max(100), fullAddress:text, landmark:optional, accessContact:text.max(150), floorLift:text.max(200), utilities:text.max(200),
 cleaning:z.object({propertyType:text.max(80),bedrooms:z.number().int().min(0).max(100),bathrooms:z.number().int().min(0).max(100),area:optional,furnishing:z.enum(['FURNISHED','EMPTY']),cleaningType:text.max(100),tasks:optional,notes:optional}).optional(),
 laundry:z.object({type:z.enum(['WASH_FOLD','WASH_IRON']),bags:z.number().int().min(1).max(100),weightGrams:z.number().int().min(1).max(1000000).optional(),instructions:optional}).optional(),
 cleaningStart:time.optional(),pickupStart:time.optional(),collectDuringCleaning:z.boolean().default(false),returnPreference:optional
}).superRefine((v,c)=>{
 if(v.service!=='LAUNDRY'&&(!v.cleaning||!v.cleaningStart)) c.addIssue({code:'custom',message:'Cleaning details and requested appointment are required.',path:['cleaning']});
 if(v.service!=='CLEANING'&&(!v.laundry||(!v.pickupStart&&!v.collectDuringCleaning))) c.addIssue({code:'custom',message:'Laundry details and pickup time are required.',path:['laundry']});
 if(v.collectDuringCleaning&&v.service!=='BOTH') c.addIssue({code:'custom',message:'Collection during cleaning requires both services.',path:['collectDuringCleaning']});
 for(const k of ['cleaningStart','pickupStart'] as const) if(v[k] && new Date(v[k]!).getTime()<=Date.now()) c.addIssue({code:'custom',message:'Please request a future appointment.',path:[k]});
});
export const proposedSchema=z.array(z.object({kind:z.enum(['CLEANING','PICKUP','RETURN']),start:time,end:time})).min(1).max(3).refine(a=>a.every(x=>new Date(x.end)>new Date(x.start)),'Appointment end must follow start.').refine(a=>new Set(a.map(x=>x.kind)).size===a.length,'Duplicate appointment types.');
export const quoteSchema=z.object({orderId:text,items:z.array(z.object({description:text,kind:z.enum(['CLEANING','LAUNDRY']),quantity:z.number().int().min(1).max(1000),unitPaise:z.number().int().min(1).max(100000000)})).min(1).max(30),deliveryPaise:z.number().int().min(0).max(100000000),inclusions:text,exclusions:text,appointments:proposedSchema});
export const assignmentSchema=z.object({orderId:text,kind:z.enum(['CLEANING','PICKUP','RETURN']),staffIds:z.array(text).min(1).max(20),start:time,end:time,bufferMinutes:z.number().int().min(0).max(240),vendorCostPaise:z.number().int().min(0).optional(),vendorAccepted:z.boolean().default(false),promisedCompletion:time.optional()}).refine(v=>new Date(v.end)>new Date(v.start),'End must follow start.').refine(v=>new Set(v.staffIds).size===v.staffIds.length,'Duplicate staff.');
export type BookingInput=z.infer<typeof bookingSchema>;
