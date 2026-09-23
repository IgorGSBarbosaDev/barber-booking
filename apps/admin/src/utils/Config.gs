var BARBER_BOOKING = {
  schemaVersion: '2',
  timezone: 'America/Sao_Paulo',
  sheets: {
    CLIENTS: 'CLIENTS',
    SERVICES: 'SERVICES',
    APPOINTMENTS: 'APPOINTMENTS',
    WORK_SCHEDULE: 'WORK_SCHEDULE',
    SCHEDULE_OVERRIDES: 'SCHEDULE_OVERRIDES',
    BLOCKS: 'BLOCKS',
    SETTINGS: 'SETTINGS',
    AUDIT_LOG: 'AUDIT_LOG',
    OTP_CODES: 'OTP_CODES'
  },
  statuses: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    COMPLETED: 'COMPLETED',
    CANCELLED_BY_CLIENT: 'CANCELLED_BY_CLIENT',
    CANCELLED_BY_BARBER: 'CANCELLED_BY_BARBER',
    NO_SHOW: 'NO_SHOW'
  },
  paymentStatuses: {
    PENDING: 'PENDING',
    PAID: 'PAID'
  },
  paymentMethods: ['PIX', 'DINHEIRO', 'CARTÃO', 'OUTRO'],
  activeAppointmentStatuses: ['PENDING', 'CONFIRMED'],
  schemas: {
    CLIENTS: ['id', 'name', 'phone', 'email', 'emailVerified', 'identityHash', 'createdAt', 'updatedAt'],
    SERVICES: ['id', 'name', 'description', 'durationMinutes', 'price', 'active', 'createdAt', 'updatedAt'],
    APPOINTMENTS: [
      'id', 'clientId', 'serviceId', 'serviceNameSnapshot', 'servicePriceSnapshot',
      'date', 'startTime', 'endTime', 'status', 'paymentStatus', 'paymentMethod',
      'calendarEventId', 'managementTokenHash', 'rescheduledFromId', 'rescheduledToId',
      'calendarSyncStatus', 'notificationStatus', 'createdAt', 'updatedAt', 'cancelledAt'
    ],
    WORK_SCHEDULE: ['weekday', 'enabled', 'startTime', 'endTime'],
    SCHEDULE_OVERRIDES: ['id', 'date', 'enabled', 'startTime', 'endTime'],
    BLOCKS: ['id', 'date', 'startTime', 'endTime', 'reason'],
    SETTINGS: ['key', 'value'],
    AUDIT_LOG: ['id', 'action', 'entity', 'entityId', 'metadata', 'createdAt'],
    OTP_CODES: [
      'id', 'identifierHash', 'codeHash', 'purpose', 'expiresAt', 'usedAt',
      'attempts', 'verificationTokenHash', 'verificationTokenExpiresAt',
      'appointmentId', 'createdAt'
    ]
  },
  defaultSettings: {
    BARBER_NAME: 'Barbearia',
    BARBER_EMAIL: '',
    PUBLIC_APP_URL: '',
    MAX_ACTIVE_APPOINTMENTS_PER_CLIENT: '2',
    BOOKING_ADVANCE_DAYS: '60',
    MIN_BOOKING_ADVANCE_MINUTES: '30',
    OTP_EXPIRATION_MINUTES: '10',
    BUSINESS_TIMEZONE: 'America/Sao_Paulo',
    SLOT_INTERVAL_MINUTES: '30',
    REQUIRE_EMAIL_VERIFICATION: 'true',
    RATE_LIMIT_MAX_ATTEMPTS: '5',
    RATE_LIMIT_BLOCK_MINUTES: '15',
    RATE_LIMIT_WINDOW_SECONDS: '600'
  }
};

function getSheetName_(key) {
  return BARBER_BOOKING.sheets[key] || key;
}

function getSchema_(sheetName) {
  return BARBER_BOOKING.schemas[sheetName] || [];
}
