import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('Apps Script account link backfill', () => {
  function makeSheet(rows: string[][]) {
    return {
      getLastRow: () => rows.length,
      getLastColumn: () => Math.max(1, ...rows.map((r) => r.length)),
      appendRow: (values: string[]) => rows.push(values),
      getRange: (row: number, col: number, count = 1, width = 1) => ({
        getValues: () => rows.slice(row - 1, row - 1 + count).map((values) => values.slice(col - 1, col - 1 + width)),
        setNumberFormat: () => ({ setValues: (values: string[][]) => { rows[row - 1] ||= []; values[0].forEach((value, index) => { rows[row - 1][col - 1 + index] = value; }); } }),
      }),
    };
  }

  function runWith(rows: string[][], links: unknown[]) {
    const sheet = makeSheet(rows);
    const context = createContext({
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-sheet' }) },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
      SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
      Utilities: { formatDate: () => '21 Oct 2026, 10:00', getUuid: () => 'uuid' },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }) },
    });
    runInContext(readFileSync('apps-script/DemoRequests.gs', 'utf8'), context);
    return runInContext('kumDemoBackfillLinks_', context)({ links });
  }

  it('fills missing App User ID cells by email and keeps existing links', () => {
    const headers = ['Account ID', 'Name', 'Email', 'Phone', 'Password hash', 'Created at (IST)', 'Last login (IST)', 'Status', 'App User ID'];
    // The sheet predates the link column, so rows stop at 'Status'.
    const rows: string[][] = [
      headers.slice(0, 8),
      ['ACC-1', 'Ananya', 'ananya@example.test', '', '$2a$12$hash', '1 Oct 2026', '', 'ACTIVE'],
      ['ACC-2', 'Mani', 'mani@example.test', '', '$2a$12$hash', '2 Oct 2026', '', 'ACTIVE', 'user-keep'],
    ];
    const result = runWith(rows, [
      { email: 'ANANYA@Example.test', userId: 'user-1' },
      { email: 'mani@example.test', userId: 'user-changed' },
      { email: 'ghost@example.test', userId: 'user-ghost' },
    ]);
    expect(result).toEqual({ ok: true, data: { requested: 3, updated: 1 } });
    expect(rows[1][8]).toBe('user-1');
    expect(rows[2][8]).toBe('user-keep');
  });
});
