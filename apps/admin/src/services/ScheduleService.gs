function getScheduleForDate_(dateString) {
  var override = getSheetRecords_(BARBER_BOOKING.sheets.SCHEDULE_OVERRIDES).filter(function(record) {
    return String(record.date) === dateString;
  }).sort(function(a, b) {
    return Number(a._rowNumber) - Number(b._rowNumber);
  }).pop();
  if (override) {
    return {
      enabled: asBoolean_(override.enabled),
      startTime: trim_(override.startTime),
      endTime: trim_(override.endTime),
      source: 'override',
      id: override.id
    };
  }
  var weekday = dayOfWeek_(dateString);
  var schedule = getSheetRecords_(BARBER_BOOKING.sheets.WORK_SCHEDULE).filter(function(record) {
    return Number(record.weekday) === weekday;
  })[0];
  if (!schedule) {
    return { enabled: false, startTime: '', endTime: '', source: 'default' };
  }
  return {
    enabled: asBoolean_(schedule.enabled),
    startTime: trim_(schedule.startTime),
    endTime: trim_(schedule.endTime),
    source: 'default',
    weekday: weekday
  };
}

function validateScheduleWindow_(enabled, startTime, endTime) {
  if (!enabled) return { enabled: false, startTime: '', endTime: '' };
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throwAppError_('INVALID_SCHEDULE', 'Informe horários válidos para a disponibilidade.');
  }
  var start = parseDateTime_('2020-01-01', startTime);
  var end = parseDateTime_('2020-01-01', endTime);
  if (end.getTime() <= start.getTime()) {
    throwAppError_('INVALID_SCHEDULE', 'O horário final deve ser posterior ao inicial.');
  }
  return { enabled: true, startTime: startTime, endTime: endTime };
}

function getBlocksForDate_(dateString) {
  return getSheetRecords_(BARBER_BOOKING.sheets.BLOCKS).filter(function(record) {
    return String(record.date) === dateString;
  }).map(function(record) {
    return {
      id: record.id,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      reason: record.reason || ''
    };
  });
}
