// Demo helpers deployed alongside Code.gs. This single file handles the signed
// `health` and `syncDemoRequest` actions, including demo client accounts that are
// stored in a separate "Customer Accounts" tab.
//
// To update: open this file in the Apps Script editor, replace its contents with
// this file, Save, then Deploy > Manage deployments > Edit > Version: New version.
// The /exec URL stays the same. Code.gs already dispatches `syncDemoRequest` to
// kumDemoSync_, so no other file needs to change.

function kumDemoJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function kumDemoHealth_() {
  SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')).getId();
  return kumDemoJson_({ok:true,data:{version:'demo-requests-accounts-v4',spreadsheetAccessible:true}});
}

function kumDemoSync_(data) {
  // Demo client accounts reuse this deployed action so Code.gs needs no change.
  if (data && data.kind === 'account') return kumDemoAccountsHandle_({ action: data.operation, data: data });
  if (!data || data.demo !== true || !/^DEMO-[0-9a-f-]{36}$/i.test(data.id) ||
      data.id !== 'DEMO-' + data.requestKey || ['CLEANING','LAUNDRY','BOTH'].indexOf(data.service) < 0) throw new Error('Invalid demo request');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    var sheet = spreadsheet.getSheetByName('Demo Requests') || spreadsheet.insertSheet('Demo Requests');
    var headers = ['Demo Request ID','Mode','Status','Service','Name','Phone','Locality','Address','Requested cleaning (IST)','Requested pickup (IST)','Quote','Request JSON'];
    var extraHeaders = ['Landmark','Access contact','Floor and lift','Water and electricity','Property type','Bedrooms','Bathrooms','Area','Furnishing','Cleaning type','Additional tasks','Condition and notes','Laundry service','Estimated bags','Estimated weight (kg)','Handling instructions','Collect during cleaning','Return preference'];
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
    // Preserve the original columns and rows; add detail columns to the right.

    var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (headers.some(function(value, index) { return existing[index] !== value; })) throw new Error('Demo sheet layout differs');
    var allHeaders = headers.concat(extraHeaders);
    if (sheet.getMaxColumns() < allHeaders.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), allHeaders.length - sheet.getMaxColumns());
    sheet.getRange(1, headers.length+1, 1, extraHeaders.length).setValues([extraHeaders]);
    var ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow()-1, 1).getValues().map(function(row) { return String(row[0]); }) : [];
    var index = ids.indexOf(data.id);
    var ist = function(value) { return value ? Utilities.formatDate(new Date(value), 'Asia/Kolkata', 'dd MMM yyyy, HH:mm') + ' IST' : ''; };
    var cleaning = data.cleaning || {};
    var laundry = data.laundry || {};
    var values = [data.id,'DEMO — simulated','REQUESTED',data.service,data.name,data.phone,data.locality,data.fullAddress,
      ist(data.cleaningStart),ist(data.collectDuringCleaning ? data.cleaningStart : data.pickupStart),'Pending quote — no payment',JSON.stringify(data),
      data.landmark,data.accessContact,data.floorLift,data.utilities,cleaning.propertyType,cleaning.bedrooms,cleaning.bathrooms,cleaning.area,cleaning.furnishing,cleaning.cleaningType,cleaning.tasks,cleaning.notes,
      laundry.type,laundry.bags,laundry.weightGrams == null ? '' : laundry.weightGrams/1000,laundry.instructions,data.collectDuringCleaning ? 'Yes' : 'No',data.returnPreference]
      .map(function(value) { var text = String(value == null ? '' : value); return /^[=+@\-]/.test(text) ? "'" + text : text; });
    sheet.getRange(index < 0 ? sheet.getLastRow()+1 : index+2, 1, 1, allHeaders.length).setNumberFormat('@').setValues([values]);
    return kumDemoJson_({ok:true,data:{demoRequestId:data.id}});
  } finally { lock.releaseLock(); }
}

