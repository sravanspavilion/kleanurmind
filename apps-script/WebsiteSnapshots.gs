// Signed website booking snapshots. Called only after Code.gs authenticates HMAC.
// Preserve existing columns and manual cells; append missing website fields.
function kumWebsiteSnapshot_(data) {
  var tabs = ['Bookings','Cleaning','Laundry','Quotes','Appointments','Staff Assignments','Customer Followups'];
  if (!data || !/^[A-Za-z0-9_-]{6,64}$/.test(String(data.bookingId || '')) || !data.rows || typeof data.rows !== 'object') throw new Error('Invalid snapshot');
  tabs.forEach(function(name) {
    var rows = data.rows[name] || [];
    if (!Array.isArray(rows)) throw new Error('Invalid rows');
    rows.forEach(function(row) { if (!row || !row.id || row.bookingId !== data.bookingId) throw new Error('Invalid record'); });
  });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    var counts = {};
    tabs.forEach(function(name) {
      var rows = data.rows[name] || [];
      if (!rows.length) return;
      var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
      var headers = sheet.getLastRow() ? sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String) : [];
      function column(labels) {
        var index = -1;
        labels.some(function(label) { index = headers.indexOf(label); return index >= 0; });
        if (index < 0) {
          index = headers.length;
          headers.push(labels[0]);
          if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
          sheet.getRange(1,index+1).setValue(labels[0]);
        }
        return index+1;
      }
      var idColumn = column(['Record ID','Website Record ID']);
      var ids = sheet.getLastRow()>1 ? sheet.getRange(2,idColumn,sheet.getLastRow()-1,1).getValues().map(function(r){return String(r[0]);}) : [];
      rows.forEach(function(row) {
        var index = ids.indexOf(String(row.id));
        var number = index<0 ? Math.max(2,sheet.getLastRow()+1) : index+2;
        function write(labels,value) {
          if (value === undefined) return;
          var text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
          if (/^[=+@\-]/.test(text)) text = "'"+text;
          sheet.getRange(number,column(labels)).setNumberFormat('@').setValue(text);
        }
        write(['Record ID','Website Record ID'],row.id);
        var labels = {
          bookingId:['Booking ID'],customerId:['Customer ID'],name:['Full Name','Name'],mobile:['Customer Mobile','Phone'],email:['Verified Email','Email'],
          service:['Service Selected','Service'],locality:['Locality in Kozhikode','Locality'],address:['Full Service Address','Address'],
          landmark:['Landmark'],accessContact:['Access Contact Name and Phone','Access contact'],floorLift:['Floor and Lift Information','Floor and lift'],
          utilities:['Water and Electricity Availability','Water and electricity'],createdAt:['Request Created IST','Created at (IST)'],
          status:[name==='Bookings'?'Booking Status':name==='Cleaning'?'Cleaning Status':name==='Laundry'?'Laundry Status':'Status'],
          requestedStart:['Requested Start IST','Requested start'],requestedEnd:['Requested End IST','Requested end'],start:['Confirmed Start IST'],end:['Confirmed End IST'],
          kind:['Kind'],confirmed:['Confirmed'],estimatedWeightGrams:['Estimated Weight (grams)'],actualWeightGrams:['Actual Weight (grams)']
        };
        Object.keys(row).forEach(function(key) {
          if (key==='id' || key==='details') return;
          var value=row[key];
          if (value && ['createdAt','requestedStart','requestedEnd','start','end'].indexOf(key)>=0) value=Utilities.formatDate(new Date(value),'Asia/Kolkata','dd MMM yyyy, HH:mm')+' IST';
          write(labels[key] || [key.replace(/([A-Z])/g,' $1').replace(/^./,function(c){return c.toUpperCase();})],value);
        });
        var detailLabels={propertyType:['Property Type'],bedrooms:['Bedrooms'],bathrooms:['Bathrooms'],area:['Area'],furnishing:['Furnishing'],cleaningType:['Cleaning Type'],tasks:['Additional Tasks'],notes:['Condition and Notes'],type:['Laundry Service'],bags:['Estimated Bags'],weightGrams:['Estimated Weight (grams)'],instructions:['Handling Instructions'],returnPreference:['Return Preference'],collectDuringCleaning:['Collect During Cleaning']};
        Object.keys(row.details || {}).forEach(function(key){write(detailLabels[key] || [key.replace(/([A-Z])/g,' $1')],row.details[key]);});
        write(['Updated at'],new Date().toISOString());
        write(['Record JSON'],row);
        if(index<0) ids.push(String(row.id));
      });
      counts[name]=rows.length;
    });
    SpreadsheetApp.flush();
    return kumDemoJson_({ok:true,data:{bookingId:data.bookingId,rows:counts}});
  } finally { lock.releaseLock(); }
}
