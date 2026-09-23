var SCHEDULE_CACHE_KEY_ = 'barber_booking_admin_schedule_v1';

function clearScheduleCache_() {
  CacheService.getScriptCache().remove(SCHEDULE_CACHE_KEY_);
}

function indexClientsById_(clients) {
  var index = {};
  (clients || []).forEach(function(client) {
    if (client && client.id != null) index[String(client.id)] = client;
  });
  return index;
}

function saveService_(payload) {
  var data = parsePayload_(payload);
  var name = requireText_(data.name, 'nome', 2, 100);
  var description = trim_(data.description).slice(0, 500);
  var durationMinutes = asInteger_(data.durationMinutes, 0);
  var price = roundMoney_(asNumber_(data.price, -1));
  if (durationMinutes < 5 || durationMinutes > 480) throwAppError_('INVALID_SERVICE_DURATION', 'A duração deve estar entre 5 e 480 minutos.');
  if (price < 0) throwAppError_('INVALID_SERVICE_PRICE', 'Informe um preço válido.');
  var sheetName = BARBER_BOOKING.sheets.SERVICES;
  var record = data.id ? findSheetRecordById_(sheetName, data.id) : null;
  if (record) {
    record.name = name;
    record.description = description;
    record.durationMinutes = durationMinutes;
    record.price = price;
    record.active = data.active == null ? record.active : asBoolean_(data.active);
    record.updatedAt = now_().toISOString();
    updateSheetRecord_(sheetName, record);
    logAudit_('SERVICE_UPDATED', 'SERVICE', record.id, { name: name });
    return getServicePublic_(record);
  }
  record = appendSheetRecord_(sheetName, {
    id: generateId_('SRV'),
    name: name,
    description: description,
    durationMinutes: durationMinutes,
    price: price,
    active: data.active == null ? true : asBoolean_(data.active),
    createdAt: now_().toISOString(),
    updatedAt: now_().toISOString()
  });
  logAudit_('SERVICE_CREATED', 'SERVICE', record.id, { name: name });
  return getServicePublic_(record);
}

function saveWorkSchedule_(payload) {
  var data = parsePayload_(payload);
  var rows = data.rows || [];
  if (!Array.isArray(rows)) throwAppError_('INVALID_SCHEDULE', 'Formato de disponibilidade inválido.');
  rows.forEach(function(row) {
    var weekday = asInteger_(row.weekday, 0);
    if (weekday < 1 || weekday > 7) throwAppError_('INVALID_SCHEDULE', 'Dia da semana inválido.');
    var normalized = validateScheduleWindow_(asBoolean_(row.enabled), trim_(row.startTime), trim_(row.endTime));
    var record = getSheetRecords_(BARBER_BOOKING.sheets.WORK_SCHEDULE).filter(function(item) { return Number(item.weekday) === weekday; })[0];
    if (record) {
      record.enabled = normalized.enabled;
      record.startTime = normalized.startTime;
      record.endTime = normalized.endTime;
      updateSheetRecord_(BARBER_BOOKING.sheets.WORK_SCHEDULE, record);
    } else {
      appendSheetRecord_(BARBER_BOOKING.sheets.WORK_SCHEDULE, { weekday: weekday, enabled: normalized.enabled, startTime: normalized.startTime, endTime: normalized.endTime });
    }
  });
  clearScheduleCache_();
  logAudit_('SCHEDULE_CHANGED', 'WORK_SCHEDULE', '', { rows: rows.length });
  return getScheduleSettings_();
}

function getScheduleSettings_() {
  var cached = CacheService.getScriptCache().get(SCHEDULE_CACHE_KEY_);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (ignored) {
      clearScheduleCache_();
    }
  }
  var result = {
    workSchedule: getSheetRecords_(BARBER_BOOKING.sheets.WORK_SCHEDULE).sort(function(a, b) { return Number(a.weekday) - Number(b.weekday); }).map(function(row) {
      return { weekday: Number(row.weekday), enabled: asBoolean_(row.enabled), startTime: normalizeTimeValue_(row.startTime), endTime: normalizeTimeValue_(row.endTime) };
    }),
    overrides: getSheetRecords_(BARBER_BOOKING.sheets.SCHEDULE_OVERRIDES).map(function(row) {
      return { id: row.id, date: normalizeDateValue_(row.date), enabled: asBoolean_(row.enabled), startTime: normalizeTimeValue_(row.startTime), endTime: normalizeTimeValue_(row.endTime) };
    }).sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); }),
    blocks: getSheetRecords_(BARBER_BOOKING.sheets.BLOCKS).map(function(row) {
      return { id: row.id, date: normalizeDateValue_(row.date), startTime: normalizeTimeValue_(row.startTime), endTime: normalizeTimeValue_(row.endTime), reason: row.reason || '' };
    }).sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); })
  };
  CacheService.getScriptCache().put(SCHEDULE_CACHE_KEY_, JSON.stringify(result), 120);
  return result;
}

