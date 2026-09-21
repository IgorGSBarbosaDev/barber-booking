# Modelo de dados

O Google Sheets é a fonte oficial dos dados. Cada projeto Apps Script usa o mesmo SPREADSHEET_ID em seus Script Properties.

## Abas funcionais

### CLIENTS

id, name, phone, email, emailVerified, identityHash, createdAt, updatedAt

### SERVICES

id, name, description, durationMinutes, price, active, createdAt, updatedAt

### APPOINTMENTS

id, clientId, serviceId, serviceNameSnapshot, servicePriceSnapshot, date, startTime, endTime, status, paymentStatus, paymentMethod, calendarEventId, managementTokenHash, rescheduledFromId, rescheduledToId, calendarSyncStatus, notificationStatus, createdAt, updatedAt, cancelledAt

Os campos serviceNameSnapshot e servicePriceSnapshot preservam o histórico mesmo que o serviço seja alterado. managementTokenHash permite consulta/cancelamento sem armazenar o token em texto puro.

### WORK_SCHEDULE

weekday, enabled, startTime, endTime

### SCHEDULE_OVERRIDES

id, date, enabled, startTime, endTime

### BLOCKS

id, date, startTime, endTime, reason

### SETTINGS

key, value

Contém configurações operacionais não sensíveis. IDs de infraestrutura, como SPREADSHEET_ID e CALENDAR_ID, ficam nos Script Properties quando apropriado.

### AUDIT_LOG

id, action, entity, entityId, metadata, createdAt

### OTP_CODES

Aba técnica para códigos de validação: id, identifierHash, codeHash, purpose, expiresAt, usedAt, attempts, verificationTokenHash, verificationTokenExpiresAt, appointmentId, createdAt.

## Status

Agendamentos: PENDING, CONFIRMED, COMPLETED, CANCELLED_BY_CLIENT, CANCELLED_BY_BARBER, NO_SHOW.

Pagamentos: PENDING ou PAID, com PIX, DINHEIRO, CARTÃO e OUTRO como formas iniciais.
