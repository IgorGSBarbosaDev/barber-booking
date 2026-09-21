function getActiveService_(serviceId) {
  var service = findSheetRecordById_(BARBER_BOOKING.sheets.SERVICES, serviceId);
  if (!service || !asBoolean_(service.active)) {
    throwAppError_('SERVICE_UNAVAILABLE', 'O serviço selecionado não está disponível.');
  }
  return service;
}

function getAvailability_(dateString, serviceId) {
  requireDateInRange_(dateString);
  var service = getActiveService_(serviceId);
  var schedule = getScheduleForDate_(dateString);
  var result = {
    date: dateString,
    serviceId: service.id,
    serviceName: service.name,
    durationMinutes: asInteger_(service.durationMinutes, 0),
    schedule: schedule,
    slots: []
  };
  if (!schedule.enabled) return result;
  var scheduleStart = parseDateTime_(dateString, schedule.startTime);
  var scheduleEnd = parseDateTime_(dateString, schedule.endTime);
  var duration = asInteger_(service.durationMinutes, 0);
  if (duration <= 0) throwAppError_('SERVICE_INVALID', 'O serviço possui duração inválida.');
  var slotInterval = Math.max(5, asInteger_(getSetting_('SLOT_INTERVAL_MINUTES', 30), 30));
  var appointments = getSheetRecords_(BARBER_BOOKING.sheets.APPOINTMENTS).filter(function(appointment) {
    return String(appointment.date) === dateString && BARBER_BOOKING.activeAppointmentStatuses.indexOf(String(appointment.status)) >= 0;
  });
  var blocks = getBlocksForDate_(dateString);
  var earliest = new Date(now_().getTime() + asInteger_(getSetting_('MIN_BOOKING_ADVANCE_MINUTES', 30), 30) * 60 * 1000);
  for (var cursor = scheduleStart; cursor.getTime() < scheduleEnd.getTime(); cursor = addMinutes_(cursor, slotInterval)) {
    var slotEnd = addMinutes_(cursor, duration);
    if (slotEnd.getTime() > scheduleEnd.getTime()) continue;
    if (cursor.getTime() < earliest.getTime()) continue;
    var blocked = blocks.some(function(block) {
      var blockStart = parseDateTime_(dateString, block.startTime);
      var blockEnd = parseDateTime_(dateString, block.endTime);
      return cursor.getTime() < blockEnd.getTime() && slotEnd.getTime() > blockStart.getTime();
    });
    if (blocked) continue;
    var overlapping = appointments.some(function(appointment) {
      var appointmentStart = parseDateTime_(appointment.date, appointment.startTime);
      var appointmentEnd = parseDateTime_(appointment.date, appointment.endTime);
      return cursor.getTime() < appointmentEnd.getTime() && slotEnd.getTime() > appointmentStart.getTime();
    });
    if (overlapping) continue;
    result.slots.push({
      startTime: formatTime_(cursor),
      endTime: formatTime_(slotEnd),
      label: formatTime_(cursor) + ' – ' + formatTime_(slotEnd)
    });
  }
  return result;
}

function assertSlotAvailable_(dateString, startTime, endTime, serviceDuration, ignoredAppointmentId) {
  if (!isTimeWindowAvailable_(dateString, startTime, serviceDuration, ignoredAppointmentId)) {
    throwAppError_('SLOT_UNAVAILABLE', 'Horário acabou de ser reservado ou não está mais disponível.');
  }
  return true;
}

function isTimeWindowAvailable_(dateString, startTime, durationMinutes, ignoredAppointmentId) {
  requireDateInRange_(dateString);
  var schedule = getScheduleForDate_(dateString);
  if (!schedule.enabled) return false;
  var start = parseDateTime_(dateString, startTime);
  var end = addMinutes_(start, durationMinutes);
  var scheduleStart = parseDateTime_(dateString, schedule.startTime);
  var scheduleEnd = parseDateTime_(dateString, schedule.endTime);
  if (start.getTime() < scheduleStart.getTime() || end.getTime() > scheduleEnd.getTime()) return false;
  var slotInterval = Math.max(5, asInteger_(getSetting_('SLOT_INTERVAL_MINUTES', 30), 30));
  if (minutesBetween_(scheduleStart, start) % slotInterval !== 0) return false;
  if (start.getTime() < now_().getTime() + asInteger_(getSetting_('MIN_BOOKING_ADVANCE_MINUTES', 30), 30) * 60 * 1000) return false;
  var blocks = getBlocksForDate_(dateString);
  if (blocks.some(function(block) {
    var blockStart = parseDateTime_(dateString, block.startTime);
    var blockEnd = parseDateTime_(dateString, block.endTime);
    return start.getTime() < blockEnd.getTime() && end.getTime() > blockStart.getTime();
  })) return false;
  return getSheetRecords_(BARBER_BOOKING.sheets.APPOINTMENTS).some(function(appointment) {
    if (String(appointment.id) === String(ignoredAppointmentId || '')) return false;
    if (String(appointment.date) !== dateString || BARBER_BOOKING.activeAppointmentStatuses.indexOf(String(appointment.status)) < 0) return false;
    var appointmentStart = parseDateTime_(dateString, appointment.startTime);
    var appointmentEnd = parseDateTime_(dateString, appointment.endTime);
    return start.getTime() < appointmentEnd.getTime() && end.getTime() > appointmentStart.getTime();
  }) === false;
}
