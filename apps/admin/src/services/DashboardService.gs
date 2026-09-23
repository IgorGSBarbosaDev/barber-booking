function normalizeDashboardRange_(payload) {
  var data = parsePayload_(payload);
  var today = formatDate_(now_());
  var filter = data.filter || 'today';
  if (filter === 'week') {
    var todayDate = parseDate_(today);
    var day = dayOfWeek_(today);
    return { from: formatDate_(addMinutes_(todayDate, -(day - 1) * 24 * 60)), to: formatDate_(addMinutes_(todayDate, (7 - day) * 24 * 60)) };
  }
  if (filter === 'month') {
    var monthStart = today.slice(0, 8) + '01';
    var monthStartDate = parseDate_(monthStart);
    var nextMonth = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0);
    return { from: monthStart, to: formatDate_(nextMonth) };
  }
  if (filter === 'custom') {
    return normalizeReportRange_(data.from, data.to);
  }
  return { from: today, to: today };
}

function normalizeReportRange_(fromDate, toDate) {
  var from = trim_(fromDate);
  var to = trim_(toDate);
  var fromValue = requireDateInRangeForReport_(from);
  var toValue = requireDateInRangeForReport_(to);
  if (fromValue.getTime() > toValue.getTime()) {
    throwAppError_('INVALID_REPORT_RANGE', 'A data inicial deve ser igual ou anterior à data final.');
  }
  return { from: from, to: to };
}

function requireDateInRangeForReport_(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trim_(dateString))) throwAppError_('INVALID_REPORT_RANGE', 'Período inválido.');
  return parseDate_(dateString);
}

function buildDashboard_(range, appointments, clients) {
  appointments = appointments || getAgendaAppointments_(range.from, range.to);
  var completed = appointments.filter(function(item) { return item.status === BARBER_BOOKING.statuses.COMPLETED; });
  var scheduled = appointments.filter(function(item) { return BARBER_BOOKING.activeAppointmentStatuses.indexOf(String(item.status)) >= 0; });
  var cancelled = appointments.filter(function(item) { return String(item.status).indexOf('CANCELLED') === 0; });
  var noShow = appointments.filter(function(item) { return item.status === BARBER_BOOKING.statuses.NO_SHOW; });
  var revenue = completed.reduce(function(total, item) { return total + roundMoney_(item.servicePriceSnapshot); }, 0);
  var expected = scheduled.reduce(function(total, item) { return total + roundMoney_(item.servicePriceSnapshot); }, 0);
  var serviceMap = {};
  appointments.forEach(function(item) {
    var key = item.serviceNameSnapshot || 'Sem serviço';
    if (!serviceMap[key]) serviceMap[key] = { serviceName: key, quantity: 0, revenue: 0 };
    if (item.status === BARBER_BOOKING.statuses.COMPLETED) {
      serviceMap[key].quantity += 1;
      serviceMap[key].revenue += roundMoney_(item.servicePriceSnapshot);
    }
  });
  var serviceStats = Object.keys(serviceMap).map(function(key) { return serviceMap[key]; }).sort(function(a, b) { return b.quantity - a.quantity; });
  var clientIds = {};
  completed.forEach(function(item) { clientIds[item.clientId] = true; });
  clients = clients || getSheetRecords_(BARBER_BOOKING.sheets.CLIENTS);
  var newClients = clients.filter(function(client) {
    var createdDate = normalizeDateValue_(client.createdAt);
    return clientIds[client.id] && createdDate >= range.from && createdDate <= range.to;
  }).length;
  var days = [];
  var cursor = parseDate_(range.from);
  var end = parseDate_(range.to);
  while (cursor.getTime() <= end.getTime() && days.length < 370) {
    var date = formatDate_(cursor);
    var dayAppointments = appointments.filter(function(item) { return String(item.date) === date; });
    days.push({ date: date, appointments: dayAppointments.length, revenue: dayAppointments.filter(function(item) { return item.status === BARBER_BOOKING.statuses.COMPLETED; }).reduce(function(total, item) { return total + roundMoney_(item.servicePriceSnapshot); }, 0) });
    cursor = addMinutes_(cursor, 24 * 60);
  }
  return {
    range: range,
    cards: {
      completed: completed.length,
      scheduled: scheduled.length,
      cancellations: cancelled.length,
      noShow: noShow.length,
      revenue: roundMoney_(revenue),
      expectedRevenue: roundMoney_(expected),
      averageTicket: completed.length ? roundMoney_(revenue / completed.length) : 0,
      clientsServed: Object.keys(clientIds).length,
      newClients: newClients,
      returningClients: Math.max(0, Object.keys(clientIds).length - newClients)
    },
    serviceStats: serviceStats,
    timeline: days
  };
}