function saveScheduleOverride_(payload) {
  var data = parsePayload_(payload);
  var date = trim_(data.date);
  requireDateInRangeForReport_(date);
  var normalized = validateScheduleWindow_(asBoolean_(data.enabled), trim_(data.startTime), trim_(data.endTime));
  var sheetName = BARBER_BOOKING.sheets.SCHEDULE_OVERRIDES;
  var record = data.id ? findSheetRecordById_(sheetName, data.id) : null;
  if (record) {
    record.date = date;
    record.enabled = normalized.enabled;
    record.startTime = normalized.startTime;
    record.endTime = normalized.endTime;
    updateSheetRecord_(sheetName, record);
  } else {
    record = appendSheetRecord_(sheetName, { id: generateId_('OVR'), date: date, enabled: normalized.enabled, startTime: normalized.startTime, endTime: normalized.endTime });
  }
  clearScheduleCache_();
  logAudit_('SCHEDULE_CHANGED', 'SCHEDULE_OVERRIDE', record.id, { date: date });
  return getScheduleSettings_();
}

function deleteScheduleOverride_(id) {
  var record = findSheetRecordById_(BARBER_BOOKING.sheets.SCHEDULE_OVERRIDES, id);
  if (!record) throwAppError_('OVERRIDE_NOT_FOUND', 'Exceção não encontrada.');
  deleteSheetRecord_(BARBER_BOOKING.sheets.SCHEDULE_OVERRIDES, record);
  clearScheduleCache_();
  logAudit_('SCHEDULE_CHANGED', 'SCHEDULE_OVERRIDE', id, { deleted: true });
  return getScheduleSettings_();
}

function saveBlock_(payload) {
  var data = parsePayload_(payload);
  var date = trim_(data.date);
  requireDateInRangeForReport_(date);
  var startTime = trim_(data.startTime);
  var endTime = trim_(data.endTime);
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || parseDateTime_(date, endTime).getTime() <= parseDateTime_(date, startTime).getTime()) {
    throwAppError_('INVALID_BLOCK', 'Informe um intervalo válido para o bloqueio.');
  }
  var sheetName = BARBER_BOOKING.sheets.BLOCKS;
  var record = data.id ? findSheetRecordById_(sheetName, data.id) : null;
  if (record) {
    record.date = date;
    record.startTime = startTime;
    record.endTime = endTime;
    record.reason = trim_(data.reason).slice(0, 200);
    updateSheetRecord_(sheetName, record);
  } else {
    record = appendSheetRecord_(sheetName, { id: generateId_('BLK'), date: date, startTime: startTime, endTime: endTime, reason: trim_(data.reason).slice(0, 200) });
  }
  clearScheduleCache_();
  logAudit_('BLOCK_CREATED', 'BLOCK', record.id, { date: date, startTime: startTime, endTime: endTime });
  return getScheduleSettings_();
}

function deleteBlock_(id) {
  var record = findSheetRecordById_(BARBER_BOOKING.sheets.BLOCKS, id);
  if (!record) throwAppError_('BLOCK_NOT_FOUND', 'Bloqueio não encontrado.');
  deleteSheetRecord_(BARBER_BOOKING.sheets.BLOCKS, record);
  clearScheduleCache_();
  logAudit_('BLOCK_CREATED', 'BLOCK', id, { deleted: true });
  return getScheduleSettings_();
}

function saveAdminSettings_(payload) {
  var data = parsePayload_(payload);
  var allowed = ['BARBER_NAME', 'BARBER_EMAIL', 'PUBLIC_APP_URL', 'MAX_ACTIVE_APPOINTMENTS_PER_CLIENT', 'BOOKING_ADVANCE_DAYS', 'MIN_BOOKING_ADVANCE_MINUTES', 'OTP_EXPIRATION_MINUTES', 'BUSINESS_TIMEZONE', 'SLOT_INTERVAL_MINUTES', 'REQUIRE_EMAIL_VERIFICATION', 'RATE_LIMIT_MAX_ATTEMPTS', 'RATE_LIMIT_BLOCK_MINUTES', 'RATE_LIMIT_WINDOW_SECONDS'];
  allowed.forEach(function(key) {
    if (data[key] == null) return;
    var value = data[key];
    if (key === 'BARBER_EMAIL' && value && !isValidEmail_(value)) throwAppError_('INVALID_BARBER_EMAIL', 'E-mail do barbeiro inválido.');
    if (key === 'MAX_ACTIVE_APPOINTMENTS_PER_CLIENT' && (asInteger_(value, 0) < 1 || asInteger_(value, 0) > 20)) throwAppError_('INVALID_SETTING', 'Limite de agendamentos inválido.');
    if (['BOOKING_ADVANCE_DAYS', 'MIN_BOOKING_ADVANCE_MINUTES', 'OTP_EXPIRATION_MINUTES', 'SLOT_INTERVAL_MINUTES', 'RATE_LIMIT_MAX_ATTEMPTS', 'RATE_LIMIT_BLOCK_MINUTES', 'RATE_LIMIT_WINDOW_SECONDS'].indexOf(key) >= 0 && asInteger_(value, 0) < 1) throwAppError_('INVALID_SETTING', 'Valor de configuração inválido.');
    setSetting_(key, key === 'REQUIRE_EMAIL_VERIFICATION' ? asBoolean_(value) : value);
    if (key === 'BUSINESS_TIMEZONE') setScriptProperty_(key, value);
  });
  if (data.CALENDAR_ID != null) {
    var calendarId = trim_(data.CALENDAR_ID) || 'primary';
    setScriptProperty_('CALENDAR_ID', calendarId);
  }
  logAudit_('SETTINGS_UPDATED', 'SETTINGS', '', { keys: allowed.filter(function(key) { return data[key] != null; }) });
  return getSafeSettings_();
}

