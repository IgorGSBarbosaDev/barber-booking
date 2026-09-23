function appointmentCalendarTitle_(appointment, client) {
  var barberName = getSetting_('BARBER_NAME', 'Barbearia');
  return '[' + barberName + '] ' + String(appointment.clientNameSnapshot || client.name || 'Cliente') + ' — ' + String(appointment.serviceNameSnapshot || 'Serviço');
}

function appointmentCalendarDescription_(appointment, client) {
  return [
    'Agendamento: ' + appointment.id,
    'Cliente: ' + (appointment.clientNameSnapshot || client.name),
    'Telefone: ' + client.phone,
    'E-mail: ' + client.email,
    'Serviço: ' + appointment.serviceNameSnapshot,
    'Valor: ' + formatCurrency_(appointment.servicePriceSnapshot),
    'Status: ' + appointment.status
  ].join('\n');
}

function createCalendarEventForAppointment_(appointment, client) {
  var calendar = getCalendar_();
  var start = parseDateTime_(appointment.date, appointment.startTime);
  var end = parseDateTime_(appointment.date, appointment.endTime);
  var event = calendar.createEvent(
    appointmentCalendarTitle_(appointment, client),
    start,
    end,
    { description: appointmentCalendarDescription_(appointment, client) }
  );
  try {
    event.setTag('appointmentId', String(appointment.id));
  } catch (ignored) {
    // Tags are not available in every CalendarApp runtime; the description remains.
  }
  return event.getId();
}

function deleteCalendarEvent_(calendarEventId) {
  if (!calendarEventId) return true;
  try {
    var calendar = getCalendar_();
    var event = calendar.getEventById(String(calendarEventId));
    if (event) event.deleteEvent();
    return true;
  } catch (error) {
    logTechnicalError_('CALENDAR_DELETE_FAILED', error, { calendarEventId: calendarEventId });
    return false;
  }
}

function updateCalendarEventForAppointment_(appointment, client) {
  if (!appointment.calendarEventId) return createCalendarEventForAppointment_(appointment, client);
  try {
    var calendar = getCalendar_();
    var event = calendar.getEventById(String(appointment.calendarEventId));
    if (!event) return createCalendarEventForAppointment_(appointment, client);
    event.setTitle(appointmentCalendarTitle_(appointment, client));
    event.setTime(parseDateTime_(appointment.date, appointment.startTime), parseDateTime_(appointment.date, appointment.endTime));
    event.setDescription(appointmentCalendarDescription_(appointment, client));
    return event.getId();
  } catch (error) {
    logTechnicalError_('CALENDAR_UPDATE_FAILED', error, { appointmentId: appointment.id });
    return createCalendarEventForAppointment_(appointment, client);
  }
}