// --- Demo client accounts --------------------------------------------------
// Only a bcrypt password hash is stored here; the password itself is hashed on
// the website server and never written to the spreadsheet.

var KUM_ACCOUNT_HEADERS = ['Account ID', 'Name', 'Email', 'Phone', 'Password hash', 'Created at (IST)', 'Last login (IST)', 'Status'];

function kumDemoAccountsHandle_(request) {
  if (!request || !request.data) return null;
  if (request.action === 'createDemoAccount') return kumDemoCreateAccount_(request.data);
  if (request.action === 'findDemoAccount') return kumDemoFindAccount_(request.data);
  if (request.action === 'touchDemoAccount') return kumDemoTouchAccount_(request.data);
  return null;
}

function kumDemoAccountsSheet_(props) {
  var spreadsheet = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  var sheet = spreadsheet.getSheetByName('Customer Accounts') || spreadsheet.insertSheet('Customer Accounts');
  if (sheet.getLastRow() === 0) sheet.appendRow(KUM_ACCOUNT_HEADERS);
  var existing = sheet.getRange(1, 1, 1, KUM_ACCOUNT_HEADERS.length).getValues()[0];
  if (KUM_ACCOUNT_HEADERS.some(function (value, index) { return existing[index] !== value; })) throw new Error('Account sheet layout differs');
  return sheet;
}

function kumDemoAccountRows_(sheet) {
  return sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, KUM_ACCOUNT_HEADERS.length).getValues() : [];
}

function kumDemoAccountsIst_() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM yyyy, HH:mm');
}

// Neutralise values a spreadsheet would treat as a formula.
function kumDemoAccountsText_(value) {
  var text = String(value == null ? '' : value);
  return /^[=+@\-]/.test(text) ? "'" + text : text;
}

function kumDemoCreateAccount_(data) {
  var email = String(data.email || '').trim().toLowerCase();
  var name = String(data.name || '').trim();
  var passwordHash = String(data.passwordHash || '');
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || passwordHash.indexOf('$2') !== 0) throw new Error('Invalid account');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = kumDemoAccountsSheet_(PropertiesService.getScriptProperties());
    var rows = kumDemoAccountRows_(sheet);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][2]).trim().toLowerCase() === email) return kumDemoJson_({ ok: true, data: { accountId: String(rows[i][0]), duplicate: true } });
    }
    var accountId = 'ACC-' + Utilities.getUuid();
    var values = [accountId, name, email, String(data.phone || ''), passwordHash, kumDemoAccountsIst_(), '', 'ACTIVE'].map(kumDemoAccountsText_);
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, KUM_ACCOUNT_HEADERS.length).setNumberFormat('@').setValues([values]);
    return kumDemoJson_({ ok: true, data: { accountId: accountId, duplicate: false } });
  } finally {
    lock.releaseLock();
  }
}

function kumDemoFindAccount_(data) {
  var email = String(data.email || '').trim().toLowerCase();
  var sheet = kumDemoAccountsSheet_(PropertiesService.getScriptProperties());
  var rows = kumDemoAccountRows_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][2]).trim().toLowerCase() === email) {
      return kumDemoJson_({ ok: true, data: { account: {
        accountId: String(rows[i][0]), name: String(rows[i][1]), email: String(rows[i][2]),
        phone: String(rows[i][3]), passwordHash: String(rows[i][4]), status: String(rows[i][7]) || 'ACTIVE',
      } } });
    }
  }
  return kumDemoJson_({ ok: true, data: { account: null } });
}

function kumDemoTouchAccount_(data) {
  var accountId = String(data.accountId || '');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = kumDemoAccountsSheet_(PropertiesService.getScriptProperties());
    var rows = kumDemoAccountRows_(sheet);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === accountId) {
        sheet.getRange(i + 2, 7).setNumberFormat('@').setValues([[kumDemoAccountsIst_()]]);
        break;
      }
    }
    return kumDemoJson_({ ok: true, data: { accountId: accountId } });
  } finally {
    lock.releaseLock();
  }
}
