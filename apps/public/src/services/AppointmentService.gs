function getServicePublic_(service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description || '',
    durationMinutes: asInteger_(service.durationMinutes, 0),
    price: roundMoney_(service.price),
    active: asBoolean_(service.active)
  };
}

function listActiveServices_() {
  return getSheetRecords_(BARBER_BOOKING.sheets.SERVICES)
    .filter(function(service) { return asBoolean_(service.active); })
    .map(getServicePublic_)
    .sort(function(a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
}

function getClientById_(clientId) {
  return findSheetRecordById_(BARBER_BOOKING.sheets.CLIENTS, clientId);
}

function getAppointmentById_(appointmentId) {
  return findSheetRecordById_(BARBER_BOOKING.sheets.APPOINTMENTS, appointmentId);
}

function findOrCreateClient_(customer) {
  var email = normalizeEmail_(customer.email);
  var phone = normalizePhone_(customer.phone);
  var clients = getSheetRecords_(BARBER_BOOKING.sheets.CLIENTS);
  var client = clients.filter(function(record) { return normalizeEmail_(record.email) === email; })[0]
    || clients.filter(function(record) { return normalizePhone_(record.phone) === phone; })[0];
  var identityHash = clientIdentityHash_(customer);
  if (client) {
    client.name = customer.name;
    client.phone = phone;
    client.email = email;
    client.identityHash = identityHash;
    client.updatedAt = now_().toISOString();
    updateSheetRecord_(BARBER_BOOKING.sheets.CLIENTS, client);
    return client;
  }
  return appendSheetRecord_(BARBER_BOOKING.sheets.CLIENTS, {
    id: generateId_('CLI'),
    name: customer.name,
    phone: phone,
    email: email,
    emailVerified: false,
    identityHash: identityHash,
    createdAt: now_().toISOString(),
    updatedAt: now_().toISOString()
  });
}

function getActiveFutureAppointmentsForClient_(client) {
  return getSheetRecords_(BARBER_BOOKING.sheets.APPOINTMENTS).filter(function(appointment) {
    return String(appointment.clientId) === String(client.id)
      && BARBER_BOOKING.activeAppointmentStatuses.indexOf(String(appointment.status)) >= 0
      && isFutureAppointment_(appointment);
  });
}

function assertClientAppointmentLimit_(client) {
  var max = asInteger_(getSetting_('MAX_ACTIVE_APPOINTMENTS_PER_CLIENT', 2), 2);
  var active = getActiveFutureAppointmentsForClient_(client);
  if (active.length >= max) {
    throwAppError_('ACTIVE_APPOINTMENT_LIMIT', 'Limite de agendamentos futuros atingido.');
  }
}

function buildAppointmentRecord_(data, client, service, managementToken, status) {
  return {
    id: generateId_('APT'),
    clientId: client.id,
    serviceId: service.id,
    serviceNameSnapshot: service.name,
    servicePriceSnapshot: roundMoney_(service.price),
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    status: status || BARBER_BOOKING.statuses.CONFIRMED,
    paymentStatus: BARBER_BOOKING.paymentStatuses.PENDING,
    paymentMethod: '',
    calendarEventId: '',
    managementTokenHash: hashWithSecret_(managementToken),
    rescheduledFromId: data.rescheduledFromId || '',
    rescheduledToId: '',
    calendarSyncStatus: 'PENDING',
    notificationStatus: 'PENDING',
    createdAt: now_().toISOString(),
    updatedAt: now_().toISOString(),
    cancelledAt: ''
  };
}

function createAppointmentTransactional_(data, customer, options) {
  options = options || {};
  var ownsLock = !options.lockHeld;
  var lock = ownsLock ? LockService.getScriptLock() : null;
  if (ownsLock) lock.waitLock(30000);
  try {
    ensureSystemReady_();
    var service = getActiveService_(data.serviceId);
    requireDateInRange_(data.date);
    if (!isTimeWindowAvailable_(data.date, data.startTime, asInteger_(service.durationMinutes, 0), options && options.ignoredAppointmentId)) {
      throwAppError_('SLOT_UNAVAILABLE', 'Horário acabou de ser reservado ou não está mais disponível.');
    }
    data.endTime = formatTime_(addMinutes_(parseDateTime_(data.date, data.startTime), asInteger_(service.durationMinutes, 0)));
    var client = options.client ? options.client : findOrCreateClient_(customer);
    if (!options.skipLimit) assertClientAppointmentLimit_(client);
    var managementToken = generateToken_();
    var appointment = buildAppointmentRecord_(data, client, service, managementToken, BARBER_BOOKING.statuses.CONFIRMED);
    var stored = appendSheetRecord_(BARBER_BOOKING.sheets.APPOINTMENTS, appointment);
    var calendarStatus = 'ERROR';
    try {
      stored.calendarEventId = createCalendarEventForAppointment_(stored, client);
      stored.calendarSyncStatus = 'SYNCED';
    } catch (calendarError) {
      stored.calendarSyncStatus = 'ERROR';
      logTechnicalError_('CALENDAR_CREATE_FAILED', calendarError, { appointmentId: stored.id });
    }
    var notificationStatus = { errors: [] };
    try {
      notificationStatus = sendBookingNotifications_(stored, client, managementToken);
      stored.notificationStatus = notificationStatus.errors.length ? 'ERROR' : 'SENT';
    } catch (notificationError) {
      stored.notificationStatus = 'ERROR';
      logTechnicalError_('NOTIFICATION_CREATE_FAILED', notificationError, { appointmentId: stored.id });
    }
    stored.updatedAt = now_().toISOString();
    updateSheetRecord_(BARBER_BOOKING.sheets.APPOINTMENTS, stored);
    logAudit_('BOOKING_CREATED', 'APPOINTMENT', stored.id, {
      clientId: stored.clientId,
      serviceId: stored.serviceId,
      date: stored.date,
      startTime: stored.startTime
    });
    return {
      appointment: sanitizeAppointmentForClient_(stored, client),
      managementToken: managementToken,
      calendarSyncStatus: stored.calendarSyncStatus,
      notificationStatus: stored.notificationStatus
    };
  } finally {
    if (ownsLock) lock.releaseLock();
  }
}

function sanitizeAppointmentForClient_(appointment, client) {
  return {
    id: appointment.id,
    clientName: client.name,
    serviceName: appointment.serviceNameSnapshot,
    servicePrice: roundMoney_(appointment.servicePriceSnapshot),
    date: normalizeDateValue_(appointment.date),
    startTime: normalizeTimeValue_(appointment.startTime),
    endTime: normalizeTimeValue_(appointment.endTime),
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    paymentMethod: appointment.paymentMethod || '',
    calendarSyncStatus: appointment.calendarSyncStatus,
    notificationStatus: appointment.notificationStatus,
    createdAt: normalizeDateTimeValue_(appointment.createdAt),
    cancelledAt: appointment.cancelledAt || ''
  };
}

function sanitizeAppointmentForAdmin_(appointment) {
  var client = getClientById_(appointment.clientId) || { name: '', phone: '', email: '' };
  return {
    id: appointment.id,
    clientId: appointment.clientId,
    clientName: client.name,
    clientPhone: client.phone,
    clientEmail: client.email,
    serviceId: appointment.serviceId,
    serviceName: appointment.serviceNameSnapshot,
    servicePrice: roundMoney_(appointment.servicePriceSnapshot),
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus || BARBER_BOOKING.paymentStatuses.PENDING,
    paymentMethod: appointment.paymentMethod || '',
    calendarSyncStatus: appointment.calendarSyncStatus || '',
    notificationStatus: appointment.notificationStatus || '',
    rescheduledFromId: appointment.rescheduledFromId || '',
    rescheduledToId: appointment.rescheduledToId || '',
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    cancelledAt: appointment.cancelledAt || ''
  };
}

function cancelAppointmentRecord_(appointment, status, cancelledBy) {
  if (!appointment) throwAppError_('APPOINTMENT_NOT_FOUND', 'Agendamento não encontrado.');
  if ([BARBER_BOOKING.statuses.CANCELLED_BY_CLIENT, BARBER_BOOKING.statuses.CANCELLED_BY_BARBER].indexOf(String(appointment.status)) >= 0) {
    return appointment;
  }
  appointment.status = status;
  appointment.cancelledAt = now_().toISOString();
  appointment.updatedAt = now_().toISOString();
  if (appointment.calendarEventId) {
    appointment.calendarSyncStatus = deleteCalendarEvent_(appointment.calendarEventId) ? 'REMOVED' : 'ERROR';
  }
  var client = getClientById_(appointment.clientId);
  try {
    if (client) sendAppointmentCancellationNotification_(appointment, client, cancelledBy);
  } catch (notificationError) {
    logTechnicalError_('NOTIFICATION_CANCEL_FAILED', notificationError, { appointmentId: appointment.id });
  }
  updateSheetRecord_(BARBER_BOOKING.sheets.APPOINTMENTS, appointment);
  logAudit_('BOOKING_CANCELLED', 'APPOINTMENT', appointment.id, { cancelledBy: cancelledBy });
  return appointment;
}

function getAgendaAppointments_(fromDate, toDate) {
  var from = parseDate_(fromDate).getTime();
  var to = parseDate_(toDate).getTime();
  return getSheetRecords_(BARBER_BOOKING.sheets.APPOINTMENTS).filter(function(appointment) {
    var dateTime = parseDate_(String(appointment.date)).getTime();
    return dateTime >= from && dateTime <= to;
  }).sort(function(a, b) {
    return parseDateTime_(a.date, a.startTime).getTime() - parseDateTime_(b.date, b.startTime).getTime();
  });
}
