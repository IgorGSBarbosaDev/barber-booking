function now_() {
  return new Date();
}

function trim_(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeEmail_(value) {
  return trim_(value).toLowerCase();
}

function normalizePhone_(value) {
  return trim_(value).replace(/\D/g, '');
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail_(email));
}

function isValidPhone_(phone) {
  var normalized = normalizePhone_(phone);
  return normalized.length >= 8 && normalized.length <= 15;
}

function asBoolean_(value) {
  if (value === true || value === false) return value;
  return ['true', '1', 'sim', 'yes', 'on'].indexOf(String(value).toLowerCase()) >= 0;
}

function asInteger_(value, fallback) {
  var parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function asNumber_(value, fallback) {
  var normalized = String(value == null ? '' : value).replace(',', '.');
  var parsed = Number(normalized);
  return isNaN(parsed) ? fallback : parsed;
}

function roundMoney_(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatCurrency_(value) {
  var amount = roundMoney_(value || 0);
  try {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch (error) {
    return 'R$ ' + amount.toFixed(2).replace('.', ',');
  }
}

function getBusinessTimezone_() {
  var propertyTimezone = PropertiesService.getScriptProperties().getProperty('BUSINESS_TIMEZONE');
  if (propertyTimezone) return propertyTimezone;
  if (PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')) {
    try {
      var sheetTimezone = findSheetRecordByField_(BARBER_BOOKING.sheets.SETTINGS, 'key', 'BUSINESS_TIMEZONE');
      if (sheetTimezone && sheetTimezone.value) return String(sheetTimezone.value);
    } catch (ignored) {
      // Use the manifest timezone until the database is ready.
    }
  }
  return BARBER_BOOKING.defaultSettings.BUSINESS_TIMEZONE || BARBER_BOOKING.timezone;
}

function formatDate_(date) {
  return Utilities.formatDate(date, getBusinessTimezone_(), 'yyyy-MM-dd');
}

function formatTime_(date) {
  return Utilities.formatDate(date, getBusinessTimezone_(), 'HH:mm');
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, getBusinessTimezone_(), "yyyy-MM-dd'T'HH:mm:ss");
}

function parseDate_(dateString) {
  var value = trim_(dateString);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throwAppError_('INVALID_DATE', 'Data inválida.');
  }
  var date = Utilities.parseDate(value + ' 12:00', getBusinessTimezone_(), 'yyyy-MM-dd HH:mm');
  if (formatDate_(date) !== value) {
    throwAppError_('INVALID_DATE', 'Data inválida.');
  }
  return date;
}

function parseDateTime_(dateString, timeString) {
  var date = trim_(dateString);
  var time = trim_(timeString);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throwAppError_('INVALID_DATETIME', 'Data ou horário inválido.');
  }
  var parsed = Utilities.parseDate(date + ' ' + time, getBusinessTimezone_(), 'yyyy-MM-dd HH:mm');
  if (formatDate_(parsed) !== date || formatTime_(parsed) !== time) {
    throwAppError_('INVALID_DATETIME', 'Data ou horário inválido.');
  }
  return parsed;
}

function addMinutes_(date, minutes) {
  return new Date(date.getTime() + Number(minutes) * 60 * 1000);
}

function minutesBetween_(start, end) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function dayOfWeek_(dateString) {
  return asInteger_(Utilities.formatDate(parseDate_(dateString), getBusinessTimezone_(), 'u'), 1);
}

function isFutureAppointment_(appointment) {
  try {
    return parseDateTime_(appointment.date, appointment.startTime).getTime() > now_().getTime();
  } catch (error) {
    return false;
  }
}

function getScriptProperty_(key, fallback) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return value == null || value === '' ? fallback : value;
}

function setScriptProperty_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

function getConfiguredSpreadsheet_() {
  var spreadsheetId = getScriptProperty_('SPREADSHEET_ID', '');
  if (!spreadsheetId) {
    throwAppError_('SYSTEM_NOT_CONFIGURED', 'A base Google Sheets ainda não foi configurada.');
  }
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throwAppError_('SPREADSHEET_ACCESS_ERROR', 'Não foi possível acessar a base Google Sheets configurada.');
  }
}

function getCalendar_() {
  var calendarId = getScriptProperty_('CALENDAR_ID', getSetting_('CALENDAR_ID', 'primary'));
  var calendar = calendarId === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    throwAppError_('CALENDAR_NOT_FOUND', 'O Google Calendar configurado não foi encontrado.');
  }
  return calendar;
}

function generateId_(prefix) {
  return String(prefix || 'ID') + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase();
}

function generateToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function hash_(value) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(byte) {
    var normalized = byte < 0 ? byte + 256 : byte;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function getAppSecret_() {
  var secret = getScriptProperty_('APP_SECRET', '');
  if (!secret) {
    secret = generateToken_();
    setScriptProperty_('APP_SECRET', secret);
  }
  return secret;
}

function hashWithSecret_(value) {
  return hash_(getAppSecret_() + '|' + String(value));
}

function json_(value) {
  return JSON.stringify(value == null ? {} : value);
}

function parsePayload_(payload) {
  if (payload == null) return {};
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch (error) {
      throwAppError_('INVALID_PAYLOAD', 'Dados enviados em formato inválido.');
    }
  }
  return payload;
}

function throwAppError_(code, message, details) {
  var error = new Error(message);
  error.appCode = code;
  error.details = details || null;
  throw error;
}

function serializeError_(error) {
  var code = error && error.appCode ? error.appCode : 'INTERNAL_ERROR';
  var message = error && error.appCode ? error.message : 'Não foi possível concluir a operação.';
  return { code: code, message: message, details: error && error.details ? error.details : null };
}

function apiCall_(callback) {
  try {
    return { ok: true, data: callback() };
  } catch (error) {
    try {
      console.error(error && error.stack ? error.stack : error);
    } catch (ignored) {
      // Logging must not hide the original API error.
    }
    return { ok: false, error: serializeError_(error) };
  }
}

function requireText_(value, field, minLength, maxLength) {
  var text = trim_(value);
  if (text.length < minLength || text.length > maxLength) {
    throwAppError_('INVALID_' + field.toUpperCase(), 'O campo ' + field + ' é inválido.');
  }
  return text;
}

function requireDateInRange_(dateString) {
  var date = parseDate_(dateString);
  var today = parseDate_(formatDate_(now_()));
  var maxDays = asInteger_(getSetting_('BOOKING_ADVANCE_DAYS', 60), 60);
  var maxDate = addMinutes_(today, maxDays * 24 * 60);
  if (date.getTime() < today.getTime() || date.getTime() > maxDate.getTime()) {
    throwAppError_('DATE_OUT_OF_RANGE', 'A data está fora do período permitido para agendamento.');
  }
  return date;
}