function updateAppointmentStatus_(payload) {
  var data = parsePayload_(payload);
  var appointment = getAppointmentById_(data.id || data.appointmentId);
  if (!appointment) throwAppError_('APPOINTMENT_NOT_FOUND', 'Agendamento não encontrado.');
  var allowedStatuses = Object.keys(BARBER_BOOKING.statuses).map(function(key) { return BARBER_BOOKING.statuses[key]; });
  var status = trim_(data.status);
  if (allowedStatuses.indexOf(status) < 0) throwAppError_('INVALID_APPOINTMENT_STATUS', 'Status inválido.');
  appointment.status = status;
  appointment.updatedAt = now_().toISOString();
  if (status === BARBER_BOOKING.statuses.CANCELLED_BY_BARBER) {
    appointment.cancelledAt = now_().toISOString();
    if (appointment.calendarEventId) {
      appointment.calendarSyncStatus = deleteCalendarEvent_(appointment.calendarEventId) ? 'REMOVED' : 'ERROR';
    }
    var client = getClientById_(appointment.clientId);
    if (client) {
      try {
        sendAppointmentCancellationNotification_(appointment, client, 'BARBEIRO');
      } catch (notificationError) {
        logTechnicalError_('NOTIFICATION_CANCEL_FAILED', notificationError, { appointmentId: appointment.id });
      }
    }
    logAudit_('BOOKING_CANCELLED', 'APPOINTMENT', appointment.id, { cancelledBy: 'BARBEIRO' });
  }
  if (status === BARBER_BOOKING.statuses.COMPLETED) logAudit_('BOOKING_COMPLETED', 'APPOINTMENT', appointment.id, {});
  if (status === BARBER_BOOKING.statuses.NO_SHOW) logAudit_('NO_SHOW', 'APPOINTMENT', appointment.id, {});
  if (data.paymentStatus != null) {
    if (Object.keys(BARBER_BOOKING.paymentStatuses).map(function(key) { return BARBER_BOOKING.paymentStatuses[key]; }).indexOf(String(data.paymentStatus)) < 0) throwAppError_('INVALID_PAYMENT_STATUS', 'Status de pagamento inválido.');
    appointment.paymentStatus = String(data.paymentStatus);
  }
  if (data.paymentMethod != null) {
    if (BARBER_BOOKING.paymentMethods.indexOf(String(data.paymentMethod)) < 0 && String(data.paymentMethod) !== '') throwAppError_('INVALID_PAYMENT_METHOD', 'Forma de pagamento inválida.');
    appointment.paymentMethod = String(data.paymentMethod);
  }
  updateSheetRecord_(BARBER_BOOKING.sheets.APPOINTMENTS, appointment);
  return sanitizeAppointmentForAdmin_(appointment);
}

function listClients_(query) {
  var search = normalizeEmail_(query || '');
  var clients = getSheetRecords_(BARBER_BOOKING.sheets.CLIENTS).filter(function(client) {
    if (!search) return true;
    return normalizeEmail_(client.name).indexOf(search) >= 0 || normalizeEmail_(client.email).indexOf(search) >= 0 || normalizePhone_(client.phone).indexOf(normalizePhone_(search)) >= 0;
  });
  var appointments = getSheetRecords_(BARBER_BOOKING.sheets.APPOINTMENTS);
  return clients.map(function(client) {
    var clientAppointments = appointments.filter(function(item) { return item.clientId === client.id; });
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      emailVerified: asBoolean_(client.emailVerified),
      createdAt: client.createdAt,
      appointmentsCount: clientAppointments.length,
      completedCount: clientAppointments.filter(function(item) { return item.status === BARBER_BOOKING.statuses.COMPLETED; }).length
    };
  }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name), 'pt-BR'); });
}
