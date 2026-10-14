// Extension deployed alongside the existing Code.gs; its signed doPost dispatcher
// calls kumDemoHealth_ for health and kumDemoSync_ for syncDemoRequest.
function kumDemoJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function kumDemoHealth_() {
  SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')).getId();
  return kumDemoJson_({ok:true,data:{version:'complete-demo-fields-v3',spreadsheetAccessible:true}});
}
function kumDemoSync_(data) {
  var props = PropertiesService.getScriptProperties();
  if (!data || data.demo !== true || !/^DEMO-[0-9a-f-]{36}$/i.test(data.id) ||
      data.id !== 'DEMO-' + data.requestKey || ['CLEANING','LAUNDRY','BOTH'].indexOf(data.service) < 0) throw new Error('Invalid demo request');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
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
