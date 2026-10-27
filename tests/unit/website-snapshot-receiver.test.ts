import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { expect, it } from 'vitest';

it('writes readable bookings into existing headers, preserves manual cells, and retries without duplicates', () => {
  const rows: string[][] = [['Booking ID','Customer ID','Full Name','Customer Mobile','Coordinator'],['legacy-booking','legacy-customer','Existing customer','','Keep me']];
  const sheet = {
    getLastRow: () => rows.length, getLastColumn: () => rows[0].length, getMaxColumns: () => 100,
    insertColumnsAfter() {},
    getRange: (r:number,c:number,n=1,w=1) => {
      const range = {
        getValues: () => Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),
        setValue: (value:string) => {rows[r-1] ||= []; rows[r-1][c-1]=value; return range;},
        setNumberFormat: () => range,
      }; return range;
    },
  };
  const context=createContext({
    PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'sheet'})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},
    Utilities:{formatDate:()=> '25 Oct 2026, 10:00'},
    kumDemoJson_:(value:unknown)=>value,
    data:{bookingId:'booking-test',rows:{Bookings:[{id:'booking-test',bookingId:'booking-test',customerId:'customer-test',name:'=Test',mobile:'0000000000',details:{notes:'Bring supplies',bedrooms:0}}]}},
  });
  runInContext(readFileSync('apps-script/WebsiteSnapshots.gs','utf8'),context);
  expect(runInContext('kumWebsiteSnapshot_(data)',context)).toMatchObject({ok:true,data:{rows:{Bookings:1}}});
  runInContext('kumWebsiteSnapshot_(data)',context);
  expect(rows).toHaveLength(3);
  expect(rows[1]).toEqual(['legacy-booking','legacy-customer','Existing customer','','Keep me']);
  const saved=Object.fromEntries(rows[0].map((h,i)=>[h,rows[2][i]]));
  expect(saved).toMatchObject({'Booking ID':'booking-test','Full Name':"'=Test",'Customer Mobile':'0000000000','Condition and Notes':'Bring supplies',Bedrooms:'0'});
  expect(JSON.parse(saved['Record JSON']).details.notes).toBe('Bring supplies');
});
