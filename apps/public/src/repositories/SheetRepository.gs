function ensureSheetSchema_(spreadsheet, sheetName) {
  var headers = getSchema_(sheetName);
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  var headersChanged = false;
  var lastColumn = sheet.getLastColumn();
  var existingHeaders = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) { return trim_(value); })
    : [];
  if (!existingHeaders.length || existingHeaders.every(function(header) { return !header; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    headersChanged = true;
  } else {
    var missingHeaders = headers.filter(function(header) { return existingHeaders.indexOf(header) === -1; });
    if (missingHeaders.length) {
      sheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      headersChanged = true;
    }
  }
  if (sheet.getFrozenRows() !== 1) sheet.setFrozenRows(1);
  if (headersChanged) sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).setFontWeight('bold');
  return sheet;
}

function ensureDatabaseSchema_(spreadsheet) {
  Object.keys(BARBER_BOOKING.schemas).forEach(function(sheetName) {
    ensureSheetSchema_(spreadsheet, sheetName);
  });
  return spreadsheet;
}

function getDataSheet_(sheetName) {
  var spreadsheet = getConfiguredSpreadsheet_();
  return spreadsheet.getSheetByName(sheetName) || ensureSheetSchema_(spreadsheet, sheetName);
}

function getSheetHeaders_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) { return trim_(value); });
}

function getSheetRecords_(sheetName) {
  var sheet = getDataSheet_(sheetName);
  var headers = getSheetHeaders_(sheet);
  if (sheet.getLastRow() < 2 || !headers.length) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return rows.map(function(row, index) {
    var record = { _rowNumber: index + 2 };
    headers.forEach(function(header, columnIndex) {
      record[header] = row[columnIndex];
    });
    return record;
  }).filter(function(record) {
    return headers.some(function(header) { return record[header] !== '' && record[header] != null; });
  });
}

function appendSheetRecord_(sheetName, record) {
  var sheet = getDataSheet_(sheetName);
  var headers = getSheetHeaders_(sheet);
  var row = headers.map(function(header) {
    return record[header] == null ? '' : record[header];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
  record._rowNumber = sheet.getLastRow();
  return record;
}

function updateSheetRecord_(sheetName, record) {
  if (!record || !record._rowNumber) {
    throwAppError_('RECORD_NOT_FOUND', 'Registro não encontrado.');
  }
  var sheet = getDataSheet_(sheetName);
  var headers = getSheetHeaders_(sheet);
  var row = headers.map(function(header) {
    return record[header] == null ? '' : record[header];
  });
  sheet.getRange(record._rowNumber, 1, 1, headers.length).setValues([row]);
  return record;
}

function deleteSheetRecord_(sheetName, record) {
  if (!record || !record._rowNumber) {
    throwAppError_('RECORD_NOT_FOUND', 'Registro não encontrado.');
  }
  getDataSheet_(sheetName).deleteRow(record._rowNumber);
}

function findSheetRecordById_(sheetName, id) {
  var value = trim_(id);
  if (!value) return null;
  return getSheetRecords_(sheetName).filter(function(record) { return String(record.id) === value; })[0] || null;
}

function findSheetRecordsByField_(sheetName, field, value) {
  return getSheetRecords_(sheetName).filter(function(record) {
    return String(record[field] == null ? '' : record[field]) === String(value == null ? '' : value);
  });
}

function findSheetRecordByField_(sheetName, field, value) {
  return findSheetRecordsByField_(sheetName, field, value)[0] || null;
}
