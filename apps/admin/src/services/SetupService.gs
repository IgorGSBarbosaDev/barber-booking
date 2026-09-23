function getSystemStatus_() {
  var spreadsheetId = getScriptProperty_('SPREADSHEET_ID', '');
  var adminEmail = getScriptProperty_('ADMIN_EMAIL', '');
  return {
    configured: Boolean(spreadsheetId),
    spreadsheetConfigured: Boolean(spreadsheetId),
    calendarConfigured: Boolean(getScriptProperty_('CALENDAR_ID', '')),
    adminConfigured: Boolean(adminEmail),
    timezone: getBusinessTimezone_()
  };
}

function seedDefaultSchedule_() {
  var scheduleSheet = BARBER_BOOKING.sheets.WORK_SCHEDULE;
  if (getSheetRecords_(scheduleSheet).length) return;
  var defaults = {
    1: { enabled: false, startTime: '', endTime: '' },
    2: { enabled: true, startTime: '09:00', endTime: '19:00' },
    3: { enabled: true, startTime: '09:00', endTime: '19:00' },
    4: { enabled: true, startTime: '09:00', endTime: '19:00' },
    5: { enabled: true, startTime: '09:00', endTime: '19:00' },
    6: { enabled: true, startTime: '08:00', endTime: '17:00' },
    7: { enabled: false, startTime: '', endTime: '' }
  };
  for (var weekday = 1; weekday <= 7; weekday += 1) {
    appendSheetRecord_(scheduleSheet, {
      weekday: weekday,
      enabled: defaults[weekday].enabled,
      startTime: defaults[weekday].startTime,
      endTime: defaults[weekday].endTime
    });
  }
}

function setupSystem_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  var spreadsheet;
  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('Barber Booking Data');
    properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  }
  ensureDatabaseSchema_(spreadsheet);
  ensureDefaultSettings_();
  seedDefaultSchedule_();
  properties.setProperty('BARBER_BOOKING_SCHEMA_VERSION', String(BARBER_BOOKING.schemaVersion || '1'));
  properties.setProperty('BARBER_BOOKING_SCHEMA_SPREADSHEET_ID', spreadsheet.getId());
  if (!properties.getProperty('APP_SECRET')) properties.setProperty('APP_SECRET', generateToken_());
  if (!properties.getProperty('CALENDAR_ID')) properties.setProperty('CALENDAR_ID', 'primary');
  var effectiveEmail = '';
  try {
    effectiveEmail = normalizeEmail_(Session.getEffectiveUser().getEmail());
  } catch (ignored) {
    effectiveEmail = '';
  }
  if (effectiveEmail) {
    if (!properties.getProperty('ADMIN_EMAIL')) properties.setProperty('ADMIN_EMAIL', effectiveEmail);
    if (!getSetting_('BARBER_EMAIL', '')) setSetting_('BARBER_EMAIL', effectiveEmail);
  }
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    adminEmail: properties.getProperty('ADMIN_EMAIL') || '',
    calendarId: properties.getProperty('CALENDAR_ID') || 'primary'
  };
}

function ensureSystemReady_() {
  var spreadsheet = getConfiguredSpreadsheet_();
  var properties = PropertiesService.getScriptProperties();
  var schemaVersion = String(BARBER_BOOKING.schemaVersion || '1');
  var isReady = properties.getProperty('BARBER_BOOKING_SCHEMA_VERSION') === schemaVersion
    && properties.getProperty('BARBER_BOOKING_SCHEMA_SPREADSHEET_ID') === spreadsheet.getId();
  if (isReady) return spreadsheet;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    isReady = properties.getProperty('BARBER_BOOKING_SCHEMA_VERSION') === schemaVersion
      && properties.getProperty('BARBER_BOOKING_SCHEMA_SPREADSHEET_ID') === spreadsheet.getId();
    if (!isReady) {
      ensureDatabaseSchema_(spreadsheet);
      ensureDefaultSettings_();
      seedDefaultSchedule_();
      properties.setProperty('BARBER_BOOKING_SCHEMA_VERSION', schemaVersion);
      properties.setProperty('BARBER_BOOKING_SCHEMA_SPREADSHEET_ID', spreadsheet.getId());
    }
  } finally {
    lock.releaseLock();
  }
  return spreadsheet;
}
