var SETTINGS_CACHE_KEY_ = 'barber_booking_settings_map_v1';

function clearSettingsCache_() {
  CacheService.getScriptCache().remove(SETTINGS_CACHE_KEY_);
}

function getSettingsMap_() {
  var cached = CacheService.getScriptCache().get(SETTINGS_CACHE_KEY_);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (ignored) {
      clearSettingsCache_();
    }
  }
  var settings = {};
  getSheetRecords_(BARBER_BOOKING.sheets.SETTINGS).forEach(function(record) {
    if (record.key) settings[String(record.key)] = String(record.value == null ? '' : record.value);
  });
  CacheService.getScriptCache().put(SETTINGS_CACHE_KEY_, JSON.stringify(settings), 120);
  return settings;
}

function getSetting_(key, fallback) {
  var scriptValue = PropertiesService.getScriptProperties().getProperty(key);
  if (scriptValue != null && scriptValue !== '') return scriptValue;
  var settings = getSettingsMap_();
  if (settings[key] != null && settings[key] !== '') return String(settings[key]);
  if (BARBER_BOOKING.defaultSettings[key] != null) return BARBER_BOOKING.defaultSettings[key];
  return fallback;
}

function setSetting_(key, value) {
  var sheetName = BARBER_BOOKING.sheets.SETTINGS;
  var record = findSheetRecordByField_(sheetName, 'key', key);
  if (record) {
    record.value = value == null ? '' : String(value);
    updateSheetRecord_(sheetName, record);
  } else {
    appendSheetRecord_(sheetName, { key: key, value: value == null ? '' : String(value) });
  }
  clearSettingsCache_();
}

function ensureDefaultSettings_() {
  var settings = getSettingsMap_();
  Object.keys(BARBER_BOOKING.defaultSettings).forEach(function(key) {
    if (settings[key] == null) setSetting_(key, BARBER_BOOKING.defaultSettings[key]);
  });
}

function getSafeSettings_() {
  var settings = getSettingsMap_();
  Object.keys(BARBER_BOOKING.defaultSettings).forEach(function(key) {
    if (settings[key] == null) settings[key] = BARBER_BOOKING.defaultSettings[key];
  });
  return {
    BARBER_NAME: settings.BARBER_NAME,
    BARBER_EMAIL: settings.BARBER_EMAIL,
    PUBLIC_APP_URL: settings.PUBLIC_APP_URL || '',
    MAX_ACTIVE_APPOINTMENTS_PER_CLIENT: asInteger_(settings.MAX_ACTIVE_APPOINTMENTS_PER_CLIENT, 2),
    BOOKING_ADVANCE_DAYS: asInteger_(settings.BOOKING_ADVANCE_DAYS, 60),
    MIN_BOOKING_ADVANCE_MINUTES: asInteger_(settings.MIN_BOOKING_ADVANCE_MINUTES, 30),
    OTP_EXPIRATION_MINUTES: asInteger_(settings.OTP_EXPIRATION_MINUTES, 10),
    BUSINESS_TIMEZONE: settings.BUSINESS_TIMEZONE || BARBER_BOOKING.timezone,
    SLOT_INTERVAL_MINUTES: asInteger_(settings.SLOT_INTERVAL_MINUTES, 30),
    REQUIRE_EMAIL_VERIFICATION: asBoolean_(settings.REQUIRE_EMAIL_VERIFICATION),
    RATE_LIMIT_MAX_ATTEMPTS: asInteger_(settings.RATE_LIMIT_MAX_ATTEMPTS, 5),
    RATE_LIMIT_BLOCK_MINUTES: asInteger_(settings.RATE_LIMIT_BLOCK_MINUTES, 15),
    RATE_LIMIT_WINDOW_SECONDS: asInteger_(settings.RATE_LIMIT_WINDOW_SECONDS, 600),
    CALENDAR_ID: getScriptProperty_('CALENDAR_ID', settings.CALENDAR_ID || 'primary'),
    SPREADSHEET_CONFIGURED: Boolean(getScriptProperty_('SPREADSHEET_ID', ''))
  };
}
