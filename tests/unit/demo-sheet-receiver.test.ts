import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('Apps Script demo receiver', () => {
  it.each([['OperationalMirror.gs','syncDemoRequest_(data, props)'],['DemoRequests.gs','kumDemoSync_(data)']])('%s upserts complete demo fields and preserves IDs on retries', (file, call) => {
    const rows: string[][] = [];
    const sheet = {
      getLastRow: () => rows.length,
      getMaxColumns: () => 40,
      insertColumnsAfter() {},
      appendRow: (values: string[]) => rows.push(values),
      getRange: (row: number, col: number, count = 1, width = 1) => ({
        getValues: () => rows.slice(row-1, row-1+count).map(values => values.slice(col-1, col-1+width)),
        setValues: (values: string[][]) => { rows[row-1] ||= []; values[0].forEach((value,index)=>{ rows[row-1][col-1+index]=value; }); },
        setNumberFormat: () => ({ setValues: (values: string[][]) => { rows[row-1] = values[0]; } }),
      }),
    };
    const context = createContext({
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-sheet' }) },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
      SpreadsheetApp: { openById: () => ({ getSheetByName: (name: string) => { expect(name).toBe('Demo Requests'); return sheet; } }) },
      Utilities: { formatDate: () => '16 Oct 2026, 10:00' },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }) },
    });
    runInContext(readFileSync(`apps-script/${file}`, 'utf8'), context);
    const key = '11111111-2222-4333-8444-555555555555';
    const data = { id: `DEMO-${key}`, requestKey: key, demo: true, service: 'CLEANING', name: '=formula', landmark: 'Demo Park', accessContact: 'Demo access', floorLift: 'Lift', utilities: 'Available', cleaning: { bedrooms: 0, bathrooms: 2, tasks: 'Balcony', notes: 'Notes', propertyType: 'Villa', area: '1500', furnishing: 'EMPTY', cleaningType: 'Deep' }, laundry: { type: 'WASH_IRON', bags: 2, weightGrams: 2500, instructions: 'Separate whites' }, returnPreference: 'Evening', cleaningStart: '2026-10-16T04:30:00Z' };
    context.data = data; context.props = { getProperty: () => 'test-sheet' };
    expect(runInContext(call, context)).toEqual({ ok: true, data: { demoRequestId: data.id } });
    runInContext(call, context);
    expect(rows).toHaveLength(2);
    expect(rows[1][4]).toBe("'=formula");
    expect(rows[1][8]).toBe('16 Oct 2026, 10:00 IST');
    expect(rows[1][1]).toContain('DEMO');
    const row = Object.fromEntries(rows[0].map((header,i)=>[header,rows[1][i]]));
    expect(row).toMatchObject({Landmark:'Demo Park', 'Access contact':'Demo access', Bedrooms:'0', 'Additional tasks':'Balcony', 'Condition and notes':'Notes', 'Estimated weight (kg)':'2.5', 'Handling instructions':'Separate whites', 'Return preference':'Evening'});
  });
});
