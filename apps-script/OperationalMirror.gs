/** Deploy as a separate private-data receiver, or merge syncSnapshot into your existing router.
 * Script Properties: SHARED_SECRET, SPREADSHEET_ID. Never share the sheet publicly.
 * Execute web app as owner; the endpoint authenticates every request with HMAC.
 */
function doPost(e) {
  try {
    var envelope = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('SHARED_SECRET');
    if (!secret || typeof envelope.payload !== 'string' || typeof envelope.timestamp !== 'number' || Math.abs(Date.now()-envelope.timestamp)>300000) throw new Error('Invalid authentication');
    var expected = Utilities.computeHmacSha256Signature(envelope.timestamp+'.'+envelope.payload,secret).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
    var supplied=String(envelope.signature||'');var mismatch=expected.length^supplied.length;
    for(var i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^(supplied.charCodeAt(i)||0);
    if(mismatch)throw new Error('Invalid authentication');
    var request=JSON.parse(envelope.payload);
    if(request.action==='health'){
      // Verify the actual target is readable; never expose its id or contents.
      SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID')).getId();
      return json_({ok:true,data:{version:'operational-mirror-v2',spreadsheetAccessible:true}});
    }
    if(request.action==='syncDemoRequest')return syncDemoRequest_(request.data,props);
    if(request.action!=='syncSnapshot')throw new Error('Unsupported action');
    var lock=LockService.getScriptLock();lock.waitLock(20000);
    try {
      var spreadsheet=SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
      var tabs=['Bookings','Cleaning','Laundry','Quotes','Appointments','Staff Assignments','Customer Followups'];
      tabs.forEach(function(name){
        var rows=request.data.rows[name]||[];
        var sheet=spreadsheet.getSheetByName(name)||spreadsheet.insertSheet(name);
        if(sheet.getLastRow()===0)sheet.appendRow(['Record ID','Booking ID','Customer ID','Updated at','Record JSON']);
        // Refuse to overwrite a different existing sheet layout.
        if(sheet.getRange(1,1).getValue()!=='Record ID'||sheet.getRange(1,5).getValue()!=='Record JSON')throw new Error('Sheet layout differs; use a separate spreadsheet or migrate its headers');
        var ids=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().map(function(r){return String(r[0]);}):[];
        rows.forEach(function(row){
          if(!row.id||row.bookingId!==request.data.bookingId)throw new Error('Invalid record');
          var index=ids.indexOf(String(row.id));var number=index<0?sheet.getLastRow()+1:index+2;
          // JSON encoding keeps free text inert; identifiers are escaped as text too.
          var values=[String(row.id),String(row.bookingId),String(row.customerId),new Date().toISOString(),JSON.stringify(row)].map(function(v){return /^[=+@\-]/.test(v)?"'"+v:v;});
          sheet.getRange(number,1,1,5).setNumberFormat('@').setValues([values]);
          if(index<0)ids.push(String(row.id));
        });
      });
      return json_({ok:true,data:{bookingId:request.data.bookingId}});
    } finally {lock.releaseLock();}
  } catch(error) {return json_({ok:false,error:{code:'SYNC_FAILED',message:'Signed sync failed. Check private script configuration and sheet layout.'}});}
}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}

// Separate from production tabs. Repeated submissions update the same demo row.
function syncDemoRequest_(data, props) {
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
    return json_({ok:true,data:{demoRequestId:data.id}});
  } finally { lock.releaseLock(); }
}
