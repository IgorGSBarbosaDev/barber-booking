function adminInitializeSystem() {
  return apiCall_(function() {
    requireAdmin_();
    var result = setupSystem_();
    logAudit_('SYSTEM_INITIALIZED', 'SYSTEM', '', { spreadsheetId: result.spreadsheetId });
    return result;
  });
}

function setupBarberBooking() {
  return setupSystem_();
}

function adminGetBootstrap() {
  return apiCall_(function() {
    requireAdmin_();
    var status = getSystemStatus_();
    if (!status.configured) return { configured: false, status: status };
    ensureSystemReady_();
    return {
      configured: true,
      status: getSystemStatus_(),
      settings: getSafeSettings_(),
      services: getSheetRecords_(BARBER_BOOKING.sheets.SERVICES).map(getServicePublic_),
      schedule: getScheduleSettings_(),
      today: formatDate_(now_())
    };
  });
}

function adminGetDashboard(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return buildDashboard_(normalizeDashboardRange_(payload));
  });
}

function adminGetAgenda(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    var data = parsePayload_(payload);
    var from = trim_(data.from || formatDate_(now_()));
    var to = trim_(data.to || from);
    requireDateInRangeForReport_(from);
    requireDateInRangeForReport_(to);
    return getAgendaAppointments_(from, to).map(sanitizeAppointmentForAdmin_);
  });
}

function adminListServices() {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return getSheetRecords_(BARBER_BOOKING.sheets.SERVICES).map(getServicePublic_);
  });
}

function adminSaveService(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return saveService_(payload);
  });
}

function adminGetSchedule() {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return getScheduleSettings_();
  });
}

function adminSaveWorkSchedule(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return saveWorkSchedule_(payload);
  });
}

function adminSaveScheduleOverride(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return saveScheduleOverride_(payload);
  });
}

function adminDeleteScheduleOverride(id) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return deleteScheduleOverride_(id);
  });
}

function adminSaveBlock(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return saveBlock_(payload);
  });
}

function adminDeleteBlock(id) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return deleteBlock_(id);
  });
}

function adminUpdateAppointment(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return updateAppointmentStatus_(payload);
    } finally {
      lock.releaseLock();
    }
  });
}

function adminRescheduleAppointment(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    var data = parsePayload_(payload);
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var oldAppointment = getAppointmentById_(data.appointmentId || data.id);
      if (!oldAppointment) throwAppError_('APPOINTMENT_NOT_FOUND', 'Agendamento não encontrado.');
      if (['COMPLETED', 'NO_SHOW', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_BARBER'].indexOf(String(oldAppointment.status)) >= 0) {
        throwAppError_('APPOINTMENT_NOT_RESCHEDULABLE', 'Este agendamento não pode ser remarcado.');
      }
      var service = getActiveService_(data.serviceId || oldAppointment.serviceId);
      var date = trim_(data.date);
      var startTime = trim_(data.startTime);
      if (!isTimeWindowAvailable_(date, startTime, asInteger_(service.durationMinutes, 0), oldAppointment.id)) {
        throwAppError_('SLOT_UNAVAILABLE', 'Horário indisponível.');
      }
      var client = getClientById_(oldAppointment.clientId);
      if (!client) throwAppError_('CLIENT_NOT_FOUND', 'Cliente não encontrado.');
      cancelAppointmentRecord_(oldAppointment, BARBER_BOOKING.statuses.CANCELLED_BY_BARBER, 'BARBEIRO_REAGENDAMENTO');
      var result = createAppointmentTransactional_({
        date: date,
        startTime: startTime,
        endTime: formatTime_(addMinutes_(parseDateTime_(date, startTime), asInteger_(service.durationMinutes, 0))),
        serviceId: service.id,
        rescheduledFromId: oldAppointment.id
      }, { name: client.name, phone: client.phone, email: client.email, clientId: 'admin-reschedule', browserToken: 'admin-reschedule' }, { client: client, skipLimit: true, ignoredAppointmentId: oldAppointment.id, lockHeld: true });
      oldAppointment.rescheduledToId = result.appointment.id;
      oldAppointment.updatedAt = now_().toISOString();
      updateSheetRecord_(BARBER_BOOKING.sheets.APPOINTMENTS, oldAppointment);
      return result.appointment;
    } finally {
      lock.releaseLock();
    }
  });
}

function adminListClients(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    var data = parsePayload_(payload);
    return listClients_(data.query || '');
  });
}

function adminGetClientHistory(clientId) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    var client = getClientById_(clientId);
    if (!client) throwAppError_('CLIENT_NOT_FOUND', 'Cliente não encontrado.');
    return {
      client: { id: client.id, name: client.name, phone: client.phone, email: client.email, emailVerified: asBoolean_(client.emailVerified) },
      appointments: getSheetRecords_(BARBER_BOOKING.sheets.APPOINTMENTS).filter(function(item) { return item.clientId === client.id; }).sort(function(a, b) { return String(b.date + b.startTime).localeCompare(String(a.date + a.startTime)); }).map(sanitizeAppointmentForAdmin_)
    };
  });
}

function adminGetSettings() {
  return apiCall_(function() {
    requireAdmin_();
    var settings = getSafeSettings_();
    settings.CALENDAR_ID = getScriptProperty_('CALENDAR_ID', 'primary');
    settings.SPREADSHEET_CONFIGURED = Boolean(getScriptProperty_('SPREADSHEET_ID', ''));
    return settings;
  });
}

function adminSaveSettings(payload) {
  return apiCall_(function() {
    requireAdmin_();
    ensureSystemReady_();
    return saveAdminSettings_(payload);
  });
}
