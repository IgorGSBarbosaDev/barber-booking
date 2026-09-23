function publicGetBootstrap() {
  return apiCall_(function() {
    var status = getSystemStatus_();
    if (!status.configured) {
      return {
        configured: false,
        message: 'O sistema ainda precisa ser configurado pelo barbeiro.',
        services: [],
        settings: { BUSINESS_TIMEZONE: BARBER_BOOKING.timezone }
      };
    }
    ensureSystemReady_();
    var settings = getSafeSettings_();
    return {
      configured: true,
      services: listActiveServices_(),
      settings: {
        BUSINESS_TIMEZONE: settings.BUSINESS_TIMEZONE,
        BOOKING_ADVANCE_DAYS: settings.BOOKING_ADVANCE_DAYS,
        REQUIRE_EMAIL_VERIFICATION: settings.REQUIRE_EMAIL_VERIFICATION
      },
      barberName: getSetting_('BARBER_NAME', 'Barbearia')
    };
  });
}

function publicGetAvailability(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var data = parsePayload_(payload);
    return getAvailability_(trim_(data.date), trim_(data.serviceId));
  });
}

function publicRequestOtp(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    if (!asBoolean_(getSetting_('REQUIRE_EMAIL_VERIFICATION', true))) {
      return { required: false, alreadyVerified: true };
    }
    return requestEmailVerification_(payload);
  });
}

function publicVerifyOtp(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    return verifyEmailVerification_(payload);
  });
}

function publicCreateAppointment(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var data = parsePayload_(payload);
    var customer = validateCustomerPayload_(data);
    var client = findOrCreateClient_(customer);
    if (asBoolean_(getSetting_('REQUIRE_EMAIL_VERIFICATION', true)) && !asBoolean_(client.emailVerified)) {
      throwAppError_('EMAIL_VERIFICATION_REQUIRED', 'Confirme seu e-mail antes de finalizar o agendamento.');
    }
    var result = createAppointmentTransactional_({
      date: trim_(data.date),
      startTime: trim_(data.startTime),
      endTime: trim_(data.endTime),
      serviceId: trim_(data.serviceId)
    }, customer, { client: client });
    return result;
  });
}

function publicLookupAppointmentsByEmail(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var data = parsePayload_(payload);
    var clients = appointmentLookupClientsByEmail_(data.email, 'appointment_lookup');
    return { appointments: listAppointmentsForLookup_(clients) };
  });
}

function publicRequestAppointmentMutationOtp(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    return requestAppointmentMutationOtp_(payload);
  });
}

function publicVerifyAppointmentMutationOtp(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return verifyAppointmentMutationOtp_(payload);
    } finally {
      lock.releaseLock();
    }
  });
}

function publicCancelAppointmentByLookup(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var data = parsePayload_(payload);
      var clients = appointmentLookupClientsForMutationSession_(data.email, data.sessionToken);
      checkRateLimit_(normalizeEmail_(data.email), 'appointment_lookup_cancel');
      var appointment = getAppointmentById_(data.appointmentId);
      var belongsToLookup = clients.some(function(client) { return String(client.id) === String(appointment && appointment.clientId); });
      if (!appointment || !belongsToLookup) throwAppError_('APPOINTMENT_NOT_FOUND', 'Agendamento não encontrado.');
      assertClientCancellationAllowed_(appointment);
      var cancelled = cancelAppointmentRecord_(appointment, BARBER_BOOKING.statuses.CANCELLED_BY_CLIENT, 'CLIENTE');
      var client = getClientById_(cancelled.clientId) || { name: '' };
      return {
        cancelled: sanitizeAppointmentForClient_(cancelled, client),
        appointments: listAppointmentsForLookup_(clients)
      };
    } finally {
      lock.releaseLock();
    }
  });
}

function publicGetAppointment(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var data = parsePayload_(payload);
    var appointment = getAppointmentById_(data.appointmentId || data.id);
    verifyManagementToken_(appointment, data.token);
    var client = getClientById_(appointment.clientId) || { name: '', phone: '', email: '' };
    return sanitizeAppointmentForClient_(appointment, client);
  });
}

function publicCancelAppointment(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var data = parsePayload_(payload);
      var appointment = getAppointmentById_(data.appointmentId || data.id);
      verifyManagementToken_(appointment, data.token);
      assertClientCancellationAllowed_(appointment);
      var cancelled = cancelAppointmentRecord_(appointment, BARBER_BOOKING.statuses.CANCELLED_BY_CLIENT, 'CLIENTE');
      var client = getClientById_(cancelled.clientId) || { name: '' };
      return sanitizeAppointmentForClient_(cancelled, client);
    } finally {
      lock.releaseLock();
    }
  });
}

function publicRescheduleAppointment(payload) {
  return apiCall_(function() {
    ensureSystemReady_();
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var data = parsePayload_(payload);
      var oldAppointment = getAppointmentById_(data.appointmentId || data.id);
      verifyManagementToken_(oldAppointment, data.token);
      if (oldAppointment.status !== BARBER_BOOKING.statuses.CONFIRMED && oldAppointment.status !== BARBER_BOOKING.statuses.PENDING) {
        throwAppError_('APPOINTMENT_NOT_RESCHEDULABLE', 'Este agendamento não pode ser remarcado.');
      }
      assertClientCancellationAllowed_(oldAppointment);
      var client = getClientById_(oldAppointment.clientId);
      if (!client) throwAppError_('CLIENT_NOT_FOUND', 'Cliente não encontrado.');
      var serviceId = trim_(data.serviceId || oldAppointment.serviceId);
      var service = getActiveService_(serviceId);
      if (!isTimeWindowAvailable_(trim_(data.date), trim_(data.startTime), asInteger_(service.durationMinutes, 0), oldAppointment.id)) {
        throwAppError_('SLOT_UNAVAILABLE', 'Horário acabou de ser reservado ou não está mais disponível.');
      }
      oldAppointment = cancelAppointmentRecord_(oldAppointment, BARBER_BOOKING.statuses.CANCELLED_BY_CLIENT, 'CLIENTE_REAGENDAMENTO');
      var customer = {
        name: oldAppointment.clientNameSnapshot || client.name,
        phone: client.phone,
        email: client.email,
        clientId: trim_(data.clientId || 'reschedule'),
        browserToken: trim_(data.browserToken || 'reschedule')
      };
      var result = createAppointmentTransactional_({
        date: trim_(data.date),
        startTime: trim_(data.startTime),
        endTime: formatTime_(addMinutes_(parseDateTime_(data.date, data.startTime), asInteger_(service.durationMinutes, 0))),
        serviceId: service.id,
        rescheduledFromId: oldAppointment.id
      }, customer, { client: client, skipLimit: true, ignoredAppointmentId: oldAppointment.id, lockHeld: true });
      oldAppointment.rescheduledToId = result.appointment.id;
      oldAppointment.updatedAt = now_().toISOString();
      updateSheetRecord_(BARBER_BOOKING.sheets.APPOINTMENTS, oldAppointment);
      return result;
    } finally {
      lock.releaseLock();
    }
  });
}
